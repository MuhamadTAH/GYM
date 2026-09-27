import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { db } from "@/db";
import { workoutSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getUserProfileAction,
  getTodaysWorkoutAction,
  fetchRecentSetsAction,
  submitShorthandSetAction,
  getDailyGoalsAction,
  saveDailyGoalsAction,
  logNaturalEntryAction,
  deleteLoggedItemAction,
  getExerciseGuideAction,
  getDailyBriefingAction,
  generateWorkoutWithAIAction,
  addExerciseToWorkoutAction,
  updateWorkoutExerciseAction,
  searchExerciseCatalogAction,
  planDailyCaloriesWithAIAction,
  updateTodayCalorieUsageAction,
} from "@/app/actions";
import type { WeeklySplitDay, MonthlyPhase } from "@/db/schema";

function parseJsonArray<T>(val: unknown): T[] | undefined {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {}
  }
  return undefined;
}

/**
 * MANDATORY LOGGING RULE:
 * Never use console.log in the MCP server path.
 * Stdio stdout is reserved exclusively for JSON-RPC messages.
 * All diagnostics, status, and error logs MUST route to console.error.
 */

export function registerHandlers(server: Server) {
  // ============================================================================
  // MCP RESOURCES: Read-Only State Inspection
  // ============================================================================

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "gym://profile",
          name: "Athlete Profile & 1RMs",
          description:
            "Returns the active user profile, baseline 1RMs, preferred units (kg/lb), and active injury contraindications.",
          mimeType: "application/json",
        },
        {
          uri: "gym://session/active",
          name: "Active Prescribed Workout Session",
          description:
            "Returns the current uncompleted workout session with planned exercises, target loads, sets, and reps.",
          mimeType: "application/json",
        },
        {
          uri: "gym://goals",
          name: "Athlete Daily Goals & Weekly Split Schedule",
          description:
            "Returns the athlete's configured daily targets (Calories, Protein, Water, Daily Walk, Training Adherence) and 7-day weekly split schedule, along with today's logged status.",
          mimeType: "application/json",
        },
        {
          uri: "gym://history/recent",
          name: "Recent Exercise Sets History",
          description:
            "Returns the last 10 logged exercise sets with RPE, load, reps, and acute pain telemetry.",
          mimeType: "application/json",
        },
        {
          uri: "gym://mesocycle/summary",
          name: "Mesocycle 4-Week Block Summary",
          description:
            "Returns current 4-week mesocycle block details, active week, split type, and completion metrics.",
          mimeType: "application/json",
        },
        {
          uri: "gym://briefing/today",
          name: "Daily Morning Workout & Nutrition Briefing",
          description:
            "Returns today's morning briefing: whether today is a scheduled training session (with prescribed movements, sets, rep ranges, cues) or active recovery, plus target calories, protein, hydration, and walk duration.",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    console.error(`[MCP:gym-engine] Reading resource: ${uri}`);

    switch (uri) {
      case "gym://briefing/today": {
        const briefing = await getDailyBriefingAction();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(briefing, null, 2),
            },
          ],
        };
      }

      case "gym://goals": {
        const goals = await getDailyGoalsAction();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(goals, null, 2),
            },
          ],
        };
      }

      case "gym://profile": {
        const profile = await getUserProfileAction();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  id: profile.id,
                  name: profile.name,
                  age: profile.age,
                  sex: profile.sex,
                  heightCm: profile.heightCm,
                  preferredUnit: profile.preferredUnit,
                  currentWeight: {
                    value: profile.currentWeightValue,
                    unit: profile.preferredUnit,
                  },
                  coldStartActive: profile.coldStartActive,
                  trainingAge: profile.trainingAge,
                  baselineLifts: profile.baselineLifts,
                  activeInjuries: profile.activeInjuries,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "gym://session/active": {
        const session = await getTodaysWorkoutAction();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(session, null, 2),
            },
          ],
        };
      }

      case "gym://mesocycle/summary": {
        const allSessions = await db.select().from(workoutSessions);
        const totalSessions = allSessions.length;
        const completedSessions = allSessions.filter((s) => s.status === "completed").length;
        const plannedSessions = allSessions.filter((s) => s.status === "planned").length;
        const inProgressSessions = allSessions.filter((s) => s.status === "in_progress").length;
        const workoutDays = allSessions.filter((s) => s.sessionType !== "rest").length;
        const completedWorkoutDays = allSessions.filter(
          (s) => s.sessionType !== "rest" && s.status === "completed"
        ).length;

        const activeWeek = Math.min(4, Math.max(1, Math.ceil((completedSessions + 1) / 7)));
        const activeDay = (completedSessions % 7) + 1;

        const summary = {
          totalSessions,
          completedSessions,
          plannedSessions,
          inProgressSessions,
          workoutDays,
          completedWorkoutDays,
          activeWeek,
          activeDay,
          completionRatePct:
            totalSessions > 0
              ? Math.round((completedSessions / totalSessions) * 100)
              : 0,
        };

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "gym://history/recent": {
        const sets = await fetchRecentSetsAction();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(sets, null, 2),
            },
          ],
        };
      }

      default:
        console.error(`[MCP:gym-engine] Resource not found: ${uri}`);
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource URI: ${uri}`);
    }
  });

  // ============================================================================
  // MCP TOOLS: Actions & State Mutations (Streamlined to high-impact web actions)
  // ============================================================================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_active_workout",
          description:
            "Fetch today's active workout session on the website, returning prescribed exercises, sets, reps, target loads, rest, notes, or rest day status.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "generate_ai_workout",
          description:
            "Generate a complete, personalized workout routine for the athlete using AI (or catalog engine) and immediately populate today's active session on the website.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description:
                  "Athlete's workout request (e.g. 'Push day chest and shoulders', 'Full body 45 min', '5-day progressive overload split Lower #1 knee-spared').",
              },
              target_minutes: {
                type: "number",
                description: "Target workout duration in minutes (default: 45).",
              },
            },
          },
        },
        {
          name: "add_workout_exercise",
          description:
            "Add an exercise from the 876-exercise catalog or custom name directly to today's active workout routine on the website.",
          inputSchema: {
            type: "object",
            properties: {
              exercise_name: {
                type: "string",
                description: "Name of the exercise to add (checked against catalog or saved as custom).",
              },
              target_sets: {
                type: "number",
                description: "Number of target working sets (default: 3).",
              },
              target_reps: {
                type: "number",
                description: "Target repetitions per set (default: 10).",
              },
              target_load: {
                type: "number",
                description: "Target load in kg or lb.",
              },
              load_unit: {
                type: "string",
                enum: ["kg", "lb"],
                description: "Unit of target load (default: kg).",
              },
              rest_seconds: {
                type: "number",
                description: "Rest duration in seconds between sets (default: 60).",
              },
              notes: {
                type: "string",
                description: "Optional coaching or form execution cues.",
              },
            },
            required: ["exercise_name"],
          },
        },
        {
          name: "update_workout_exercise",
          description:
            "Update an existing exercise in today's active workout routine on the website (modify sets, reps, load, rest, notes, or name).",
          inputSchema: {
            type: "object",
            properties: {
              exercise_index: {
                type: "number",
                description: "The 0-based index of the exercise in today's workout.",
              },
              exercise_name: {
                type: "string",
                description: "New exercise name (checked against catalog).",
              },
              target_sets: {
                type: "number",
                description: "Target sets.",
              },
              target_reps: {
                type: "number",
                description: "Target reps.",
              },
              target_load: {
                type: "number",
                description: "Target load in kg or lb.",
              },
              load_unit: {
                type: "string",
                enum: ["kg", "lb"],
                description: "Unit of target load.",
              },
              rest_seconds: {
                type: "number",
                description: "Rest interval in seconds.",
              },
              notes: {
                type: "string",
                description: "Coaching notes or execution cues.",
              },
            },
            required: ["exercise_index"],
          },
        },
        {
          name: "search_exercise_catalog",
          description:
            "Search the comprehensive 876-exercise catalog from GitHub by name, muscle, category, or equipment.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search keyword (e.g. 'bench', 'curl', 'squat', 'leg press').",
              },
              muscle: {
                type: "string",
                description: "Optional muscle filter (e.g. 'chest', 'quadriceps', 'biceps', 'abdominals').",
              },
              equipment: {
                type: "string",
                description: "Optional equipment filter (e.g. 'dumbbell', 'barbell', 'body only', 'cable').",
              },
              limit: {
                type: "number",
                description: "Max number of exercises to return (default: 20).",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_exercise_guide",
          description:
            "Retrieve movement animations (GIF & thumbnail), primary target muscle, secondary muscles, setup coaching cues, and common form breakdown warnings for an exercise.",
          inputSchema: {
            type: "object",
            properties: {
              exercise_name: {
                type: "string",
                description:
                  "Name of the exercise (e.g. 'bench_press', 'squat', 'deadlift', 'barbell_row', 'overhead_press', 'pull_up', 'dumbbell_lateral_raise', 'cable_pushdown').",
              },
            },
            required: ["exercise_name"],
          },
        },
        {
          name: "log_workout_set",
          description:
            "Parse gym shorthand telemetry (e.g. 'bench 100kg 3x5 rpe8' or 'sq 140 5,5,5 @ 8.5'), evaluate Layer 0 arbitration safeguards, record sets in the live database, and return a sub-30-word coaching directive.",
          inputSchema: {
            type: "object",
            properties: {
              raw_input: {
                type: "string",
                description:
                  "Shorthand workout telemetry string (e.g., 'bench 100kg 3x5 rpe8', 'sq 140 5,5,5 @ 8.5', 'dl 225lb 1x5 rir 2').",
              },
              user_override: {
                type: "boolean",
                description:
                  "Optional Human Override Mandate flag allowing subjective athlete biofeedback to override AI load reductions.",
                default: false,
              },
            },
            required: ["raw_input"],
          },
        },
        {
          name: "get_daily_goals",
          description:
            "Fetch the athlete's complete targets and roadmap: daily habits (calories, protein, hydration, walk, training adherence), 7-day weekly split schedule, and today's logged intake.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "update_daily_goals",
          description:
            "Update the athlete's custom daily targets, weekly split schedule, or monthly mesocycle block roadmap directly on the website.",
          inputSchema: {
            type: "object",
            properties: {
              calories_target: { type: "number", description: "Target calories (kcal)." },
              calories_notes: { type: "string", description: "Deficit or caloric strategy context notes." },
              protein_min_grams: { type: "number", description: "Minimum protein target in grams." },
              protein_max_grams: { type: "number", description: "Maximum protein target in grams." },
              protein_notes: { type: "string", description: "Protein sources and meal staples notes." },
              water_min_liters: { type: "number", description: "Minimum water intake in Liters." },
              water_max_liters: { type: "number", description: "Maximum water intake in Liters." },
              water_notes: { type: "string", description: "Hydration reminder notes." },
              daily_walk_min_minutes: { type: "number", description: "Minimum daily walk duration in minutes." },
              daily_walk_max_minutes: { type: "number", description: "Maximum daily walk duration in minutes." },
              daily_walk_notes: { type: "string", description: "Metabolic rate / NEAT walking notes." },
              training_days_per_week: { type: "integer", description: "Target workout days per week." },
              training_notes: { type: "string", description: "Technical execution and pain-free discipline standards." },
              weekly_workouts_target: { type: "integer", description: "Weekly target workout count (e.g. 5)." },
              weekly_walk_minutes_target: { type: "integer", description: "Weekly total walk minutes target (e.g. 175)." },
              weekly_calorie_deficit_target: { type: "integer", description: "Weekly cumulative calorie deficit target (e.g. 3150 kcal)." },
              weekly_focus_notes: { type: "string", description: "Weekly split strategy & execution notes." },
              weekly_split_schedule: {
                type: "array",
                description: "Array of 7 day schedule objects: [{ day: 'Mon', title: 'Push', focus: 'Bench...', isRest: false, targetMinutes: 60 }]",
                items: {
                  type: "object",
                  properties: {
                    day: { type: "string" },
                    title: { type: "string" },
                    focus: { type: "string" },
                    isRest: { type: "boolean" },
                    targetMinutes: { type: "number" },
                  },
                  required: ["day", "focus", "isRest"],
                },
              },
              monthly_mesocycle_name: { type: "string", description: "Name of the 4-week mesocycle block (e.g. '4-Week Progressive Overload Block')." },
              monthly_primary_goal: { type: "string", description: "Primary mesocycle goal (e.g. 'Hypertrophy & Fat-Loss Deficit')." },
              monthly_weight_loss_target_kg: { type: "number", description: "Target weight loss over the 4-week block in kg (e.g. 1.8)." },
              monthly_total_workouts_target: { type: "integer", description: "Total target workouts in the mesocycle (e.g. 20)." },
              monthly_focus_notes: { type: "string", description: "Strategic focus notes for the mesocycle block." },
              monthly_phases: {
                type: "array",
                description: "Array of weekly phases: [{ weekNumber: 1, phaseName: 'Week 1: Accumulation', intensityRpe: 'RPE 7-7.5', volumeDescription: '...', focusNotes: '...' }]",
                items: {
                  type: "object",
                  properties: {
                    weekNumber: { type: "integer" },
                    phaseName: { type: "string" },
                    intensityRpe: { type: "string" },
                    volumeDescription: { type: "string" },
                    focusNotes: { type: "string" },
                  },
                  required: ["weekNumber", "phaseName"],
                },
              },
            },
          },
        },
        {
          name: "plan_daily_calories",
          description:
            "Plan the athlete's daily calorie and macronutrient targets using AI and sports science formulas (TDEE, BMR, deficit/surplus), and save them directly to daily goals on the website.",
          inputSchema: {
            type: "object",
            properties: {
              goal: {
                type: "string",
                enum: ["cut", "bulk", "maintain"],
                description: "Nutrition goal (cut = deficit, bulk = surplus, maintain = balance).",
              },
              prompt: {
                type: "string",
                description: "Optional custom guidance or requests (e.g. 'high protein cut 500 deficit').",
              },
              calorie_target_override: {
                type: "number",
                description: "Optional explicit calorie target to set.",
              },
            },
          },
        },
        {
          name: "update_today_calorie_usage",
          description:
            "Directly adjust or set the athlete's logged calorie intake and macros for today on the website.",
          inputSchema: {
            type: "object",
            properties: {
              calories_delta: {
                type: "number",
                description: "Calorie adjustment to add or subtract (e.g. +250 or -150).",
              },
              set_total_calories: {
                type: "number",
                description: "Exact total calories to set today's intake to.",
              },
              reason: {
                type: "string",
                description: "Explanation or note for this calorie adjustment.",
              },
            },
          },
        },
        {
          name: "log_natural_entry",
          description:
            "Log food/meals, water hydration, walking, or training using natural language (e.g. 'I ate 4 eggs', 'chicken breast 200g with rice', 'drank 500ml water', 'walked 25 mins') directly into today's log on the website.",
          inputSchema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Natural language description of what the athlete ate, drank, walked, or trained.",
              },
              calories: {
                type: "number",
                description: "Optional calorie estimate override (kcal) calculated by the AI.",
              },
              protein: {
                type: "number",
                description: "Optional protein estimate override in grams calculated by the AI.",
              },
              water_liters: {
                type: "number",
                description: "Optional water volume in Liters.",
              },
              walk_minutes: {
                type: "number",
                description: "Optional walking duration in minutes.",
              },
              training_completed: {
                type: "boolean",
                description: "Optional flag marking today's workout completed.",
              },
            },
            required: ["text"],
          },
        },
        {
          name: "delete_logged_entry",
          description:
            "Delete a previously logged meal/activity by item ID and automatically subtract its calories, protein, or water from today's totals on the website.",
          inputSchema: {
            type: "object",
            properties: {
              item_id: {
                type: "string",
                description: "The unique ID of the logged item to remove.",
              },
            },
            required: ["item_id"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`[MCP:gym-engine] Calling tool: ${name}`);

    try {
      switch (name) {
        case "get_active_workout": {
          const result = await getTodaysWorkoutAction();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "generate_ai_workout": {
          const prompt = args?.prompt !== undefined ? String(args.prompt) : undefined;
          const targetMinutes = args?.target_minutes !== undefined ? Number(args.target_minutes) : undefined;
          const result = await generateWorkoutWithAIAction({ prompt, targetMinutes });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "add_workout_exercise": {
          const exerciseName = String(args?.exercise_name || "").trim();
          if (!exerciseName) {
            throw new McpError(ErrorCode.InvalidParams, "Missing required parameter 'exercise_name'.");
          }
          const targetSets = args?.target_sets !== undefined ? Number(args.target_sets) : undefined;
          const targetReps = args?.target_reps !== undefined ? Number(args.target_reps) : undefined;
          const targetLoad = args?.target_load !== undefined ? Number(args.target_load) : undefined;
          const loadUnit = args?.load_unit === "lb" ? "lb" : "kg";
          const restSeconds = args?.rest_seconds !== undefined ? Number(args.rest_seconds) : undefined;
          const notes = args?.notes !== undefined ? String(args.notes) : undefined;

          const result = await addExerciseToWorkoutAction({
            exerciseName,
            targetSets,
            targetReps,
            targetLoad,
            loadUnit,
            restSeconds,
            notes,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "update_workout_exercise": {
          if (args?.exercise_index === undefined) {
            throw new McpError(ErrorCode.InvalidParams, "Missing required parameter 'exercise_index'.");
          }
          const exerciseIndex = Number(args.exercise_index);
          const exerciseName = args?.exercise_name !== undefined ? String(args.exercise_name) : undefined;
          const targetSets = args?.target_sets !== undefined ? Number(args.target_sets) : undefined;
          const targetReps = args?.target_reps !== undefined ? Number(args.target_reps) : undefined;
          const targetLoad = args?.target_load !== undefined ? Number(args.target_load) : undefined;
          const loadUnit = args?.load_unit === "lb" ? "lb" : args?.load_unit === "kg" ? "kg" : undefined;
          const restSeconds = args?.rest_seconds !== undefined ? Number(args.rest_seconds) : undefined;
          const notes = args?.notes !== undefined ? String(args.notes) : undefined;

          const result = await updateWorkoutExerciseAction({
            exerciseIndex,
            exerciseName,
            targetSets,
            targetReps,
            targetLoad,
            loadUnit,
            restSeconds,
            notes,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "search_exercise_catalog": {
          const query = String(args?.query || "").trim();
          const muscle = args?.muscle !== undefined ? String(args.muscle) : undefined;
          const equipment = args?.equipment !== undefined ? String(args.equipment) : undefined;
          const limit = args?.limit !== undefined ? Number(args.limit) : 20;

          const result = await searchExerciseCatalogAction(query, { muscle, equipment, limit });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    count: result.length,
                    exercises: result,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_exercise_guide": {
          const exerciseName = String(args?.exercise_name || "").trim();
          if (!exerciseName) {
            throw new McpError(ErrorCode.InvalidParams, "Missing required parameter 'exercise_name'.");
          }
          const guide = await getExerciseGuideAction(exerciseName);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(guide, null, 2),
              },
            ],
          };
        }

        case "log_workout_set": {
          const rawInput = String(args?.raw_input || "").trim();
          const userOverride = Boolean(args?.user_override || false);

          if (!rawInput) {
            throw new McpError(ErrorCode.InvalidParams, "Missing required argument 'raw_input'.");
          }

          const result = await submitShorthandSetAction(rawInput, userOverride);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "get_daily_goals": {
          const result = await getDailyGoalsAction();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "update_daily_goals": {
          const weeklySplit = parseJsonArray<WeeklySplitDay>(args?.weekly_split_schedule);
          const monthlyPhases = parseJsonArray<MonthlyPhase>(args?.monthly_phases);

          const result = await saveDailyGoalsAction({
            caloriesTarget: args?.calories_target !== undefined ? Number(args.calories_target) : undefined,
            caloriesNotes: args?.calories_notes !== undefined ? String(args.calories_notes) : undefined,
            proteinMinGrams: args?.protein_min_grams !== undefined ? Number(args.protein_min_grams) : undefined,
            proteinMaxGrams: args?.protein_max_grams !== undefined ? Number(args.protein_max_grams) : undefined,
            proteinNotes: args?.protein_notes !== undefined ? String(args.protein_notes) : undefined,
            waterMinLiters: args?.water_min_liters !== undefined ? Number(args.water_min_liters) : undefined,
            waterMaxLiters: args?.water_max_liters !== undefined ? Number(args.water_max_liters) : undefined,
            waterNotes: args?.water_notes !== undefined ? String(args.water_notes) : undefined,
            dailyWalkMinMinutes: args?.daily_walk_min_minutes !== undefined ? Number(args.daily_walk_min_minutes) : undefined,
            dailyWalkMaxMinutes: args?.daily_walk_max_minutes !== undefined ? Number(args.daily_walk_max_minutes) : undefined,
            dailyWalkNotes: args?.daily_walk_notes !== undefined ? String(args.daily_walk_notes) : undefined,
            trainingDaysPerWeek: args?.training_days_per_week !== undefined ? Number(args.training_days_per_week) : undefined,
            trainingNotes: args?.training_notes !== undefined ? String(args.training_notes) : undefined,
            weeklyWorkoutsTarget: args?.weekly_workouts_target !== undefined ? Number(args.weekly_workouts_target) : undefined,
            weeklyWalkMinutesTarget: args?.weekly_walk_minutes_target !== undefined ? Number(args.weekly_walk_minutes_target) : undefined,
            weeklyCalorieDeficitTarget: args?.weekly_calorie_deficit_target !== undefined ? Number(args.weekly_calorie_deficit_target) : undefined,
            weeklyFocusNotes: args?.weekly_focus_notes !== undefined ? String(args.weekly_focus_notes) : undefined,
            weeklySplitSchedule: weeklySplit,
            monthlyMesocycleName: args?.monthly_mesocycle_name !== undefined ? String(args.monthly_mesocycle_name) : undefined,
            monthlyPrimaryGoal: args?.monthly_primary_goal !== undefined ? String(args.monthly_primary_goal) : undefined,
            monthlyWeightLossTargetKg: args?.monthly_weight_loss_target_kg !== undefined ? Number(args.monthly_weight_loss_target_kg) : undefined,
            monthlyTotalWorkoutsTarget: args?.monthly_total_workouts_target !== undefined ? Number(args.monthly_total_workouts_target) : undefined,
            monthlyFocusNotes: args?.monthly_focus_notes !== undefined ? String(args.monthly_focus_notes) : undefined,
            monthlyPhases: monthlyPhases,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "plan_daily_calories": {
          const goal = args?.goal === "bulk" || args?.goal === "cut" || args?.goal === "maintain" ? args.goal : undefined;
          const prompt = args?.prompt !== undefined ? String(args.prompt) : undefined;
          const calorieTargetOverride = args?.calorie_target_override !== undefined ? Number(args.calorie_target_override) : undefined;

          const result = await planDailyCaloriesWithAIAction({
            goal,
            prompt,
            calorieTargetOverride,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "update_today_calorie_usage": {
          const caloriesDelta = args?.calories_delta !== undefined ? Number(args.calories_delta) : undefined;
          const setTotalCalories = args?.set_total_calories !== undefined ? Number(args.set_total_calories) : undefined;
          const reason = args?.reason !== undefined ? String(args.reason) : undefined;

          const result = await updateTodayCalorieUsageAction({
            caloriesDelta,
            setTotalCalories,
            reason,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "log_natural_entry": {
          const text = String(args?.text || "").trim();
          if (!text) {
            throw new McpError(ErrorCode.InvalidParams, "Missing required parameter 'text'.");
          }

          const result = await logNaturalEntryAction({
            text,
            calories: args?.calories !== undefined ? Number(args.calories) : undefined,
            protein: args?.protein !== undefined ? Number(args.protein) : undefined,
            waterLiters: args?.water_liters !== undefined ? Number(args.water_liters) : undefined,
            walkMinutes: args?.walk_minutes !== undefined ? Number(args.walk_minutes) : undefined,
            trainingCompleted: args?.training_completed !== undefined ? Boolean(args.training_completed) : undefined,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "delete_logged_entry": {
          const itemId = String(args?.item_id || "").trim();
          if (!itemId) {
            throw new McpError(ErrorCode.InvalidParams, "Missing required parameter 'item_id'.");
          }

          const result = await deleteLoggedItemAction(itemId);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          console.error(`[MCP:gym-engine] Unknown tool requested: ${name}`);
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`[MCP:gym-engine] Error executing tool ${name}:`, error);
      if (error instanceof McpError) throw error;
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "Internal tool execution failure.",
          },
        ],
      };
    }
  });
}

export function createMcpServer(): Server {
  const s = new Server(
    {
      name: "gym-engine",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );
  registerHandlers(s);
  return s;
}

export const server = createMcpServer();

// ============================================================================
// SERVER INITIALIZATION & TRANSPORT
// ============================================================================

export async function runServer() {
  console.error("[MCP:gym-engine] Connecting to stdio transport...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP:gym-engine] Server successfully running on stdio.");
}

process.on("SIGINT", () => {
  console.error("[MCP:gym-engine] Received SIGINT. Terminating cleanly.");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("[MCP:gym-engine] Received SIGTERM. Terminating cleanly.");
  process.exit(0);
});

// Execute when run as CLI
const isDirectCli =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"));

if (isDirectCli) {
  runServer().catch((err) => {
    console.error("[MCP:gym-engine] Fatal crash on startup:", err);
    process.exit(1);
  });
}

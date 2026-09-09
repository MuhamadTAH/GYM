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
import { workoutSessions, coachMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  getOrCreateActiveSession,
  getUserProfileAction,
  getTodaysWorkoutAction,
  fetchRecentSetsAction,
  submitShorthandSetAction,
  triggerManualHardStopAction,
  generateNewMesocycleAction,
  swapSessionOrderAction,
  postChatReplyAction,
  getDailyGoalsAction,
  saveDailyGoalsAction,
  getRecommendedWeeklyPlanAction,
  getRecommendedMonthlyPlanAction,
} from "@/app/actions";
import { calculateMacroTargets, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition";
import type { PlannerGoal, SplitType } from "@/lib/planner";
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
        uri: "gym://mesocycle/summary",
        name: "Mesocycle 4-Week Block Summary",
        description:
          "Returns current 4-week mesocycle block details, active week, split type, and completion metrics.",
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
        uri: "gym://chat/pending",
        name: "Pending Athlete Chat Messages",
        description:
          "Returns all pending athlete messages sent from the dashboard waiting for AI response.",
        mimeType: "application/json",
      },
      {
        uri: "gym://goals",
        name: "Athlete Daily Goals, Weekly Split & Monthly Mesocycle",
        description:
          "Returns the athlete's configured daily targets (Calories, Protein, Water, Daily Walk, Training Adherence), 7-day weekly split schedule, and 4-week monthly mesocycle roadmap, along with today's logged status.",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  console.error(`[MCP:gym-engine] Reading resource: ${uri}`);

  switch (uri) {
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
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }

    case "gym://session/active": {
      const todaysWorkout = await getTodaysWorkoutAction();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(todaysWorkout, null, 2),
          },
        ],
      };
    }

    case "gym://mesocycle/summary": {
      const sessionContext = await getOrCreateActiveSession();
      const { userId } = sessionContext;

      const sessions = await db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userId))
        .orderBy(asc(workoutSessions.startedAt));

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter((s) => s.status === "completed").length;
      const plannedSessions = sessions.filter((s) => s.status === "planned").length;
      const inProgressSessions = sessions.filter((s) => s.status === "in_progress").length;
      const workoutDays = sessions.filter((s) => s.sessionType !== "rest").length;
      const completedWorkoutDays = sessions.filter(
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

    case "gym://chat/pending": {
      const pending = await db
        .select()
        .from(coachMessages)
        .where(eq(coachMessages.status, "pending"))
        .orderBy(asc(coachMessages.createdAt));
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(pending, null, 2),
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
// MCP TOOLS: Actions & State Mutations
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "log_workout_set",
        description:
          "Parse gym shorthand telemetry (e.g. 'bench 100kg 3x5 rpe8' or 'sq 140 5,5,5 @ 8.5'), evaluate Layer 0 arbitration safeguards, record sets in SQLite, and return a sub-30-word coaching directive.",
        inputSchema: {
          type: "object",
          properties: {
            raw_input: {
              type: "string",
              description:
                "Shorthand workout telemetry string (e.g., 'bench 100kg 3x5 rpe8', 'sq 140 5,5,5 @ 8.5', 'dl 225lb 1x5 rir 2', 'squat 100 1x1 pain:knee sharp 8').",
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
        name: "get_active_workout",
        description:
          "Fetch today's active or next uncompleted workout session in the sequential queue, returning prescribed exercises, target loads, sets, and reps, or rest day status.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "trigger_safety_abort",
        description:
          "Invoke the Layer 0 Emergency Hard Stop protocol. Immediately sets hard_stop_active = true, zeroes out load modifiers, and aborts the current movement safely.",
        inputSchema: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "The clinical, pain, or safety reason for the emergency hard stop.",
            },
          },
          required: ["reason"],
        },
      },
      {
        name: "calculate_nutrition",
        description:
          "Calculate deterministic Mifflin-St Jeor BMR, TDEE, target calories, and exact protein/carb/fat gram breakdowns based on user biometrics.",
        inputSchema: {
          type: "object",
          properties: {
            goal: {
              type: "string",
              enum: ["cut", "bulk", "maintain"],
              description: "Caloric goal: 'cut' (-500 kcal), 'bulk' (+300 kcal), or 'maintain'.",
            },
            activity_level: {
              type: "string",
              enum: [
                "sedentary",
                "lightly_active",
                "moderately_active",
                "very_active",
                "extra_active",
              ],
              description: "Physical activity multiplier. Defaults to 'moderately_active'.",
              default: "moderately_active",
            },
          },
          required: ["goal"],
        },
      },
      {
        name: "generate_mesocycle",
        description:
          "Construct and seed a deterministic 4-week progressive overload mesocycle block into SQLite based on baseline 1RMs and split preferences.",
        inputSchema: {
          type: "object",
          properties: {
            primary_goal: {
              type: "string",
              enum: ["hypertrophy", "strength", "recomposition"],
              description: "Primary training goal for the 4-week block.",
            },
            split: {
              type: "string",
              enum: ["push_pull_legs", "upper_lower", "full_body"],
              description: "Workout split architecture.",
            },
            days_per_week: {
              type: "integer",
              minimum: 3,
              maximum: 6,
              description: "Training frequency in days per week (3 to 6).",
            },
          },
          required: ["primary_goal", "split", "days_per_week"],
        },
      },
      {
        name: "swap_workout_order",
        description:
          "Swap today's active workout with the next upcoming session in the queue (provides day-swapping flexibility when gym equipment is occupied).",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_pending_chat_messages",
        description:
          "Retrieve all incoming messages sent by the athlete from the dashboard waiting for an AI response.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "post_chat_reply",
        description:
          "Post an AI coaching answer back to the athlete on the dashboard for a specific message ID.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: {
              type: "string",
              description: "The unique ID of the message being answered.",
            },
            reply_text: {
              type: "string",
              description: "The AI coach's thoughtful, personalized response to the athlete.",
            },
            badge_summary: {
              type: "string",
              description: "Optional short summary tag for the response badge (e.g., 'Plan Adjusted', 'Technique Tip').",
            },
          },
          required: ["message_id", "reply_text"],
        },
      },
      {
        name: "get_daily_goals",
        description:
          "Fetch the athlete's complete targets and roadmap: daily habits (calories, protein, hydration, walk, training adherence), 7-day weekly split schedule, and 4-week monthly progressive overload mesocycle, along with today's logged intake.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_daily_goals",
        description:
          "Update the athlete's custom daily targets, weekly split schedule, or monthly mesocycle block roadmap.",
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
        name: "get_training_plans",
        description:
          "Retrieve the athlete's 7-day weekly split schedule and 4-week monthly mesocycle block progression roadmap.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_training_plans",
        description:
          "Update the athlete's weekly split schedule (7 days) and/or monthly 4-week mesocycle block roadmap.",
        inputSchema: {
          type: "object",
          properties: {
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
        name: "get_recommended_plans",
        description:
          "Retrieve evidence-based recommended templates for weekly 5-day training split schedule and/or 4-week progressive overload mesocycle roadmap.",
        inputSchema: {
          type: "object",
          properties: {
            plan_type: {
              type: "string",
              enum: ["weekly", "monthly", "both"],
              description: "Type of recommended plan template to retrieve: 'weekly', 'monthly', or 'both'. Defaults to 'both'.",
              default: "both",
            },
          },
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

      case "trigger_safety_abort": {
        const reason = String(args?.reason || "Emergency Hard Stop via MCP");
        const result = await triggerManualHardStopAction(reason);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  hard_stop_active: result.hard_stop_active,
                  arbitration_decision: result.arbitration_decision,
                  abort_reason: result.abort_reason,
                  action_summary: result.action_summary,
                  resolved_load_modifier: result.resolved_load_modifier,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "calculate_nutrition": {
        const goal = (args?.goal as NutritionGoal) || "maintain";
        const activityLevel = (args?.activity_level as ActivityLevel) || "moderately_active";

        const profile = await getUserProfileAction();
        const weightKg =
          profile.preferredUnit === "lb"
            ? Math.round(profile.currentWeightValue * 0.453592 * 10) / 10
            : profile.currentWeightValue;

        const nutrition = calculateMacroTargets({
          weightKg,
          heightCm: profile.heightCm,
          ageYears: profile.age,
          sex: profile.sex,
          activityLevel,
          goal,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  athlete: profile.name,
                  biometrics: {
                    weightKg,
                    heightCm: profile.heightCm,
                    age: profile.age,
                    sex: profile.sex,
                  },
                  nutrition,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "generate_mesocycle": {
        const primaryGoal = args?.primary_goal as PlannerGoal;
        const split = args?.split as SplitType;
        const daysPerWeek = Number(args?.days_per_week);

        if (!primaryGoal || !split || !daysPerWeek) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "generate_mesocycle requires 'primary_goal', 'split', and 'days_per_week'."
          );
        }

        const result = await generateNewMesocycleAction({
          primaryGoal,
          split,
          daysPerWeek,
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

      case "swap_workout_order": {
        const activeWorkout = await getTodaysWorkoutAction();

        if (!activeWorkout.nextSession) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  message: "No upcoming workout session available to swap with.",
                }),
              },
            ],
          };
        }

        const result = await swapSessionOrderAction(
          activeWorkout.sessionId,
          activeWorkout.nextSession.sessionId
        );

        const updatedWorkout = await getTodaysWorkoutAction();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: result.success,
                  message: result.message,
                  nowActiveSession: updatedWorkout.sessionName,
                  swappedOutSession: activeWorkout.sessionName,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_pending_chat_messages": {
        const pending = await db
          .select()
          .from(coachMessages)
          .where(eq(coachMessages.status, "pending"))
          .orderBy(asc(coachMessages.createdAt));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  pending_count: pending.length,
                  messages: pending,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "post_chat_reply": {
        const messageId = String(args?.message_id);
        const replyText = String(args?.reply_text);
        const badgeSummary = (args?.badge_summary as string) || "Coach Reply";

        if (!messageId || !replyText) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "post_chat_reply requires 'message_id' and 'reply_text'."
          );
        }

        const actionReceipt = {
          type: "COACH_ADVICE",
          summary: badgeSummary,
          badgeColor: "emerald",
        };

        const result = await postChatReplyAction(messageId, replyText, actionReceipt);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: result.success,
                  message_id: messageId,
                  status: "replied",
                },
                null,
                2
              ),
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

      case "get_training_plans": {
        const goals = await getDailyGoalsAction();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  weeklyPlan: {
                    weeklyWorkoutsTarget: goals.weeklyWorkoutsTarget,
                    weeklyWalkMinutesTarget: goals.weeklyWalkMinutesTarget,
                    weeklyCalorieDeficitTarget: goals.weeklyCalorieDeficitTarget,
                    weeklyFocusNotes: goals.weeklyFocusNotes,
                    weeklySplitSchedule: goals.weeklySplitSchedule,
                  },
                  monthlyMesocycle: {
                    monthlyMesocycleName: goals.monthlyMesocycleName,
                    monthlyPrimaryGoal: goals.monthlyPrimaryGoal,
                    monthlyWeightLossTargetKg: goals.monthlyWeightLossTargetKg,
                    monthlyTotalWorkoutsTarget: goals.monthlyTotalWorkoutsTarget,
                    monthlyFocusNotes: goals.monthlyFocusNotes,
                    monthlyPhases: goals.monthlyPhases,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "update_training_plans": {
        const weeklySplit = parseJsonArray<WeeklySplitDay>(args?.weekly_split_schedule);
        const monthlyPhases = parseJsonArray<MonthlyPhase>(args?.monthly_phases);

        const result = await saveDailyGoalsAction({
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

      case "get_recommended_plans": {
        const planType = String(args?.plan_type || "both").toLowerCase();
        let weekly = null;
        let monthly = null;
        if (planType === "weekly" || planType === "both") {
          weekly = await getRecommendedWeeklyPlanAction();
        }
        if (planType === "monthly" || planType === "both") {
          monthly = await getRecommendedMonthlyPlanAction();
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ weekly, monthly }, null, 2),
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

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
} from "@/app/actions";
import { calculateMacroTargets, type ActivityLevel, type NutritionGoal } from "@/lib/nutrition";
import type { PlannerGoal, SplitType } from "@/lib/planner";

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
        name: "Athlete Daily Goals & Strategy",
        description:
          "Returns the athlete's configured daily targets for Calories, Protein, Water, Daily Walk, and Training Adherence, along with today's logged status.",
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
          "Fetch the athlete's configured targets and strategic notes for calories, protein, hydration, walk, and training adherence, along with today's logged intake.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_daily_goals",
        description:
          "Update the athlete's custom daily targets and notes for calories, protein, water, walk, or training adherence.",
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

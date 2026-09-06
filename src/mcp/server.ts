import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { db } from "../db/index";
import { userProfiles, workoutSessions, exerciseSets } from "../db/schema";
import { eq, desc, asc, and, ne } from "drizzle-orm";
import {
  getOrCreateActiveSession,
  submitShorthandSetAction,
  triggerManualHardStopAction,
  getTodaysWorkoutAction,
  generateNewMesocycleAction,
  swapSessionOrderAction,
} from "../app/actions";
import { calculateMacroTargets, type NutritionGoal } from "../lib/nutrition";
import type { ActivityLevel } from "../lib/math";
import type { PlannerGoal, SplitType } from "../lib/planner";

/**
 * MANDATORY MCP STDIO LOGGING RULE:
 * Never use console.log anywhere in the MCP server path.
 * Route all diagnostic logs to console.error to avoid corrupting the stdio JSON-RPC stream.
 */
function logDiagnostic(message: string, ...args: unknown[]) {
  console.error(`[gym-engine] ${message}`, ...args);
}

// 1. Initialize MCP Server instance
const server = new Server(
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

// 2. Resource Definitions
const RESOURCES = [
  {
    uri: "gym://profile",
    name: "Active User Profile",
    mimeType: "application/json",
    description:
      "Returns the active user profile, baseline 1RMs, preferred units, and active injuries.",
  },
  {
    uri: "gym://session/active",
    name: "Active Workout Session",
    mimeType: "application/json",
    description:
      "Returns the current uncompleted workout session with planned exercises, target weights, sets, and reps.",
  },
  {
    uri: "gym://mesocycle/summary",
    name: "Current Mesocycle Summary",
    mimeType: "application/json",
    description:
      "Returns the current 4-week block details, active week, split type, and completion metrics.",
  },
  {
    uri: "gym://history/recent",
    name: "Recent Exercise Sets History",
    mimeType: "application/json",
    description:
      "Returns the last 10 logged sets with RPE, load, and pain flags.",
  },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: RESOURCES,
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  logDiagnostic(`Reading resource: ${uri}`);

  try {
    switch (uri) {
      case "gym://profile": {
        const { userId } = await getOrCreateActiveSession();
        const users = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.id, userId))
          .limit(1);

        if (users.length === 0) {
          throw new McpError(ErrorCode.InternalError, "User profile not found");
        }

        const user = users[0];
        const profileData = {
          id: user.id,
          name: user.name,
          email: user.email,
          age: user.age,
          sex: user.sex,
          heightCm: user.heightCm,
          preferredUnit: user.preferredUnit,
          currentWeight: {
            value: user.currentWeightValue,
            unit: user.currentWeightUnit,
            sevenDayMedian: user.sevenDayWeightMedian,
          },
          baselineLifts: user.baselineLifts,
          activeInjuries: user.activeInjuries,
          coldStart: {
            active: user.coldStartActive,
            daysRemaining: user.coldStartDaysRemaining,
          },
          trainingAge: user.trainingAge,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(profileData, null, 2),
            },
          ],
        };
      }

      case "gym://session/active": {
        const activeWorkout = await getTodaysWorkoutAction();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(activeWorkout, null, 2),
            },
          ],
        };
      }

      case "gym://mesocycle/summary": {
        const { userId } = await getOrCreateActiveSession();
        const sessions = await db
          .select()
          .from(workoutSessions)
          .where(eq(workoutSessions.userId, userId))
          .orderBy(asc(workoutSessions.startedAt));

        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(
          (s) => s.status === "completed"
        ).length;
        const abortedSessions = sessions.filter(
          (s) => s.status === "aborted"
        ).length;
        const activeSession = sessions.find((s) => s.status === "in_progress");
        const remainingSessions = sessions.filter(
          (s) => s.status !== "completed" && s.status !== "aborted"
        ).length;

        const currentSequence = completedSessions + 1;
        const activeWeek = Math.max(
          1,
          Math.min(4, Math.ceil(currentSequence / 7))
        );
        const completionRate =
          totalSessions > 0
            ? Math.round((completedSessions / totalSessions) * 100)
            : 0;

        const summary = {
          totalSessions,
          completedSessions,
          abortedSessions,
          remainingSessions,
          activeWeek,
          completionRatePercent: completionRate,
          activeSession: activeSession
            ? {
                id: activeSession.id,
                name: activeSession.sessionName,
                type: activeSession.sessionType,
                startedAt: activeSession.startedAt,
                arbitrationHardStop: activeSession.arbitrationHardStop,
                arbitrationDecision: activeSession.arbitrationDecision,
              }
            : null,
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
        const recentSets = await db
          .select()
          .from(exerciseSets)
          .orderBy(desc(exerciseSets.completedAt))
          .limit(10);

        const history = recentSets.map((s) => ({
          id: s.id,
          sessionId: s.sessionId,
          exerciseName: s.exerciseName,
          movementPattern: s.movementPattern,
          setNumber: s.setNumber,
          setType: s.setType,
          loadValue: s.loadValue,
          loadUnit: s.loadUnit,
          reps: s.reps,
          loggedRpe: s.loggedRpe,
          rir: s.rir,
          hasAcutePain: s.hasAcutePain,
          painSite: s.painSite,
          painSeverity: s.painSeverity,
          painSensation: s.painSensation,
          userOverrideActive: s.userOverrideActive,
          completedAt: s.completedAt,
        }));

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(history, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unknown resource URI: ${uri}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    logDiagnostic("Resource error:", error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// 3. Tool Definitions
const TOOLS = [
  {
    name: "log_workout_set",
    description:
      "Logs shorthand gym telemetry (e.g. 'bench 100kg 3x5 rpe8'), evaluates Layer 0 arbitration, records the set in SQLite, and returns parsed metrics + arbitration status.",
    inputSchema: {
      type: "object",
      properties: {
        raw_input: {
          type: "string",
          description:
            "Shorthand workout telemetry string, e.g. 'bench 100kg 3x5 rpe8' or 'squat 140kg 5 reps rpe9 pain:knee:4:sharp'",
        },
        user_override: {
          type: "boolean",
          description:
            "Optional human override mandate to bypass arbitration down-regulation",
        },
      },
      required: ["raw_input"],
    },
  },
  {
    name: "get_active_workout",
    description:
      "Fetches the next uncompleted workout session in sequence with planned exercises, target loads, sets, reps, and rest day status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "trigger_safety_abort",
    description:
      "Invokes Layer 0 emergency hard-stop protocol, sets arbitration_hard_stop = true, and cancels remaining load in the active session.",
    inputSchema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Reason for emergency abort (e.g. 'Acute sharp shoulder pain during press')",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "calculate_nutrition",
    description:
      "Calculates deterministic Mifflin-St Jeor BMR, TDEE, calorie target, and macro gram breakdowns (protein, fat, carbs) based on active user profile metrics.",
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          enum: ["cut", "bulk", "maintain"],
          description:
            "Nutrition goal: 'cut' (-500 kcal deficit), 'bulk' (+300 kcal surplus), or 'maintain'",
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
          description:
            "Activity level multiplier (default: 'moderately_active')",
        },
      },
      required: ["goal"],
    },
  },
  {
    name: "generate_mesocycle",
    description:
      "Generates a deterministic 4-week mesocycle training block and seeds workout sessions into SQLite.",
    inputSchema: {
      type: "object",
      properties: {
        primary_goal: {
          type: "string",
          enum: ["hypertrophy", "strength", "recomposition"],
          description: "Primary training goal for the 4-week block",
        },
        split: {
          type: "string",
          enum: ["push_pull_legs", "upper_lower", "full_body"],
          description: "Workout split structure",
        },
        days_per_week: {
          type: "integer",
          minimum: 3,
          maximum: 6,
          description: "Number of training days per week (3 to 6)",
        },
      },
      required: ["primary_goal", "split", "days_per_week"],
    },
  },
  {
    name: "swap_workout_order",
    description:
      "Swaps today's active workout with the next upcoming session in the queue (Day-Swapping Flexibility).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logDiagnostic(`Calling tool: ${name} with args:`, args);

  try {
    switch (name) {
      case "log_workout_set": {
        const schema = z.object({
          raw_input: z.string().min(1, "raw_input cannot be empty"),
          user_override: z.boolean().optional(),
        });
        const parsedArgs = schema.parse(args);

        const result = await submitShorthandSetAction(
          parsedArgs.raw_input,
          parsedArgs.user_override ?? false
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !result.success,
        };
      }

      case "get_active_workout": {
        const activeWorkout = await getTodaysWorkoutAction();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(activeWorkout, null, 2),
            },
          ],
        };
      }

      case "trigger_safety_abort": {
        const schema = z.object({
          reason: z.string().min(1, "reason cannot be empty"),
        });
        const parsedArgs = schema.parse(args);

        const result = await triggerManualHardStopAction(parsedArgs.reason);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "HARD_STOP_TRIGGERED",
                  reason: parsedArgs.reason,
                  arbitration: result,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "calculate_nutrition": {
        const schema = z.object({
          goal: z.enum(["cut", "bulk", "maintain"]),
          activity_level: z
            .enum([
              "sedentary",
              "lightly_active",
              "moderately_active",
              "very_active",
              "extra_active",
            ])
            .optional(),
        });
        const parsedArgs = schema.parse(args);

        const { userId } = await getOrCreateActiveSession();
        const users = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.id, userId))
          .limit(1);

        if (users.length === 0) {
          throw new McpError(ErrorCode.InternalError, "User profile not found");
        }

        const user = users[0];
        const activityLevel: ActivityLevel =
          parsedArgs.activity_level ?? "moderately_active";
        const goal: NutritionGoal = parsedArgs.goal;

        const macros = calculateMacroTargets({
          weightKg: user.currentWeightValue,
          heightCm: user.heightCm,
          ageYears: user.age,
          sex: user.sex as "male" | "female" | "other",
          activityLevel,
          goal,
        });

        if (!macros) {
          throw new McpError(
            ErrorCode.InternalError,
            "Failed to calculate macro targets"
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  athlete: {
                    name: user.name,
                    weightKg: user.currentWeightValue,
                    heightCm: user.heightCm,
                    age: user.age,
                    sex: user.sex,
                    goal,
                    activityLevel,
                  },
                  nutritionPlan: macros,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "generate_mesocycle": {
        const schema = z.object({
          primary_goal: z.enum(["hypertrophy", "strength", "recomposition"]),
          split: z.enum(["push_pull_legs", "upper_lower", "full_body"]),
          days_per_week: z.number().int().min(3).max(6),
        });
        const parsedArgs = schema.parse(args);

        const result = await generateNewMesocycleAction({
          primaryGoal: parsedArgs.primary_goal as PlannerGoal,
          split: parsedArgs.split as SplitType,
          daysPerWeek: parsedArgs.days_per_week,
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
                  message: "No upcoming session available to swap.",
                }),
              },
            ],
            isError: true,
          };
        }

        const result = await swapSessionOrderAction(
          activeWorkout.sessionId,
          activeWorkout.nextSession.sessionId
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !result.success,
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "Invalid arguments",
                details: error.issues,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
    logDiagnostic("Tool execution error:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// 4. Start MCP Server over Stdio
async function main() {
  logDiagnostic("Starting gym-engine MCP server over Stdio transport...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logDiagnostic("gym-engine MCP server connected and listening for JSON-RPC messages.");
}

main().catch((error) => {
  console.error("[gym-engine] Fatal startup error:", error);
  process.exit(1);
});

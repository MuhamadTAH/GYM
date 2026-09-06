import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import * as path from "path";

describe("MCP Server Stdio Integration", () => {
  it("initializes cleanly over stdio without stdout pollution and handles tools & resources", async () => {
    const serverPath = path.resolve(__dirname, "../server.ts");
    const child = spawn("npx", ["tsx", serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, DATABASE_URL: "file:gym.db" },
      shell: true,
    });

    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];

    child.stdout.on("data", (data) => {
      const text = data.toString();
      text.split("\n").forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed) stdoutLines.push(trimmed);
      });
    });

    child.stderr.on("data", (data) => {
      stderrLines.push(data.toString());
    });

    const sendRpc = (msg: object) => {
      child.stdin.write(JSON.stringify(msg) + "\n");
    };

    // Helper to wait for a specific response by id
    const waitForResponse = (id: number, timeoutMs = 8000): Promise<any> => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
          for (const line of stdoutLines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.id === id) {
                clearInterval(interval);
                return resolve(parsed);
              }
            } catch {
              // Ignore non-JSON or partial lines during polling
            }
          }
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(interval);
            reject(
              new Error(
                `Timeout waiting for response id ${id}. Stderr: ${stderrLines.join("\n")}`
              )
            );
          }
        }, 50);
      });
    };

    try {
      // 1. Send Initialize Request
      sendRpc({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      });

      const initResponse = await waitForResponse(1);
      expect(initResponse.result).toBeDefined();
      expect(initResponse.result.serverInfo.name).toBe("gym-engine");
      expect(initResponse.result.serverInfo.version).toBe("1.0.0");
      expect(initResponse.result.capabilities.resources).toBeDefined();
      expect(initResponse.result.capabilities.tools).toBeDefined();

      // Send initialized notification
      sendRpc({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      // 2. List Resources Request
      sendRpc({
        jsonrpc: "2.0",
        id: 2,
        method: "resources/list",
        params: {},
      });

      const listResourcesResponse = await waitForResponse(2);
      expect(listResourcesResponse.result.resources).toHaveLength(4);
      const uris = listResourcesResponse.result.resources.map((r: any) => r.uri);
      expect(uris).toContain("gym://profile");
      expect(uris).toContain("gym://session/active");
      expect(uris).toContain("gym://mesocycle/summary");
      expect(uris).toContain("gym://history/recent");

      // 3. Read Resource Request: gym://profile
      sendRpc({
        jsonrpc: "2.0",
        id: 3,
        method: "resources/read",
        params: { uri: "gym://profile" },
      });

      const readProfileResponse = await waitForResponse(3);
      expect(readProfileResponse.result.contents[0].uri).toBe("gym://profile");
      const profile = JSON.parse(readProfileResponse.result.contents[0].text);
      expect(profile.baselineLifts).toBeDefined();

      // 4. List Tools Request
      sendRpc({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/list",
        params: {},
      });

      const listToolsResponse = await waitForResponse(4);
      const toolNames = listToolsResponse.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain("log_workout_set");
      expect(toolNames).toContain("get_active_workout");
      expect(toolNames).toContain("trigger_safety_abort");
      expect(toolNames).toContain("calculate_nutrition");
      expect(toolNames).toContain("generate_mesocycle");
      expect(toolNames).toContain("swap_workout_order");

      // 5. Call Tool: calculate_nutrition
      sendRpc({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "calculate_nutrition",
          arguments: { goal: "cut" },
        },
      });

      const nutritionResponse = await waitForResponse(5);
      expect(nutritionResponse.result.isError).toBeFalsy();
      const nutritionText = JSON.parse(nutritionResponse.result.content[0].text);
      expect(nutritionText.nutritionPlan.targetCalories).toBeGreaterThan(1200);
      expect(nutritionText.nutritionPlan.proteinGrams).toBeGreaterThan(0);

      // 6. Call Tool: get_active_workout
      sendRpc({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "get_active_workout",
          arguments: {},
        },
      });

      const workoutResponse = await waitForResponse(6);
      expect(workoutResponse.result.isError).toBeFalsy();
      const workoutText = JSON.parse(workoutResponse.result.content[0].text);
      expect(workoutText.sessionId).toBeDefined();

      // 7. Call Tool: log_workout_set
      sendRpc({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
          name: "log_workout_set",
          arguments: { raw_input: "bench 100kg 3x5 rpe8" },
        },
      });

      const logSetResponse = await waitForResponse(7);
      expect(logSetResponse.result.isError).toBeFalsy();
      const logSetText = JSON.parse(logSetResponse.result.content[0].text);
      expect(logSetText.success).toBe(true);
      expect(logSetText.parsed.exercise_name).toBe("bench_press");

      // 8. Call Tool: trigger_safety_abort
      sendRpc({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: {
          name: "trigger_safety_abort",
          arguments: { reason: "Acute test pain abort" },
        },
      });

      const abortResponse = await waitForResponse(8);
      expect(abortResponse.result.isError).toBeFalsy();
      const abortText = JSON.parse(abortResponse.result.content[0].text);
      expect(abortText.status).toBe("HARD_STOP_TRIGGERED");

      // 9. Verify stdout hygiene: EVERY line printed to stdout must be valid JSON-RPC!
      for (const line of stdoutLines) {
        expect(() => JSON.parse(line)).not.toThrow();
        const parsed = JSON.parse(line);
        expect(parsed.jsonrpc).toBe("2.0");
      }
    } finally {
      child.kill();
    }
  }, 15000);
});

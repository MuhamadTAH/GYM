import { describe, it, expect, beforeAll } from "vitest";
import { GET, POST, OPTIONS, DELETE } from "@/app/api/mcp/route";
import { db } from "@/db";
import { userProfiles } from "@/db/schema";

describe("Remote MCP StreamableHTTP / SSE Endpoint (/api/mcp)", () => {
  let sessionId: string;

  beforeAll(async () => {
    // Ensure clean user profile
    const existing = await db.select().from(userProfiles).limit(1);
    if (existing.length === 0) {
      await db.insert(userProfiles).values({
        id: crypto.randomUUID(),
        name: "Athlete",
        email: "user@gym.local",
        age: 26,
        sex: "male",
        heightCm: 175,
        preferredUnit: "kg",
        currentWeightValue: 75,
        currentWeightUnit: "kg",
        sevenDayWeightMedian: 75,
        coldStartActive: false,
        coldStartDaysRemaining: 0,
        trainingAge: "intermediate",
        rawWeightHistory: [],
        baselineLifts: {
          squat_1rm: 120,
          bench_press_1rm: 90,
          deadlift_1rm: 150,
          overhead_press_1rm: 60,
          barbell_row_1rm: 75,
          pull_up_1rm: 25,
        },
        activeInjuries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  it("handles OPTIONS preflight with complete CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-expose-headers")).toContain("mcp-session-id");
  });

  it("handles browser GET request by returning server info JSON", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("gym-engine");
    expect(data.status).toBe("online");
    expect(data.capabilities.tools).toHaveLength(9);
  });

  it("handles SSE GET request and emits endpoint handshake event", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "GET",
      headers: {
        accept: "text/event-stream",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("mcp-session-id")).toBeTruthy();

    const reader = res.body?.getReader();
    expect(reader).toBeTruthy();
    const chunk = await reader?.read();
    const text = new TextDecoder().decode(chunk?.value);
    expect(text).toContain("event: endpoint");
    expect(text).toContain("/api/mcp?sessionId=");
    reader?.cancel();
  });

  it("initializes an MCP session via POST and returns mcp-session-id", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "gemini-web", version: "1.0" },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const sid = res.headers.get("mcp-session-id");
    expect(sid).toBeTruthy();
    sessionId = sid!;

    const text = await res.text();
    expect(text).toContain("gym-engine");
    expect(text).toContain("2024-11-05");
  });

  it("lists MCP tools using the initialized session ID", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-session-id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain("log_workout_set");
    expect(text).toContain("get_active_workout");
    expect(text).toContain("calculate_nutrition");
    expect(text).toContain("trigger_safety_abort");
  });

  it("executes an MCP tool call over HTTP (calculate_nutrition)", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-session-id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "calculate_nutrition",
          arguments: {
            goal: "cut",
            weightKg: 80,
            activityLevel: "moderate",
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain("proteinGrams");
    expect(text).toContain("targetCalories");
  });

  it("closes the MCP session via DELETE", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "DELETE",
      headers: {
        "mcp-session-id": sessionId,
      },
    });

    const res = await DELETE(req);
    expect(res.status).toBeLessThan(300);
  });
});

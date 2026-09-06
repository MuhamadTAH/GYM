import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/mcp/server";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SessionEntry {
  server: Server;
  transport: WebStandardStreamableHTTPServerTransport;
  lastActive: number;
}

// In-memory session store for remote MCP clients (Gemini, Claude, LibreChat, etc.)
const sessions = new Map<string, SessionEntry>();

// Evict sessions older than 30 minutes
function pruneOldSessions() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;
  for (const [id, entry] of sessions.entries()) {
    if (now - entry.lastActive > maxAge) {
      sessions.delete(id);
    }
  }
}

async function getOrCreateSession(request: Request): Promise<SessionEntry> {
  pruneOldSessions();

  const requestedSessionId = request.headers.get("mcp-session-id");
  if (requestedSessionId && sessions.has(requestedSessionId)) {
    const entry = sessions.get(requestedSessionId)!;
    entry.lastActive = Date.now();
    return entry;
  }

  const newSessionId = crypto.randomUUID();
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => newSessionId,
    onsessionclosed: (sid) => {
      sessions.delete(sid);
    },
  });

  await server.connect(transport);

  const entry: SessionEntry = {
    server,
    transport,
    lastActive: Date.now(),
  };

  sessions.set(newSessionId, entry);
  return entry;
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, mcp-session-id, Last-Event-ID, authorization"
  );
  headers.set("Access-Control-Expose-Headers", "mcp-session-id");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export async function OPTIONS() {
  return withCors(new Response(null, { status: 204 }));
}

export async function GET(request: Request) {
  const accept = request.headers.get("accept") || "";

  // If opened directly in browser or health checked, return JSON info
  if (!accept.includes("text/event-stream")) {
    return withCors(
      Response.json({
        name: "gym-engine",
        status: "online",
        transport: "StreamableHTTP / SSE",
        endpoint: "/api/mcp",
        protocolVersion: "2024-11-05",
        description: "Gym Autoregulated S&C Coach Model Context Protocol (MCP) Server",
        capabilities: {
          resources: [
            "gym://profile",
            "gym://session/active",
            "gym://mesocycle/summary",
            "gym://history/recent",
            "gym://chat/pending",
          ],
          tools: [
            "log_workout_set",
            "get_active_workout",
            "calculate_nutrition",
            "trigger_safety_abort",
            "generate_mesocycle",
            "swap_workout_order",
            "reply_to_chat_message",
          ],
        },
      })
    );
  }

  // Handle SSE stream initialization
  const session = await getOrCreateSession(request);
  const response = await session.transport.handleRequest(request);
  return withCors(response);
}

export async function POST(request: Request) {
  const session = await getOrCreateSession(request);
  const response = await session.transport.handleRequest(request);
  return withCors(response);
}

export async function DELETE(request: Request) {
  const sessionId = request.headers.get("mcp-session-id");
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    const response = await session.transport.handleRequest(request);
    sessions.delete(sessionId);
    return withCors(response);
  }
  return withCors(new Response(null, { status: 204 }));
}

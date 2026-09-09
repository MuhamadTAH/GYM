import { createMcpServer } from "@/mcp/server";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, mcp-session-id, Last-Event-ID, authorization, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

interface McpSession {
  sessionId: string;
  transport: Transport;
  sseWriter: WritableStreamDefaultWriter<Uint8Array> | null;
  encoder: TextEncoder;
  lastActive: number;
  pendingResolvers: Map<string | number, (res: JSONRPCMessage) => void>;
  cleanup: () => void;
}

const sessions = new Map<string, McpSession>();

// Cleanup inactive sessions (> 30 mins)
function pruneSessions() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActive > 30 * 60 * 1000) {
      s.cleanup();
      sessions.delete(id);
    }
  }
}

async function createSession(sessionId: string): Promise<McpSession> {
  pruneSessions();

  const encoder = new TextEncoder();
  const pendingResolvers = new Map<string | number, (res: JSONRPCMessage) => void>();

  const session: McpSession = {
    sessionId,
    transport: null as any,
    sseWriter: null,
    encoder,
    lastActive: Date.now(),
    pendingResolvers,
    cleanup: () => {},
  };

  const transport: Transport = {
    start: async () => {},
    close: async () => {
      if (transport.onclose) transport.onclose();
    },
    send: async (msg: JSONRPCMessage) => {
      // 1. If SSE client is connected, broadcast message event
      if (session.sseWriter) {
        try {
          const sseFormatted = `event: message\ndata: ${JSON.stringify(msg)}\n\n`;
          session.sseWriter.write(encoder.encode(sseFormatted)).catch(() => {
            session.sseWriter = null;
          });
        } catch (err) {
          console.error("[MCP:SSE] Error writing to stream:", err);
        }
      }

      // 2. Resolve pending POST promise if client is awaiting response
      const id = (msg as { id?: string | number }).id;
      if (id !== undefined && pendingResolvers.has(id)) {
        const resolve = pendingResolvers.get(id)!;
        pendingResolvers.delete(id);
        resolve(msg);
      }
    },
    onmessage: undefined,
    onclose: undefined,
  };

  session.transport = transport;

  session.cleanup = () => {
    if (session.sseWriter) {
      try {
        session.sseWriter.close();
      } catch {}
      session.sseWriter = null;
    }
    sessions.delete(sessionId);
  };

  const server = createMcpServer();
  await server.connect(transport);

  sessions.set(sessionId, session);
  return session;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  const accept = request.headers.get("accept") || "";

  // If opened in browser without text/event-stream, return server health check
  if (!accept.includes("text/event-stream")) {
    return Response.json(
      {
        name: "gym-engine",
        status: "online",
        transport: "SSE / StreamableHTTP",
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
            "gym://goals",
          ],
          tools: [
            "log_workout_set",
            "get_active_workout",
            "calculate_nutrition",
            "trigger_safety_abort",
            "generate_mesocycle",
            "swap_workout_order",
            "get_pending_chat_messages",
            "post_chat_reply",
            "get_daily_goals",
            "update_daily_goals",
            "get_training_plans",
            "update_training_plans",
            "get_recommended_plans",
          ],
        },
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  // Handle SSE Connection Handshake
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") || crypto.randomUUID();

  // Create or reuse session
  let session = sessions.get(sessionId);
  if (!session) {
    session = await createSession(sessionId);
  }

  const stream = new TransformStream();
  const forwardWriter = stream.writable.getWriter();
  const encoder = new TextEncoder();
  session.sseWriter = forwardWriter;

  // Initial endpoint event with public absolute URL
  const forwardedHost = request.headers.get("x-forwarded-host");
  const publicDomain =
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    (forwardedHost && !forwardedHost.includes("0.0.0.0") ? forwardedHost : null) ||
    url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (publicDomain.includes("localhost") ? "http" : "https");
  const endpointUrl = `${proto}://${publicDomain}/api/mcp?sessionId=${sessionId}`;
  const handshake = `event: endpoint\ndata: ${endpointUrl}\n\n`;
  forwardWriter.write(encoder.encode(handshake)).catch(() => {});

  const pingTimer = setInterval(() => {
    forwardWriter.write(encoder.encode(": keepalive\n\n")).catch(() => {
      clearInterval(pingTimer);
      if (session?.sseWriter === forwardWriter) {
        session.sseWriter = null;
      }
    });
  }, 15000);

  request.signal.addEventListener("abort", () => {
    clearInterval(pingTimer);
    try {
      forwardWriter.close();
    } catch {}
    if (session?.sseWriter === forwardWriter) {
      session.sseWriter = null;
    }
  });

  return new Response(stream.readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "mcp-session-id": sessionId,
      ...corsHeaders,
    },
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const sessionId =
    request.headers.get("mcp-session-id") ||
    url.searchParams.get("sessionId") ||
    "default-session";

  let session = sessions.get(sessionId);
  if (!session) {
    session = await createSession(sessionId);
  }

  session.lastActive = Date.now();

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: corsHeaders }
    );
  }

  const messages: JSONRPCMessage[] = Array.isArray(body) ? body : [body];

  // If client wants direct JSON response (StreamableHTTP):
  const requestId = (messages[0] as { id?: string | number })?.id;

  if (requestId !== undefined && session.transport.onmessage) {
    const responsePromise = new Promise<JSONRPCMessage>((resolve) => {
      session!.pendingResolvers.set(requestId, resolve);
      // Timeout fallback if tool takes longer than 10 seconds
      setTimeout(() => {
        if (session!.pendingResolvers.has(requestId)) {
          session!.pendingResolvers.delete(requestId);
          resolve({
            jsonrpc: "2.0",
            id: requestId,
            error: { code: -32000, message: "Request timed out" },
          } as any);
        }
      }, 10000);
    });

    for (const msg of messages) {
      session.transport.onmessage(msg);
    }

    const result = await responsePromise;
    return Response.json(result, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": sessionId,
        ...corsHeaders,
      },
    });
  }

  // Otherwise handle message and return 202 Accepted
  if (session.transport.onmessage) {
    for (const msg of messages) {
      session.transport.onmessage(msg);
    }
  }

  return new Response(null, {
    status: 202,
    headers: {
      "mcp-session-id": sessionId,
      ...corsHeaders,
    },
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const sessionId =
    request.headers.get("mcp-session-id") || url.searchParams.get("sessionId");

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.cleanup();
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

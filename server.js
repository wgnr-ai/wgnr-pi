/**
 * wgnr-pi — A dual-engine web UI for Pi Coding Agent
 *
 * Spawns `pi --mode rpc` as a subprocess and bridges JSON-RPC
 * to browser clients over WebSocket.
 *
 * Also provides a kelle.ai tab for free AI chat powered by kelle.ai.
 *
 * Usage:
 *   node server.js
 *   WGPI_PORT=8080 WGPI_CWD=/path node server.js
 *
 * Environment variables:
 *   WGPI_PORT        Server port (default: 4815)
 *   WGPI_HOST        Bind host (default: 0.0.0.0)
 *   WGPI_CWD         Working directory for pi (default: $HOME)
 *   WGPI_PI_BIN      Path to pi binary (default: "pi")
 *   WGPI_KELLE_URL   kelle.ai base URL (default: https://agents.kelle.ai)
 *   WGPI_KELLE_API_KEY  kelle.ai API key (optional, for Phase 2)
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer } from "ws";

// ── Config ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.WGPI_PORT || "4815", 10);
const HOST = process.env.WGPI_HOST || "0.0.0.0";
const CWD = process.env.WGPI_CWD || process.env.HOME;
const PI_BIN = process.env.WGPI_PI_BIN || "pi";
const __dirname = dirname(fileURLToPath(import.meta.url));

// kelle.ai config (Phase 2 — currently stub)
const KELLE_URL = process.env.WGPI_KELLE_URL || "https://agents.kelle.ai";
const KELLE_API_KEY = process.env.WGPI_KELLE_API_KEY || "";

// ── State ───────────────────────────────────────────────────────────────
let piProc = null;
let requestId = 0;
const pendingRequests = new Map();
let lineBuffer = "";
const clients = new Set();
let busy = false;
let cachedCommands = [];
let currentSessionFile = null;
let currentSessionId = null;
let historyLoadPending = false;
let currentModel = null;
let currentThinkingLevel = "medium";

// ── Session utilities ────────────────────────────────────────────────────
function parseSessions() {
  const homeDir = process.env.HOME || "";
  const sessionBaseDir = join(homeDir, ".pi", "agent", "sessions");
  const cwdKey = "--" + CWD.replace(/^\//, "").replace(/\//g, "-") + "--";
  const sessionDir = join(sessionBaseDir, cwdKey);

  if (!existsSync(sessionDir)) return [];

  const files = readdirSync(sessionDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => join(sessionDir, f));

  const sessions = [];
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      const lines = content.trim().split("\n").filter((l) => l.trim());

      let header = null;
      let name = null;
      let firstUserMessage = null;
      let messageCount = 0;
      let lastTimestamp = null;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === "session") {
            header = entry;
          } else if (entry.type === "session_info" && entry.name) {
            name = entry.name;
          } else if (entry.type === "message") {
            if (entry.message?.role === "user") {
              if (!firstUserMessage) {
                const c = entry.message.content;
                if (typeof c === "string") firstUserMessage = c.slice(0, 80);
                else if (Array.isArray(c)) {
                  const t = c.find((b) => b.type === "text");
                  if (t) firstUserMessage = t.text.slice(0, 80);
                }
              }
              messageCount++;
            } else if (entry.message?.role === "assistant") {
              messageCount++;
            }
            if (entry.timestamp) lastTimestamp = entry.timestamp;
          }
        } catch {}
      }

      if (!header) continue;

      sessions.push({
        id: header.id,
        file,
        cwd: header.cwd || CWD,
        timestamp: header.timestamp,
        lastTimestamp: lastTimestamp || header.timestamp,
        name,
        preview: name || firstUserMessage || "New session",
        messageCount,
      });
    } catch {}
  }

  sessions.sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
  return sessions;
}

// ── Express ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.sendFile(join(__dirname, "public", "index.html"));
});

// Serve bundled JS libs
app.get("/lib/marked.umd.js", (_req, res) => res.sendFile(join(__dirname, "node_modules/marked/lib/marked.umd.js")));
app.get("/lib/purify.js", (_req, res) => res.sendFile(join(__dirname, "node_modules/dompurify/dist/purify.js")));

app.get("/favicon.ico", (_req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="24" font-size="24" fill="#6EA8DB">π</text></svg>`);
});

app.get("/manifest.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({
    name: "π · wgnr.ai",
    short_name: "wgnr-pi",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a2e",
    theme_color: "#6EA8DB",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/svg+xml" }],
  });
});

// kelle.ai availability check (Phase 2 stub)
app.get("/api/kelle/status", async (_req, res) => {
  if (!KELLE_API_KEY) {
    return res.json({ available: false, configured: false, message: "kelle.ai integration coming soon!" });
  }
  try {
    const r = await fetch(`${KELLE_URL}/wp-json/mwai/v1/listChatbots`, {
      headers: KELLE_API_KEY ? { "Authorization": `Bearer ${KELLE_API_KEY}` } : {},
      signal: AbortSignal.timeout(3000),
    });
    res.json({ available: r.ok, configured: true });
  } catch {
    res.json({ available: false, configured: !!KELLE_API_KEY });
  }
});

// Session list REST endpoint
app.get("/api/sessions", (_req, res) => {
  try {
    res.json({ sessions: parseSessions(), currentFile: currentSessionFile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List archived sessions
app.get("/api/sessions/archived", (_req, res) => {
  try {
    const sessionBaseDir = join(process.env.HOME || "", ".pi", "agent", "sessions");
    const cwdKey = "--" + CWD.replace(/^\//, "").replace(/\//g, "-") + "--";
    const archiveDir = join(sessionBaseDir, cwdKey, "archived");
    if (!existsSync(archiveDir)) return res.json({ sessions: [] });
    const files = readdirSync(archiveDir).filter(f => f.endsWith(".jsonl")).map(f => join(archiveDir, f));
    const sessions = [];
    for (const file of files) {
      try {
        const lines = readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
        let header = null, name = null, firstUserMessage = null, lastTimestamp = null;
        for (const line of lines) {
          try {
            const e = JSON.parse(line);
            if (e.type === "session") header = e;
            else if (e.type === "session_info" && e.name) name = e.name;
            else if (e.type === "message" && e.message?.role === "user" && !firstUserMessage) {
              const c = e.message.content;
              firstUserMessage = typeof c === "string" ? c.slice(0,80) : (Array.isArray(c) ? (c.find(b=>b.type==="text")?.text||"").slice(0,80) : "");
            }
            if (e.timestamp) lastTimestamp = e.timestamp;
          } catch {}
        }
        if (!header) continue;
        sessions.push({ id: header.id, file, timestamp: header.timestamp, lastTimestamp: lastTimestamp || header.timestamp, name, preview: name || firstUserMessage || "Archived session" });
      } catch {}
    }
    sessions.sort((a,b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp));
    res.json({ sessions });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Restore archived session
app.post("/api/sessions/restore", (req, res) => {
  const { file } = req.body || {};
  if (!file || !file.endsWith(".jsonl")) return res.status(400).json({ error: "Invalid file" });
  const sessionBaseDir = join(process.env.HOME || "", ".pi", "agent", "sessions");
  if (!file.startsWith(sessionBaseDir)) return res.status(403).json({ error: "Forbidden" });
  try {
    const dest = join(dirname(file), "..", basename(file));
    renameSync(file, dest);
    res.json({ ok: true, restoredTo: dest });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Archive session
app.post("/api/sessions/archive", (req, res) => {
  const { file } = req.body || {};
  if (!file || !file.endsWith(".jsonl")) return res.status(400).json({ error: "Invalid file" });
  const sessionBaseDir = join(process.env.HOME || "", ".pi", "agent", "sessions");
  if (!file.startsWith(sessionBaseDir)) return res.status(403).json({ error: "Forbidden" });
  try {
    const archiveDir = join(dirname(file), "archived");
    if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
    const dest = join(archiveDir, basename(file));
    renameSync(file, dest);
    res.json({ ok: true, archivedTo: dest });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete session permanently
app.delete("/api/sessions", (req, res) => {
  const { file } = req.body || {};
  if (!file || !file.endsWith(".jsonl")) return res.status(400).json({ error: "Invalid file" });
  const sessionBaseDir = join(process.env.HOME || "", ".pi", "agent", "sessions");
  if (!file.startsWith(sessionBaseDir)) return res.status(403).json({ error: "Forbidden" });
  try {
    unlinkSync(file);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`✓ wgnr-pi http://${HOST}:${PORT}`);
  console.log(`  CWD:   ${CWD}`);
  console.log(`  Pi:    ${PI_BIN}`);
  console.log(`  Docs:  https://github.com/wgnr-ai/wgnr-pi`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('   Make sure no other instance of wgnr-pi is running.');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// ── WebSocket ───────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: "status", busy, connected: true }));
  if (cachedCommands.length > 0) {
    ws.send(JSON.stringify({ type: "commands", commands: cachedCommands }));
  }
  if (currentSessionFile || currentModel) {
    ws.send(JSON.stringify({
      type: "session_state",
      sessionFile: currentSessionFile,
      sessionId: currentSessionId,
      model: currentModel,
      thinkingLevel: currentThinkingLevel,
    }));
  }
  console.log(`↔ client connected (${clients.size})`);

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleClientMessage(ws, msg);
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`↔ client disconnected (${clients.size})`);
  });
});

function broadcast(data) {
  const s = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(s);
  }
}

// ── Client message handler ─────────────────────────────────────────────
async function handleClientMessage(ws, msg) {
  switch (msg.type) {
    case "prompt":
      if (!msg.text?.trim()) return;
      if (busy) {
        ws.send(JSON.stringify({ type: "error", message: "Agent is busy. Wait or press Stop." }));
        return;
      }
      busy = true;
      broadcast({ type: "status", busy: true });
      broadcast({ type: "agent_start" });
      ensurePi();
      const promptParams = { message: msg.text };
      if (msg.images?.length) promptParams.images = msg.images;
      sendRpc("prompt", promptParams);
      break;

    case "abort":
      ensurePi();
      sendRpc("abort", {});
      busy = false;
      broadcast({ type: "status", busy: false, aborted: true });
      broadcast({ type: "agent_end" });
      break;

    case "new_session":
      ensurePi();
      sendRpc("new_session", {});
      busy = false;
      broadcast({ type: "status", busy: false });
      broadcast({ type: "session_reset" });
      setTimeout(() => {
        sendRpc("get_commands", {});
        sendRpc("get_state", {});
      }, 500);
      break;

    case "switch_session":
      if (!msg.sessionPath) return;
      if (busy) {
        ws.send(JSON.stringify({ type: "error", message: "Agent is busy. Stop before switching sessions." }));
        return;
      }
      ensurePi();
      pendingRequests.set("switch_session_path", msg.sessionPath);
      sendRpc("switch_session", { sessionPath: msg.sessionPath });
      break;

    case "set_session_name":
      if (typeof msg.name !== "string") return;
      ensurePi();
      sendRpc("set_session_name", { name: msg.name });
      break;

    case "set_model":
      if (!msg.provider || !msg.modelId) return;
      ensurePi();
      sendRpc("set_model", { provider: msg.provider, modelId: msg.modelId });
      break;
    case "cycle_model":
      ensurePi(); sendRpc("cycle_model", {}); break;
    case "set_thinking_level":
      if (!msg.level) return;
      ensurePi(); sendRpc("set_thinking_level", { level: msg.level }); break;
    case "cycle_thinking_level":
      ensurePi(); sendRpc("cycle_thinking_level", {}); break;
    case "get_stats":
      ensurePi(); sendRpc("get_session_stats", {}); break;
    case "get_models":
      ensurePi(); sendRpc("get_available_models", {}); break;
    case "export_request":
      ensurePi();
      sendRpc("get_messages", {});
      pendingRequests.set("export", {
        resolve: (messages) => {
          broadcast({ type: "export_response", session: { messages, exportedAt: new Date().toISOString(), cwd: CWD } });
        },
      });
      break;
  }
}

// ── Pi RPC subprocess ──────────────────────────────────────────────────
function ensurePi() {
  if (piProc && !piProc.killed) return;

  console.log(`→ spawning ${PI_BIN} --mode rpc`);
  piProc = spawn(PI_BIN, ["--mode", "rpc"], {
    cwd: CWD,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  console.log(`  pi PID: ${piProc.pid}`);

  piProc.stdout.on("data", (chunk) => {
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        handleRpcEvent(data);
      } catch (e) {
        console.log("  pi stdout:", line.substring(0, 120));
      }
    }
  });

  piProc.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.log("  pi stderr:", text.substring(0, 200));
  });

  piProc.on("error", (err) => {
    console.error("  pi spawn error:", err.message);
  });

  piProc.stdout.on("end", () => {
    console.log("  [DEBUG] pi stdout ended");
  });

  piProc.stdin.on("error", (err) => {
    console.error("  [DEBUG] pi stdin error:", err.message);
  });

  // Request initial state once pi is ready
  setTimeout(() => {
    if (piProc && !piProc.killed) {
      console.log("  requesting initial state from pi...");
      sendRpc("get_commands", {});
      sendRpc("get_state", {});
      sendRpc("get_available_models", {});
    }
  }, 1500);

  piProc.on("close", (code, signal) => {
    console.log(`→ pi exited (code ${code}, signal ${signal})`);
    piProc = null;
    busy = false;
    broadcast({ type: "status", busy: false, connected: false });
    setTimeout(() => { if (!piProc) ensurePi(); }, 3000);
  });
}

function sendRpc(command, params) {
  if (!piProc || piProc.killed) return;
  const id = `${++requestId}`;
  const msg = JSON.stringify({ id, type: command, ...params }) + "\n";
  piProc.stdin.write(msg);
}

function handleRpcEvent(data) {
  // RPC responses (have id)
  if (data.id) {
    if (data.type === "response") {
      if (data.command === "prompt" && !data.success) {
        broadcast({ type: "error", message: data.error || "Prompt failed" });
        busy = false;
        broadcast({ type: "status", busy: false });
      }

      if (data.command === "get_messages" && data.success && data.data?.messages) {
        if (historyLoadPending) {
          historyLoadPending = false;
          broadcast({ type: "history", messages: data.data.messages });
        }
        const pending = pendingRequests.get("export");
        if (pending) {
          pending.resolve(data.data.messages);
          pendingRequests.delete("export");
        }
      }

      if (data.command === "get_commands" && data.success && data.data?.commands) {
        cachedCommands = data.data.commands;
        broadcast({ type: "commands", commands: cachedCommands });
      }

      if (data.command === "get_state" && data.success && data.data) {
        currentSessionFile = data.data.sessionFile || null;
        currentSessionId = data.data.sessionId || null;
        currentModel = data.data.model || currentModel;
        currentThinkingLevel = data.data.thinkingLevel || currentThinkingLevel;
        broadcast({
          type: "session_state",
          sessionFile: currentSessionFile,
          sessionId: currentSessionId,
          sessionName: data.data.sessionName,
          model: currentModel,
          thinkingLevel: currentThinkingLevel,
        });
      }

      if (data.command === "set_model" && data.success) {
        sendRpc("get_state", {});
      }
      if (data.command === "cycle_model" && data.success && data.data?.model) {
        currentModel = data.data.model;
        broadcast({ type: "model_state", model: currentModel, thinkingLevel: currentThinkingLevel });
      }
      if (data.command === "set_thinking_level" && data.success) {
        sendRpc("get_state", {});
      }
      if (data.command === "cycle_thinking_level" && data.success && data.data?.level) {
        currentThinkingLevel = data.data.level;
        broadcast({ type: "model_state", model: currentModel, thinkingLevel: currentThinkingLevel });
      }
      if (data.command === "get_session_stats" && data.success && data.data) {
        broadcast({ type: "session_stats", stats: data.data });
      }
      if (data.command === "get_available_models" && data.success && data.data?.models) {
        broadcast({ type: "available_models", models: data.data.models });
      }

      if (data.command === "switch_session" && data.success && !data.data?.cancelled) {
        historyLoadPending = true;
        sendRpc("get_messages", {});
        sendRpc("get_state", {});
        broadcast({ type: "session_switched" });
        pendingRequests.delete("switch_session_path");
      }
    }
    return;
  }

  // RPC events (no id)
  switch (data.type) {
    case "agent_start":
      broadcast(data);
      break;

    case "agent_end":
      busy = false;
      broadcast({ type: "status", busy: false });
      broadcast(data);
      sendRpc("get_state", {});
      sendRpc("get_session_stats", {});
      break;

    case "message_start":
    case "message_update":
    case "message_end":
      broadcast(data);
      break;

    case "turn_start":
    case "turn_end":
      broadcast(data);
      break;

    case "tool_execution_start":
    case "tool_execution_update":
    case "tool_execution_end":
      broadcast(data);
      break;

    case "compaction_start":
    case "compaction_end":
      broadcast(data);
      break;

    default:
      broadcast(data);
  }
}

// ── Graceful shutdown ───────────────────────────────────────────────────
function shutdown() {
  console.log("→ shutting down");
  if (piProc && !piProc.killed) piProc.kill("SIGTERM");
  wss.close();
  server.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ── Boot ────────────────────────────────────────────────────────────────
ensurePi();

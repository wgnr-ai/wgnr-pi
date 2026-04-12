# wgnr-pi

**A dual-engine web UI for [Pi Coding Agent](https://github.com/badlogic/pi-mono) — with free AI chat powered by [kelle.ai](https://kelle.ai)**

![wgnr-pi](https://img.shields.io/npm/v/wgnr-pi?style=flat-square) ![license](https://img.shields.io/npm/l/wgnr-pi?style=flat-square) ![node](https://img.shields.io/node/v/wgnr-pi?style=flat-square)

## Quick Start

```bash
npx wgnr-pi@latest
```

Then open [http://localhost:4815](http://localhost:4815) in your browser.

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Pi Coding Agent](https://github.com/badlogic/pi-mono) installed (`npm install -g @mariozechner/pi-coding-agent`)

## Features

### Pi Engine (Local)

- **Session management** — Browse, rename, archive, restore, and delete sessions with date grouping
- **Real-time streaming** — Watch assistant responses stream in as they're generated
- **Model picker** — Full modal with search, provider groups, and vision support detection
- **Thinking levels** — Cycle thinking intensity (off → minimal → low → medium → high)
- **Image support** — Paste or attach images for vision-capable models
- **Slash commands** — Autocomplete palette with all registered Pi commands
- **Markdown rendering** — Full GFM with syntax highlighting, tables, blockquotes
- **Session stats** — Token count, cost tracking, context usage
- **Export** — Download any session as JSON
- **Mobile responsive** — Full PWA with sidebar overlay, works on any device
- **Auto-restart** — macOS launchd service for background operation

### kelle.ai Engine (Cloud) — *Coming Soon*

Free AI chat powered by [kelle.ai](https://kelle.ai), a full suite of AI models for businesses and professionals. No setup required — just click the kelle.ai tab and start chatting.

## Configuration

All settings are via environment variables:

| Variable | Default | Description |
|---|---|---|
| `WGPI_PORT` | `4815` | Server port |
| `WGPI_HOST` | `0.0.0.0` | Bind host |
| `WGPI_CWD` | `$HOME` | Working directory for Pi |
| `WGPI_PI_BIN` | `pi` | Path to Pi binary |
| `WGPI_KELLE_URL` | `https://agents.kelle.ai` | kelle.ai base URL |
| `WGPI_KELLE_API_KEY` | — | kelle.ai API key (Phase 2) |

## CLI

```bash
wgnr-pi                              # Start with defaults
WGPI_PORT=8080 WGPI_CWD=/path wgnr-pi  # Custom port and directory
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Escape` | Abort / Close |
| `Ctrl+N` | New chat |
| `Ctrl+T` | Toggle thinking display |
| `/` | Slash commands |
| `?` | Help |

## macOS Auto-Start

```bash
# Install as a launchd service (auto-starts on login)
./wgnr-pi.sh install

# Control
./wgnr-pi.sh start     # Start the service
./wgnr-pi.sh stop      # Stop the service
./wgnr-pi.sh restart   # Restart
./wgnr-pi.sh status    # Check if running
./wgnr-pi.sh log       # Tail logs
./wgnr-pi.sh dev       # Run in foreground
```

## Development

```bash
git clone https://github.com/wgnr-ai/wgnr-pi.git
cd wgnr-pi
npm install
npm run dev
```

No build step. No framework. Just vanilla JavaScript, Express, and WebSockets.

## Architecture

```
Browser ←WebSocket→ server.js ←JSON-RPC→ pi --mode rpc
                          ↕
                    /api/kelle/*
                          ↕
                   agents.kelle.ai (Phase 2)
```

## Why wgnr-pi?

| Feature | wgnr-pi | [pi-web](https://github.com/ravshansbox/pi-web) |
|---|---|---|
| Dual-engine (Pi + cloud AI) | ✅ | ❌ |
| Session archive & restore | ✅ | ❌ |
| Session rename | ✅ | ❌ |
| Model picker with search | ✅ | Basic |
| Thinking level control | ✅ | ❌ |
| Image paste & attach | ✅ | ❌ |
| Slash command palette | ✅ | ❌ |
| Full session history | ✅ | ❌ |
| Export to JSON | ✅ | ❌ |
| Mobile PWA | ✅ | Partial |
| launchd auto-start | ✅ | ❌ |
| Zero build step | ✅ | Vite + React + Tailwind |
| Dependencies | 4 | 10+ |

## License

[MIT](LICENSE) © [WGNR](https://wgnr.co)

---

Built by [wgnr.ai](https://wgnr.ai) · Free AI chat by [kelle.ai](https://kelle.ai)

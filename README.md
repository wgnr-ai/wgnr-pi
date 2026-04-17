# wgnr-pi

**The most feature-rich web UI for [Pi Coding Agent](https://github.com/badlogic/pi-mono).**

A polished, zero-framework web interface for interacting with Pi — the open-source AI coding agent. Built with vanilla JavaScript, Express, and WebSocket for real-time streaming responses.

> Open-source web UI for [Pi Coding Agent](https://github.com/badlogic/pi-mono) · [wgnr.ai](https://wgnr.ai)

---

## Features

- **Real-time streaming** — Watch AI responses stream in token by token via WebSocket
- **Session management** — List, rename, archive, and restore sessions with date grouping
- **Model picker** — Full modal with search, provider groups, and keyboard navigation
- **Thinking levels** — Cycle through off → minimal → low → medium → high with a UI badge
- **Image support** — Paste or attach images for vision-capable models
- **Command palette** — Slash commands with autocomplete (type `/`)
- **Session persistence** — History reloads automatically on reconnect
- **Pi health monitoring** — Connection status with auto-reconnect
- **Export sessions** — Download any session as markdown
- **Keyboard shortcuts** — Ctrl+N (new chat), Ctrl+L (clear), Escape (stop)
- **macOS launchd** — Auto-start on boot via included service template
- **Zero dependencies** — No React, no Vite, no build step. Just Node.js

## Quick Start

```bash
# Install globally
npm install -g wgnr-pi

# Run (starts on port 4815)
wgnr-pi

# Or run directly
npx wgnr-pi
```

Open [http://localhost:4815](http://localhost:4815) in your browser.

## Configuration

All settings are configurable via environment variables:

| Variable | Default | Description |
|---|---|---|
| `WGPI_PORT` | `4815` | Server port |
| `WGPI_HOST` | `0.0.0.0` | Server bind address |
| `WGPI_CWD` | `~` | Working directory for Pi |
| `WGPI_PI_BIN` | `pi` | Path to Pi binary |

Example:

```bash
WGPI_PORT=8080 WGPI_CWD=/projects/my-app wgnr-pi
```

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Pi Coding Agent](https://github.com/badlogic/pi-mono) (`npm install -g @mariozechner/pi-coding-agent`)

## How It Works

```
Browser ←→ WebSocket ←→ wgnr-pi (Express) ←→ Pi (RPC mode)
```

wgnr-pi spawns Pi as a subprocess in RPC mode and communicates via stdin/stdout JSON. The browser connects via WebSocket for real-time bidirectional messaging. No API keys needed — Pi uses your local configuration.

## Comparison

| Feature | ravshansbox/pi-web | **wgnr-pi** |
|---|---|---|
| Stack | React, Vite, Tailwind | **Vanilla JS, Express** |
| Dependencies | React + 40+ deps | **Zero frameworks** |
| Session management | List, delete | **List, rename, archive, restore** |
| Model picker | Status bar switch | **Full modal with search** |
| Thinking levels | No | **Yes — 5 levels with badge** |
| Image support | Unknown | **Paste, attach, vision** |
| Command palette | No | **Slash commands + autocomplete** |
| Session history | Browse past | **Browse + load full history** |
| Export sessions | No | **Markdown export** |
| Health monitoring | No | **Connection status + auto-reconnect** |
| macOS service | No | **launchd template included** |
| Install size | ~15MB | **~200KB** |

## Development

```bash
git clone https://github.com/wgnr-ai/wgnr-pi.git
cd wgnr-pi
npm install
node server.js
```

## License

[MIT](LICENSE)

## Credits

Built by [WGNR](https://wgnr.co). Looking for AI-powered business assistance? Try [wgnr.ai](https://wgnr.ai).

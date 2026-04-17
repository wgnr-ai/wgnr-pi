# wgnr-pi Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2026-04-15

### Added
- ROADMAP.md with v1–v3 feature plan
- README.md with full feature comparison, quickstart, and credits

### Changed
- Toolbar buttons now use plain text labels (Clear, Help, Export Session, Stop)
- Disconnected banner button changed from "Restart now" to "Refresh page"

### Removed
- All kelle.ai integration (tab, proxy, squad buttons, assets) — moved to v2.0 roadmap
- Restart button removed — server auto-recovers Pi on crash
- Mode toggle (π pi / kelle.ai) removed — single-mode Pi UI

---

## [1.3.0] - 2026-04-12

### Added
- kelle.ai Business Squad integration (later removed in v1.4.0)

---

## [1.2.3] - 2026-04-12

### Fixed
- Chat history loads on page refresh and reconnect
- Clicking active session reloads its messages

---

## [1.2.2] - 2026-04-12

### Fixed
- Unified "New chat" button position and style across tabs

---

## [1.2.1] - 2026-04-12

### Fixed
- Session state saved to localStorage — survives page refresh
- Sidebar auto-scrolls to active session

---

## [1.2.0] - 2026-04-12

### Added
- Pi connection health monitoring with visual banner
- Automatic reconnect when Pi subprocess dies
- Periodic heartbeat check (every 10 seconds)

---

## [1.1.0] - 2026-04-12

### Added
- Restart and Clear buttons with keyboard shortcuts
- Markdown links open in new browser tabs
- WebSocket reconnect reloads session history

---

## [1.0.0] - 2026-04-12

### Added
- Initial release
- Pi RPC bridge with real-time streaming via WebSocket
- Session management: list, rename, archive, restore, date grouping
- Model picker with search and provider groups
- Thinking level cycling (off → minimal → low → medium → high)
- Image support: paste or attach for vision-capable models
- Slash command autocomplete palette
- Markdown rendering (GFM + DOMPurify)
- Session stats bar (tokens, cost, context usage)
- Session export to JSON download
- macOS launchd auto-start service
- Configurable via `WGPI_*` environment variables
- Zero build step, zero frameworks
- MIT license

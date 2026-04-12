# wgnr-pi Changelog (Public)

All notable changes to the public open-source release.

## [1.2.0] - 2026-04-12

### Added
- Pi connection health monitoring with visual banner
- "⚠ Pi disconnected" banner with countdown and ↻ Restart button
- Automatic reconnect attempt when Pi subprocess dies
- Periodic heartbeat check (every 10 seconds)
- Input disables with "Disconnected" label when Pi is unreachable
- Spawn errors now shown to user instead of failing silently

---

## [1.1.0] - 2026-04-12

### Added
- ↻ Restart button — kills and respawns Pi subprocess via `/api/restart` endpoint
- ✕ Clear button — clears visible chat without losing session history
- Keyboard shortcuts: `Ctrl+R` (restart), `Ctrl+L` (clear)
- All markdown links now open in new browser tab (`target="_blank"`)
- WebSocket reconnect now reloads session history automatically

### Changed
- Help modal updated with new keyboard shortcuts

---

## [1.0.0] - 2026-04-12

### Added
- Initial public release
- Pi RPC bridge with real-time streaming via WebSocket
- Session management: list, rename, archive, restore, delete with date grouping
- Model picker with search, provider groups, vision support detection
- Thinking level cycling (off → minimal → low → medium → high)
- Image support: paste from clipboard or click to attach
- Slash command autocomplete palette
- Markdown rendering (GFM + DOMPurify)
- Session stats bar (tokens, cost, context usage)
- Session export to JSON download
- Mobile-responsive PWA with sidebar overlay
- macOS launchd auto-start service (`wgnr-pi.sh`)
- kelle.ai stub tab (Phase 2 integration coming soon)
- All config via `WGPI_*` environment variables (no hardcoded paths)
- Zero build step, 4 runtime dependencies (express, ws, marked, dompurify)
- MIT license, published as `wgnr-pi` on npm

### Removed
- Agent Zero integration (private only — not in public release)

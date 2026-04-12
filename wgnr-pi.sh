#!/bin/bash
# wgnr-pi control script
# Usage: wgnr-pi.sh [start|stop|restart|status|log|install|dev]

PLIST="com.wgnr.wgnr-pi"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST}.plist"
LOG="$HOME/Library/Logs/wgnr-pi.log"
ERR="$HOME/Library/Logs/wgnr-pi.err"
PORT="${WGPI_PORT:-4815}"

# Resolve the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

case "${1:-start}" in
  install|start)
    echo "→ Installing launchd service…"
    # Generate the plist
    cat > "$PLIST_PATH" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>${SCRIPT_DIR}/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${SCRIPT_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG}</string>
  <key>StandardErrorPath</key>
  <string>${ERR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>WGPI_PORT</key>
    <string>${PORT}</string>
  </dict>
</dict>
</plist>
PLISTEOF
    launchctl bootout gui/$(id -u) "$PLIST_PATH" 2>/dev/null
    launchctl bootstrap gui/$(id -u) "$PLIST_PATH"
    echo "✓ wgnr-pi will auto-start on login"
    echo "  URL: http://localhost:$PORT"
    echo "  Log: $LOG"
    ;;

  stop)
    echo "→ Stopping…"
    launchctl bootout gui/$(id -u) "$PLIST_PATH" 2>/dev/null
    echo "✓ Stopped"
    ;;

  restart)
    $0 stop
    sleep 1
    $0 start
    ;;

  status)
    if launchctl print "gui/$(id -u)/$PLIST" &>/dev/null; then
      echo "✓ wgnr-pi is running"
      echo "  URL: http://localhost:$PORT"
      curl -s -o /dev/null -w "  HTTP: %{http_code}\n" "http://localhost:$PORT" 2>/dev/null || echo "  (not responding yet)"
    else
      echo "✗ wgnr-pi is not running"
    fi
    ;;

  log)
    tail -f "$LOG" "$ERR" 2>/dev/null || echo "No logs yet"
    ;;

  dev)
    # Run in foreground for development
    cd "$SCRIPT_DIR"
    WGPI_PORT=$PORT node server.js
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|log|install|dev}"
    echo ""
    echo "  install  Install and start the launchd service (auto-starts on login)"
    echo "  start    Start the service (alias for install)"
    echo "  stop     Stop and unload the service"
    echo "  restart  Stop then start"
    echo "  status   Check if running"
    echo "  log      Tail the log files"
    echo "  dev      Run in foreground (for development)"
    ;;
esac

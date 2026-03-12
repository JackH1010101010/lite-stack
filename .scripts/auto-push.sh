#!/bin/bash
# auto-push.sh — run by launchd every 5 minutes
# Pushes any unpushed commits in Lite-Stack to origin/main
# Safe: only pushes if commits exist; never force-pushes

REPO="/Users/jackhughes/Lite-Stack"
LOG="$HOME/Library/Logs/litestack-autopush.log"

cd "$REPO" || exit 0

# Check for unpushed commits (silently exit if remote is unreachable)
UNPUSHED=$(git log @{u}.. --oneline 2>/dev/null)

if [ -n "$UNPUSHED" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pushing: $UNPUSHED" >> "$LOG"
  git push origin main >> "$LOG" 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Push complete (exit $?)" >> "$LOG"
fi

#!/bin/bash
#
# Example cron wrapper script for Fronius Solar TRMNL webhook
#
# This script is useful for running from cron as it:
# - Sets up the environment properly
# - Logs output with timestamps
# - Handles errors gracefully
#
# Usage:
# 1. Edit the configuration section below
# 2. Make executable: chmod +x example-cron.sh
# 3. Add to crontab: */10 * * * * /path/to/example-cron.sh
#

# =============================================================================
# CONFIGURATION
# =============================================================================
SCRIPT_DIR="/path/to/trmnl"
LOG_FILE="/var/log/fronius-trmnl.log"
PYTHON_PATH="/usr/bin/python3"
NODE_PATH="/usr/bin/node"

# Choose which script to run (uncomment one):
SCRIPT_TO_RUN="python"  # or "node"
# =============================================================================

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Create log file if it doesn't exist
touch "$LOG_FILE" 2>/dev/null || {
    echo "Warning: Cannot write to $LOG_FILE, using /tmp"
    LOG_FILE="/tmp/fronius-trmnl.log"
    touch "$LOG_FILE"
}

log "Starting Fronius Solar data sync..."

# Change to script directory
cd "$SCRIPT_DIR" || {
    log "ERROR: Cannot change to directory $SCRIPT_DIR"
    exit 1
}

# Run the appropriate script
if [ "$SCRIPT_TO_RUN" = "python" ]; then
    "$PYTHON_PATH" fronius-webhook.py >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?
elif [ "$SCRIPT_TO_RUN" = "node" ]; then
    "$NODE_PATH" fronius-webhook.js >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?
else
    log "ERROR: Invalid SCRIPT_TO_RUN value: $SCRIPT_TO_RUN"
    exit 1
fi

if [ $EXIT_CODE -eq 0 ]; then
    log "Successfully completed sync"
else
    log "ERROR: Script failed with exit code $EXIT_CODE"
fi

# Optional: Rotate log file if it gets too large (> 10MB)
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null)
    if [ "$LOG_SIZE" -gt 10485760 ]; then
        mv "$LOG_FILE" "$LOG_FILE.old"
        log "Rotated log file (was $(($LOG_SIZE / 1024 / 1024))MB)"
    fi
fi

exit $EXIT_CODE

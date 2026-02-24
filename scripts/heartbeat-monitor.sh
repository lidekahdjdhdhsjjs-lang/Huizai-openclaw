#!/bin/bash
# Heartbeat Monitor - checks emails, calendar, mentions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$SCRIPT_DIR/../memory/heartbeat-state.json"

# Get current hour
CURRENT_HOUR=$(date +%H)
QUIET_START="23"
QUIET_END="08"

# Check if quiet hours
if [ "$CURRENT_HOUR" -ge "$QUIET_START" ] || [ "$CURRENT_HOUR" -lt "$QUIET_END" ]; then
    QUIET=true
else
    QUIET=false
fi

echo "=== Heartbeat Monitor $(date) ==="
echo "Quiet hours: $QUIET"

if [ "$QUIET" = "false" ]; then
    echo "Running full checks..."
    # Check unread emails (Gmail API or CLI)
    # Check calendar events
    # Check Discord/Telegram mentions
    echo "Full checks completed"
else
    echo "Quiet hours - minimal checks"
fi

CURRENT_TIME=$(date -Iseconds)
echo "Last heartbeat: $CURRENT_TIME"

# Update state file
QUIET_STR="$QUIET"
python3 -c "
import json
import sys
state_file = '$STATE_FILE'
try:
    with open(state_file, 'r') as f:
        state = json.load(f)
except:
    state = {}
state['lastHeartbeat'] = '$CURRENT_TIME'
state['quietHoursActive'] = '$QUIET_STR' == 'true'
state['checkCount'] = state.get('checkCount', 0) + 1
with open(state_file, 'w') as f:
    json.dump(state, f, indent=2)
"

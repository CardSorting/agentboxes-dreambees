#!/bin/bash
set -euo pipefail

# Start lightweight window manager
xfwm4 --compositor=off >/tmp/window-manager.log 2>&1 &

# Start AgentBoxes desktop shell (GTK3 UI)
python3 /opt/agentbox/agentbox-shell.py >/tmp/desktop-shell.log 2>&1 &

printf '%s' "$DBUS_SESSION_BUS_ADDRESS" > /tmp/desktop-bus
touch /tmp/desktop-ready

# Run x11vnc bound strictly to loopback (localhost)
exec x11vnc -display :0 -rfbport 5900 -localhost -forever -shared -nopw -noxdamage -repeat -xkb -quiet -o /tmp/display.log

#!/bin/bash
set -euo pipefail
umask 077

mkdir -p "$XDG_RUNTIME_DIR" "$HOME/.config/xfce4/terminal" "$HOME/.config/xfce4/xfconf/xfce-perchannel-xml" "$HOME/workspace" "$HOME/.local/bin"
chmod 700 "$XDG_RUNTIME_DIR"

if [ -f /opt/agentbox/terminalrc ]; then
  cp /opt/agentbox/terminalrc "$HOME/.config/xfce4/terminal/terminalrc"
fi
if [ -f /opt/agentbox/xfwm4.xml ]; then
  cp /opt/agentbox/xfwm4.xml "$HOME/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml"
fi
if [ ! -f "$HOME/.bashrc" ] && [ -f /opt/agentbox/bashrc ]; then
  cp /opt/agentbox/bashrc "$HOME/.bashrc"
fi

# Clear any stale Chrome locks
rm -f "$HOME/.config/google-chrome/SingletonLock" "$HOME/.config/google-chrome/SingletonSocket" "$HOME/.config/google-chrome/SingletonCookie"

# Seed default Chrome preferences if not yet present
if [ ! -f "$HOME/.config/google-chrome/Default/Preferences" ]; then
  mkdir -p "$HOME/.config/google-chrome/Default"
  printf '%s' '{"browser":{"custom_chrome_frame":false},"download":{"default_directory":"/home/operator/workspace/Downloads"}}' > "$HOME/.config/google-chrome/Default/Preferences"
fi

# Seed starter tasks in customer workspace if not present
if [ -f /opt/agentbox/STARTER_TASKS.md ] && [ ! -f "$HOME/workspace/STARTER_TASKS.md" ]; then
  cp /opt/agentbox/STARTER_TASKS.md "$HOME/workspace/STARTER_TASKS.md"
fi

# Start virtual X display
Xvfb :0 -screen 0 1440x900x24 -nolisten tcp -ac +extension RANDR &
xpid=$!
trap 'kill "$xpid" 2>/dev/null || true' EXIT

# Wait for X display to become active
for i in {1..50}; do
  if xdpyinfo >/dev/null 2>&1; then
    break
  fi
  sleep .1
done

exec dbus-run-session -- /bin/bash /opt/agentbox/session.sh

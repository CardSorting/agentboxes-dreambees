"""
AgentBoxes Display Bridge
Zero-port local display transport. Pipes RFB frames directly through Docker stdin/stdout
without exposing any container ports to the host network or external interfaces.
Includes connection retry loop to handle early connection attempts before x11vnc finishes binding.
"""
import os, select, socket, sys, time

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5900
display = None
for _ in range(50):
    try:
        display = socket.create_connection(('127.0.0.1', port), timeout=2)
        break
    except OSError:
        time.sleep(0.2)

if not display:
    sys.exit(1)

try:
    with display:
        display.settimeout(None)
        while True:
            readable, _, _ = select.select([display, sys.stdin.buffer], [], [])
            if display in readable:
                data = display.recv(65536)
                if not data:
                    break
                sys.stdout.buffer.write(data)
                sys.stdout.buffer.flush()
            if sys.stdin.buffer in readable:
                data = os.read(sys.stdin.fileno(), 65536)
                if not data:
                    break
                display.sendall(data)
except (OSError, BrokenPipeError):
    sys.exit(1)

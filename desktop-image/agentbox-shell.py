"""
DreamBeesAI AgentBoxes Desktop Shell
GTK3 desktop surface providing top status bar, branded wallpaper, and dynamic Agent Dock.
"""
import gi, os, subprocess, datetime, pathlib
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk, GLib

APPS = [
    ('terminal', 'Terminal', 'utilities-terminal', 'Development Shell'),
    ('chrome', 'Chrome', 'google-chrome', 'Browser & Auth'),
    ('cursor', 'Cursor', 'accessories-text-editor', 'Cursor IDE'),
    ('codex', 'Codex', 'utilities-terminal', 'OpenAI Codex'),
    ('claude', 'Claude Code', 'utilities-terminal', 'Claude CLI Agent'),
    ('agy', 'Antigravity', 'system-run', 'Google Antigravity'),
    ('hermes-agent', 'Hermes', 'utilities-terminal', 'Nous Hermes Agent'),
    ('aider', 'Aider', 'utilities-terminal', 'Aider Pair Programmer')
]

class AgentBoxDesktop(Gtk.Window):
    def __init__(self):
        super().__init__(title='DreamBeesAI AgentBoxes')
        self.set_decorated(False)
        self.set_type_hint(Gdk.WindowTypeHint.DESKTOP)
        self.set_keep_below(True)
        self.set_default_size(1440, 900)
        self.move(0, 0)
        self.set_name('desktop')
        self.connect('destroy', Gtk.main_quit)

        css = Gtk.CssProvider()
        css.load_from_data(b'''
        #desktop {
            background: radial-gradient(circle at 50% 30%, #15192c 0%, #090c15 70%, #05060b 100%);
            font-family: Inter, -apple-system, system-ui, sans-serif;
            color: #f3f4f6;
        }
        #topbar {
            background: rgba(10, 13, 24, 0.88);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding: 0 20px;
            min-height: 36px;
        }
        #topbar label {
            color: #e2e8f0;
            font-size: 13px;
        }
        #brand {
            font-weight: 700;
            letter-spacing: 0.04em;
            color: #f6ad55;
        }
        #dock {
            background: rgba(15, 20, 36, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 20px;
            padding: 10px 18px;
            margin: 0 0 24px 0;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        }
        #dock button {
            background: transparent;
            border: 0;
            box-shadow: none;
            padding: 8px 16px;
            border-radius: 12px;
            transition: all 150ms ease;
        }
        #dock button:hover {
            background: rgba(255, 255, 255, 0.12);
        }
        #dock label {
            color: #edf2f7;
            font-size: 11px;
            margin-top: 4px;
            font-weight: 500;
        }
        #hero-title {
            color: #ffffff;
            font-size: 34px;
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        #hero-subtitle {
            color: #f6ad55;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.05em;
        }
        #hero-desc {
            color: #94a3b8;
            font-size: 14px;
            max-width: 500px;
        }
        ''')
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        self.add(root)

        # Top Bar
        topbar = Gtk.Box(spacing=16)
        topbar.set_name('topbar')
        
        brand = Gtk.Label(label='🐝 AGENTBOXES')
        brand.set_name('brand')
        topbar.pack_start(brand, False, False, 0)
        
        env_badge = Gtk.Label(label='Managed Linux Environment · DreamBeesAI')
        topbar.pack_start(env_badge, False, False, 0)

        self.clock = Gtk.Label()
        topbar.pack_end(self.clock, False, False, 0)
        root.pack_start(topbar, False, False, 0)

        # Center Hero Wallpaper
        center = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        center.set_valign(Gtk.Align.CENTER)
        center.set_halign(Gtk.Align.CENTER)

        title = Gtk.Label(label='AGENTBOXES')
        title.set_name('hero-title')
        center.pack_start(title, False, False, 0)

        sub = Gtk.Label(label='YOUR AGENTS. THEIR WORKSPACE. OUR INFRASTRUCTURE.')
        sub.set_name('hero-subtitle')
        center.pack_start(sub, False, False, 0)

        desc = Gtk.Label(label='Launch your preferred agents below. Work is saved in ~/workspace and persists across sessions.')
        desc.set_name('hero-desc')
        center.pack_start(desc, False, False, 0)

        root.pack_start(center, True, True, 0)

        # Agent Dock
        dock = Gtk.Box(spacing=10)
        dock.set_name('dock')
        dock.set_halign(Gtk.Align.CENTER)

        # Always include Terminal & Chrome; include others if installed or available
        bin_dir = pathlib.Path('/home/operator/.local/bin')
        for app_id, app_name, icon_name, tooltip in APPS:
            # Check if app is standard or binary exists in PATH
            is_present = app_id in ('terminal', 'chrome', 'codex') or \
                         (bin_dir / app_id).exists() or \
                         (pathlib.Path('/usr/local/bin') / app_id).exists()
            
            if is_present:
                btn = Gtk.Button()
                btn.set_tooltip_text(f'Launch {app_name} ({tooltip})')
                box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
                img = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.DIALOG)
                img.set_pixel_size(44)
                box.pack_start(img, False, False, 0)
                box.pack_start(Gtk.Label(label=app_name), False, False, 0)
                btn.add(box)
                btn.connect('clicked', lambda _, aid=app_id: subprocess.Popen(
                    ['/opt/agentbox/open-app', aid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                ))
                dock.pack_start(btn, False, False, 0)

        root.pack_end(dock, False, False, 0)

        GLib.timeout_add_seconds(1, self.tick)
        self.tick()

    def tick(self):
        self.clock.set_text(datetime.datetime.now().strftime('%a %b %d   %H:%M:%S'))
        return True

if __name__ == '__main__':
    AgentBoxDesktop().show_all()
    Gtk.main()

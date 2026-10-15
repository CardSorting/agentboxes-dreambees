/**
 * AgentBoxes Remote Desktop Client
 * Connects noVNC RFB display over WebSocket, handles virtual keyboard, and clipboard synchronization.
 */

import RFB from '/novnc/core/rfb.js';
import keysyms from '/novnc/core/input/keysymdef.js';

const $ = id => document.getElementById(id);
const urlParams = new URLSearchParams(window.location.search);
const boxId = urlParams.get('box');
const memberId = urlParams.get('member');
const memberToken = urlParams.get('token');

let rfb = null;
let currentBox = null;
let scaleFit = true;

if (!boxId) {
  alert('No AgentBox specified. Returning to dashboard.');
  window.location.href = '/';
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data;
}

async function initViewer() {
  try {
    const data = await api(`/api/boxes/${boxId}`);
    currentBox = data.box;
    $('view-box-name').textContent = memberId
      ? `${currentBox.name} (Collaborator Desktop)`
      : `${currentBox.name} (Personal Desktop)`;

    if (currentBox.state !== 'running') {
      $('view-connection-status').className = 'status-pill stopped';
      $('view-connection-status').textContent = 'Starting computer…';
      await api(`/api/boxes/${boxId}/start`, { method: 'POST' });
    }

    if (memberId && memberToken) {
      connectRFB();
    } else {
      // Acquire ticket for primary desktop
      const ticketRes = await api(`/api/boxes/${boxId}/ticket`, { method: 'POST' });
      connectRFB(ticketRes.ticket);
    }
  } catch (err) {
    console.error('Failed to initialize viewer:', err);
    $('view-connection-status').className = 'status-pill danger';
    $('view-connection-status').textContent = 'Error: ' + err.message;
  }
}

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimer = null;

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    $('view-connection-status').className = 'status-pill stopped';
    $('view-connection-status').innerHTML = '<span>Offline</span> <button id="btn-reconnect-rfb" class="btn" style="padding:1px 6px;font-size:10px;margin-left:4px;">🔄 Retry Now</button>';
    const rec = $('btn-reconnect-rfb');
    if (rec) rec.onclick = () => { reconnectAttempts = 0; initViewer(); };
    return;
  }
  reconnectAttempts++;
  const delayMs = Math.min(800 * Math.pow(1.4, reconnectAttempts), 5000);
  $('view-connection-status').className = 'status-pill stopped';
  $('view-connection-status').innerHTML = `<span>Reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})…</span> <button id="btn-reconnect-rfb" class="btn" style="padding:1px 6px;font-size:10px;margin-left:4px;">Retry Now</button>`;
  const rec = $('btn-reconnect-rfb');
  if (rec) rec.onclick = () => { clearTimeout(reconnectTimer); initViewer(); };
  reconnectTimer = setTimeout(() => initViewer(), delayMs);
}

function connectRFB(ticket) {
  const screenEl = $('screen');
  screenEl.replaceChildren();

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  let wsUrl = `${protocol}//${location.host}/api/boxes/${boxId}/display`;
  if (memberId && memberToken) {
    wsUrl += `?member=${encodeURIComponent(memberId)}&token=${encodeURIComponent(memberToken)}`;
  } else {
    wsUrl += `?ticket=${ticket}`;
  }

  $('view-connection-status').className = 'status-pill stopped';
  $('view-connection-status').textContent = 'Connecting…';

  try {
    rfb = new RFB(screenEl, wsUrl, { shared: true });
    rfb.scaleViewport = scaleFit;
    rfb.resizeSession = false;
    rfb.qualityLevel = 8;
    rfb.compressionLevel = 2;
    rfb.background = '#050610';

    rfb.addEventListener('connect', () => {
      reconnectAttempts = 0;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      $('view-connection-status').className = 'status-pill running';
      $('view-connection-status').innerHTML = '<span class="status-pulse"></span> Connected (60 FPS)';
    });

    rfb.addEventListener('disconnect', (e) => {
      console.warn('RFB Disconnected:', e);
      scheduleReconnect();
    });

    rfb.addEventListener('securityfailure', (e) => {
      console.error('RFB Security Failure:', e);
      $('view-connection-status').className = 'status-pill danger';
      $('view-connection-status').innerHTML = '<span>Handshake Error</span> <button id="btn-reconnect-rfb" class="btn" style="padding:1px 6px;font-size:10px;margin-left:4px;">Retry</button>';
      const rec = $('btn-reconnect-rfb');
      if (rec) rec.onclick = () => initViewer();
    });
  } catch (err) {
    console.error('RFB initialization error:', err);
    $('view-connection-status').className = 'status-pill danger';
    $('view-connection-status').textContent = 'Connection Error';
    scheduleReconnect();
  }
}

// Quick Launcher Actions
async function launch(app) {
  try {
    await api(`/api/boxes/${boxId}/launch`, {
      method: 'POST',
      body: JSON.stringify({ app })
    });
  } catch (err) {
    alert(`Could not launch ${app}: ${err.message}`);
  }
}

$('btn-launch-terminal').onclick = () => launch('terminal');
$('btn-launch-chrome').onclick = () => launch('chrome');
$('btn-launch-codex').onclick = () => launch('codex');
$('btn-launch-cursor').onclick = () => launch('cursor');
$('btn-launch-claude').onclick = () => launch('claude');

// Scale / Fit Screen Toggle
$('btn-scale-fit').onclick = () => {
  scaleFit = !scaleFit;
  if (rfb) rfb.scaleViewport = scaleFit;
  $('btn-scale-fit').setAttribute('aria-pressed', String(scaleFit));
  $('btn-scale-fit').className = scaleFit ? 'btn primary' : 'btn';
};

// Fullscreen
$('btn-fullscreen').onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

// Export Work Archive
const exportBtn = $('btn-export-work');
if (exportBtn) {
  exportBtn.onclick = () => {
    window.location.href = `/api/boxes/${boxId}/export`;
  };
}

// Suspend Session
const suspendBtn = $('btn-suspend-session');
if (suspendBtn) {
  suspendBtn.onclick = async () => {
    if (confirm('Suspend this box to pause compute costs? Your files in ~/workspace remain preserved.')) {
      await api(`/api/boxes/${boxId}/suspend`, { method: 'POST' });
      window.location.href = '/';
    }
  };
}

// Teardown / Decommission Session
const teardownBtn = $('btn-teardown-session');
if (teardownBtn) {
  teardownBtn.onclick = async () => {
    const boxName = currentBox?.name || 'this workstation';
    const conf = prompt(`⚠️ IRREVERSIBLE DECOMMISSIONING\n\nThis will permanently destroy "${boxName}" and purge all data in /home/operator.\n\nTo confirm, type the box name below:\n${boxName}`);
    if (conf === boxName) {
      try {
        await api(`/api/boxes/${boxId}`, {
          method: 'DELETE',
          body: JSON.stringify({ confirmation: boxName })
        });
        alert('Workstation decommissioned and data permanently purged.');
        window.location.href = '/';
      } catch (err) {
        alert(`Teardown failed: ${err.message}`);
      }
    }
  };
}

// Onboarding Toast Dismissal
const dismissToast = $('btn-dismiss-toast');
const toast = $('viewer-onboarding-toast');
if (toast && localStorage.getItem('dreambees_toast_dismissed') === '1') {
  toast.style.display = 'none';
}
if (dismissToast && toast) {
  dismissToast.onclick = () => {
    toast.style.display = 'none';
    localStorage.setItem('dreambees_toast_dismissed', '1');
  };
}

// Keyboard Strip
$('btn-toggle-keyboard').onclick = () => {
  const strip = $('keyboard-strip');
  strip.style.display = strip.style.display === 'none' ? 'flex' : 'none';
};
$('btn-close-kb-strip').onclick = () => {
  $('keyboard-strip').style.display = 'none';
};

// Keyboard Accessibility: Escape to dismiss overlays
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const clip = $('clipboard-drawer');
    if (clip && clip.style.display !== 'none') clip.style.display = 'none';
    const kb = $('keyboard-strip');
    if (kb && kb.style.display !== 'none') kb.style.display = 'none';
  }
});

// Virtual Key press dispatch
document.querySelectorAll('.virtual-keyboard-bar button[data-key]').forEach(btn => {
  btn.onclick = () => {
    if (!rfb) return;
    const keyName = btn.dataset.key;
    const sym = keysyms[`XK_${keyName}`] || keysyms[keyName];
    if (sym) {
      rfb.sendKey(sym, keyName, true);
      setTimeout(() => rfb.sendKey(sym, keyName, false), 100);
    }
  };
});

// Clipboard Drawer
const clipDrawer = $('clipboard-drawer');
$('btn-toggle-clipboard').onclick = () => {
  clipDrawer.style.display = clipDrawer.style.display === 'none' ? 'block' : 'none';
};
$('btn-close-clipboard').onclick = () => {
  clipDrawer.style.display = 'none';
};

$('btn-send-clipboard').onclick = async () => {
  const text = $('clipboard-input').value;
  $('clipboard-msg').textContent = 'Sending...';
  try {
    await api(`/api/boxes/${boxId}/clipboard`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    $('clipboard-msg').textContent = '✔ Transferred to desktop clipboard.';
  } catch (err) {
    $('clipboard-msg').textContent = 'Error: ' + err.message;
  }
};

$('btn-read-clipboard').onclick = async () => {
  $('clipboard-msg').textContent = 'Reading from desktop...';
  try {
    const res = await api(`/api/boxes/${boxId}/clipboard`);
    $('clipboard-input').value = res.text || '';
    $('clipboard-msg').textContent = '✔ Read from desktop clipboard.';
  } catch (err) {
    $('clipboard-msg').textContent = 'Error: ' + err.message;
  }
};

// Initialize
initViewer();

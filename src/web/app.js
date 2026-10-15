/**
 * DreamBees · The Invisible Computer Web Client
 * Commission 012: Familiar Desktop Ergonomics, Google Drive Sharing & Codespaces Lifecycle
 * One Computer · Multiple Independent Desktops · Shared Work
 */

const $ = id => document.getElementById(id);

let state = {
  boxes: [],
  catalog: [],
  jobs: [],
  capacity: null,
  activeMainTab: 'computers', // 'computers' | 'inside' | 'account'
  activeSubTab: 'desktop',    // 'desktop' | 'files' | 'people' | 'settings'
  selectedBoxId: null,
  selectedTier: 'standard',
  pollTimer: null,
  targetDeleteBox: null,
  targetResetBox: null,
  workspaceFiles: [],
  workspaceGit: { branch: 'main', status: '' }
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data;
}

async function loadData() {
  try {
    const [boxData, catalogData, jobData, capData] = await Promise.all([
      api('/api/boxes').catch(() => ({ boxes: [] })),
      api('/api/catalog').catch(() => ({ catalog: [] })),
      api('/api/jobs').catch(() => ({ jobs: [] })),
      api('/api/capacity').catch(() => ({ capacity: null }))
    ]);

    state.boxes = boxData.boxes || [];
    state.catalog = catalogData.catalog || [];
    state.jobs = jobData.jobs || [];
    state.capacity = capData.capacity || null;

    if (!state.selectedBoxId && state.boxes.length > 0) {
      state.selectedBoxId = state.boxes[0].id;
    } else if (state.selectedBoxId && !state.boxes.some(b => b.id === state.selectedBoxId)) {
      state.selectedBoxId = state.boxes[0]?.id || null;
    }

    render();
  } catch (err) {
    console.error('Failed to load DreamBees state:', err);
  }
}

function getSelectedBox() {
  return state.boxes.find(b => b.id === state.selectedBoxId) || state.boxes[0];
}

async function loadWorkspaceFiles(boxId) {
  if (!boxId) return;
  try {
    const res = await api(`/api/boxes/${boxId}/files`);
    state.workspaceFiles = res.files || [];
    state.workspaceGit = res.git || { branch: 'main', status: '' };
    renderFilesView();
  } catch (err) {
    console.warn('Failed to load workspace files:', err);
    state.workspaceFiles = [];
    renderFilesView();
  }
}

function render() {
  renderMeta();
  renderComputersGrid();
  renderComputerSelectors();
  renderInsideView();
}

function renderMeta() {
  const running = state.boxes.filter(b => b.state === 'running' || b.state === 'ready').length;
  $('meta-running-count').textContent = `${running} Active`;
  $('meta-total-count').textContent = `${state.boxes.length} Total`;
  $('meta-catalog-count').textContent = `Claude & Codex`;

  if (state.capacity) {
    const cap = state.capacity;
    const availGiga = Math.round(cap.availableMemoryBytes / (1024 * 1024 * 1024));
    $('meta-isolation-status').textContent = `${cap.availableCpus} vCPUs · ${availGiga}GB Free`;
  }
}

function renderComputersGrid() {
  const container = $('boxes-grid');
  const empty = $('boxes-empty');
  const sharedGrid = $('shared-grid');
  const countLabel = $('owned-computers-count');

  if (countLabel) {
    countLabel.textContent = `${state.boxes.length} Computer${state.boxes.length === 1 ? '' : 's'}`;
  }

  if (state.boxes.length === 0) {
    container.style.display = 'none';
    empty.style.display = 'block';
    if (sharedGrid) sharedGrid.innerHTML = '<small style="color: var(--text-muted); padding: 12px;">No shared computers.</small>';
    return;
  }

  container.style.display = 'grid';
  empty.style.display = 'none';

  container.innerHTML = state.boxes.map(box => renderComputerCard(box, true)).join('');

  // Render shared with me section (computers with multiple members where user is collaborator)
  if (sharedGrid) {
    const sharedBoxes = state.boxes.filter(b => (b.members || []).length > 0);
    if (sharedBoxes.length === 0) {
      sharedGrid.innerHTML = '<small style="color: var(--text-muted); padding: 12px;">No computers shared with you yet. Collaborators will appear here when invited.</small>';
    } else {
      sharedGrid.innerHTML = sharedBoxes.map(box => renderComputerCard(box, false)).join('');
    }
  }

  attachCardHandlers(container);
  if (sharedGrid) attachCardHandlers(sharedGrid);
}

function renderComputerCard(box, isOwner) {
  const isLive = box.state === 'running' || box.state === 'ready';
  const isSuspended = box.state === 'suspended';
  const isProvisioning = box.state === 'provisioning' || box.state === 'queued';
  const isRecovering = box.state === 'recovering';
  const isFailed = box.state === 'failed';

  const metrics = box.metrics || { cpuPercent: 0, memoryUsageBytes: 0, memoryPercent: 0 };
  const memMb = Math.round((metrics.memoryUsageBytes || 0) / (1024 * 1024));
  const activeMembersCount = (box.members || []).filter(m => m.status === 'active').length;
  const collabLabel = activeMembersCount === 0
    ? 'Personal Computer'
    : `${activeMembersCount + 1} People Collaborating`;

  const activeJob = state.jobs
    .filter(j => j.boxId === box.id && (j.status === 'running' || j.status === 'queued'))
    .slice(-1)[0];

  const showProgressBar = activeJob || isProvisioning || isRecovering;
  const progressPercent = activeJob ? activeJob.progress : (isProvisioning ? 65 : 45);
  const progressStage = activeJob?.stageMessage || (isProvisioning ? 'Setting up cloud computer...' : 'Restoring computer...');

  return `
    <div class="box-card" data-box-id="${box.id}">
      <div class="box-head">
        <div class="box-title">
          <h3>${escapeHtml(box.name)}</h3>
          <span class="box-tier">${escapeHtml(box.tier.toUpperCase())} · ${collabLabel}</span>
        </div>
        <span class="status-pill ${box.state}">
          <span class="status-pulse"></span>
          ${box.state === 'running' ? 'ACTIVE' : box.state.toUpperCase()}
        </span>
      </div>

      ${showProgressBar ? `
        <div class="job-progress-container">
          <div class="job-progress-header">
            <span>${escapeHtml(activeJob ? activeJob.stage : box.state)}</span>
            <span>${progressPercent}%</span>
          </div>
          <div class="job-progress-bar">
            <div class="job-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="job-progress-msg">${escapeHtml(progressStage)}</div>
        </div>
      ` : ''}

      ${isFailed && box.lifecycle?.failureReason ? `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 10px; margin-bottom: 14px; font-size: 12px; color: #fca5a5;">
          <strong>Diagnostics:</strong> ${escapeHtml(box.lifecycle.failureReason)}
        </div>
      ` : ''}

      <div class="metrics-strip">
        <div class="metric-item">
          <small>Compute Load</small>
          <strong>${isLive ? `${metrics.cpuPercent.toFixed(1)}%` : 'Paused'}</strong>
        </div>
        <div class="metric-item">
          <small>Active Memory</small>
          <strong>${isLive ? `${memMb} MB` : '0 MB'}</strong>
        </div>
        <div class="metric-item">
          <small>Storage</small>
          <strong>Persistent</strong>
        </div>
      </div>

      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Pre-installed Tools:</div>
      <div class="agents-list">
        <span class="agent-tag">claude-code</span>
        <span class="agent-tag">openai-codex</span>
        <span class="agent-tag">git</span>
        <span class="agent-tag">chrome</span>
      </div>

      <div class="box-actions">
        ${isLive
          ? `<a href="/viewer?box=${box.id}" target="_blank" class="btn primary" style="flex: 1; justify-content: center;">Open Desktop ↗</a>
             <button class="btn btn-suspend" data-id="${box.id}" title="Pause compute to save money">Pause</button>`
          : isSuspended
          ? `<button class="btn primary btn-resume" data-id="${box.id}" style="flex: 1; justify-content: center;">Resume Computer</button>`
          : `<button class="btn primary btn-start" data-id="${box.id}" style="flex: 1; justify-content: center;">Start Computer</button>`
        }
        <button class="btn btn-manage-computer" data-id="${box.id}" title="Enter computer workspace">Enter 💻</button>
        <button class="btn btn-share-computer" data-id="${box.id}" title="Share with team">Share 👥</button>
        <button class="btn danger btn-delete" data-id="${box.id}" data-name="${escapeHtml(box.name)}" title="Delete Permanently">✕</button>
      </div>
    </div>
  `;
}

function attachCardHandlers(container) {
  container.querySelectorAll('.btn-start').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Starting…';
      try {
        await api(`/api/boxes/${btn.dataset.id}/start`, { method: 'POST' });
        await loadData();
      } catch (err) {
        alert(err.message);
      }
    };
  });

  container.querySelectorAll('.btn-resume').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Resuming…';
      try {
        await api(`/api/boxes/${btn.dataset.id}/resume`, { method: 'POST', body: JSON.stringify({ async: true }) });
        await loadData();
      } catch (err) {
        alert(err.message);
      }
    };
  });

  container.querySelectorAll('.btn-suspend').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Pausing…';
      try {
        await api(`/api/boxes/${btn.dataset.id}/suspend`, { method: 'POST' });
        await loadData();
      } catch (err) {
        alert(err.message);
      }
    };
  });

  container.querySelectorAll('.btn-manage-computer').forEach(btn => {
    btn.onclick = () => {
      state.selectedBoxId = btn.dataset.id;
      navigateTo('inside', 'desktop');
    };
  });

  container.querySelectorAll('.btn-share-computer').forEach(btn => {
    btn.onclick = () => {
      state.selectedBoxId = btn.dataset.id;
      navigateTo('inside', 'people');
    };
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => {
      state.targetDeleteBox = { id: btn.dataset.id, name: btn.dataset.name };
      $('delete-box-target-name').textContent = btn.dataset.name;
      $('delete-confirm-input').value = '';
      $('btn-submit-delete').disabled = true;
      showAccessibleModal($('dialog-delete'), 'delete-confirm-input');
    };
  });
}

function renderComputerSelectors() {
  const optionsHtml = state.boxes.map(box =>
    `<option value="${box.id}" ${box.id === state.selectedBoxId ? 'selected' : ''}>${escapeHtml(box.name)} (${box.tier.toUpperCase()} · ${box.state})</option>`
  ).join('');

  ['inside-computer-select', 'workspace-computer-select', 'collaborators-computer-select', 'settings-computer-select'].forEach(id => {
    const el = $(id);
    if (el) {
      el.innerHTML = optionsHtml || '<option value="">No Computers Available</option>';
      el.onchange = (e) => {
        state.selectedBoxId = e.target.value;
        render();
        if (state.activeSubTab === 'files') {
          loadWorkspaceFiles(state.selectedBoxId);
        }
      };
    }
  });
}

function renderInsideView() {
  const box = getSelectedBox();
  if (!box) {
    $('inside-computer-breadcrumb-name').textContent = 'No Computer Selected';
    return;
  }

  $('inside-computer-breadcrumb-name').textContent = box.name;

  // Render Sub-Views
  renderDesktopSubView(box);
  renderPeopleSubView(box);
  renderSettingsSubView(box);
  if (state.activeSubTab === 'files') {
    renderFilesView();
  }
}

function renderDesktopSubView(box) {
  $('workspace-desktop-name').textContent = `${box.name} (${box.tier.toUpperCase()})`;
  $('btn-open-desktop-workspace').href = `/viewer?box=${box.id}`;

  const badges = $('workspace-desktop-badges');
  badges.innerHTML = `
    <span class="status-pill ${box.state}">${box.state.toUpperCase()}</span>
    <span class="agent-tag">Claude Code Pre-installed</span>
    <span class="agent-tag">OpenAI Codex Pre-installed</span>
    <span class="agent-tag">Node.js 22 &amp; Git</span>
  `;

  document.querySelectorAll('.btn-launch-tool').forEach(btn => {
    btn.onclick = async () => {
      const tool = btn.dataset.tool;
      btn.disabled = true;
      btn.textContent = 'Launching…';
      try {
        await api(`/api/boxes/${box.id}/launch`, {
          method: 'POST',
          body: JSON.stringify({ app: tool })
        });
        btn.textContent = 'Launched ✓';
        setTimeout(() => {
          btn.textContent = 'Launch';
          btn.disabled = false;
        }, 1500);
      } catch (err) {
        alert(`Launch error: ${err.message}`);
        btn.disabled = false;
        btn.textContent = 'Launch';
      }
    };
  });
}

function renderFilesView() {
  const tableBody = $('files-table-body');
  const branchIndicator = $('git-branch-indicator');
  const uncommittedIndicator = $('git-uncommitted-indicator');

  if (branchIndicator) branchIndicator.textContent = state.workspaceGit.branch || 'main';
  if (uncommittedIndicator) {
    uncommittedIndicator.textContent = state.workspaceGit.status
      ? 'Uncommitted changes present'
      : 'Working tree clean';
  }

  if (!tableBody) return;

  if (state.workspaceFiles.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">
          Workspace is empty or files are being indexed. Click <strong>"🔄 Refresh Files"</strong> or launch an agent in My Desktop.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = state.workspaceFiles.map(f => {
    const icon = f.isDir ? '📁' : '📄';
    const sizeStr = f.isDir ? '-' : formatBytes(f.size);
    return `
      <tr>
        <td><strong>${icon} ${escapeHtml(f.name)}</strong></td>
        <td><code>${sizeStr}</code></td>
        <td><small style="color: var(--text-muted);">${escapeHtml(f.mtime || 'Recent')}</small></td>
        <td><code>~/workspace/${escapeHtml(f.name)}</code></td>
      </tr>
    `;
  }).join('');
}

function renderPeopleSubView(box) {
  const tableBody = $('members-table-body');
  if (!tableBody) return;

  const members = box.members || [];
  tableBody.innerHTML = `
    <tr>
      <td><strong>You (Owner)</strong><br><small style="color: var(--text-muted);">operator@local</small></td>
      <td><span class="status-pill running" style="font-size:10px;">OWNER</span></td>
      <td>Display :0 (Primary Desktop)</td>
      <td><span class="status-pill running">ACTIVE</span></td>
      <td><a href="/viewer?box=${box.id}" target="_blank" class="btn btn-micro">Open Desktop</a></td>
      <td><small style="color: var(--text-muted);">Owner account</small></td>
    </tr>
  ` + members.map(m => {
    const isRevoked = m.status === 'revoked';
    const sessionUrl = `/viewer?box=${box.id}&member=${m.userId}&token=${m.sessionToken || ''}`;

    return `
      <tr style="${isRevoked ? 'opacity: 0.55;' : ''}">
        <td>
          <strong>${escapeHtml(m.displayName || m.username)}</strong>
          <br><small style="color: var(--text-muted);">${escapeHtml(m.email || m.username + '@local')}</small>
        </td>
        <td><span class="status-pill ${m.role === 'editor' ? 'running' : 'stopped'}" style="font-size:10px;">${m.role.toUpperCase()}</span></td>
        <td>Independent Session #${m.displayNumber}</td>
        <td>
          <span class="status-pill ${isRevoked ? 'danger' : 'running'}">
            ${isRevoked ? 'REVOKED' : 'ACTIVE'}
          </span>
        </td>
        <td>
          ${!isRevoked
            ? `<a href="${sessionUrl}" target="_blank" class="btn btn-micro" title="Open member's private desktop">Join Desktop ↗</a>`
            : `<small style="color: var(--text-muted);">Access Blocked</small>`
          }
        </td>
        <td>
          ${!isRevoked
            ? `<button class="btn btn-micro btn-rotate-token" data-userid="${m.userId}" title="Rotate token and refresh link" style="margin-right: 4px;">Rotate Token</button>
               <button class="btn btn-micro danger btn-revoke-member" data-userid="${m.userId}" data-name="${escapeHtml(m.displayName || m.username)}">Remove Access</button>`
            : `<small style="color: var(--text-muted);">Revoked</small>`
          }
        </td>
      </tr>
    `;
  }).join('');

  tableBody.querySelectorAll('.btn-rotate-token').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Rotating…';
      try {
        await api(`/api/boxes/${box.id}/members/${btn.dataset.userid}/rotate-token`, { method: 'POST' });
        await loadData();
      } catch (err) {
        alert(`Token rotation failed: ${err.message}`);
      }
    };
  });

  tableBody.querySelectorAll('.btn-revoke-member').forEach(btn => {
    btn.onclick = async () => {
      const targetUserId = btn.dataset.userid;
      const targetName = btn.dataset.name;
      if (confirm(`Remove access for ${targetName}? Their desktop session will be terminated and processes killed immediately, preserving all shared files in ~/workspace.`)) {
        btn.disabled = true;
        btn.textContent = 'Removing…';
        try {
          await api(`/api/boxes/${box.id}/members/${targetUserId}/revoke`, { method: 'POST' });
          await loadData();
        } catch (err) {
          alert(`Revocation failed: ${err.message}`);
        }
      }
    };
  });
}

function renderSettingsSubView(box) {
  $('settings-tier-name').textContent = `${box.tier.toUpperCase()} Environment`;
  $('settings-cpu-count').textContent = box.tier === 'titan' ? '8 vCPUs' : (box.tier === 'power' ? '4 vCPUs' : '2 vCPUs');
  $('settings-ram-size').textContent = box.tier === 'titan' ? '16 GB' : (box.tier === 'power' ? '8 GB' : '4 GB');
  $('settings-disk-quota').textContent = box.tier === 'titan' ? '100 GB Persistent' : (box.tier === 'power' ? '50 GB Persistent' : '20 GB Persistent');

  const accrued = box.accounting?.costs?.totalCost || 0;
  $('settings-accrued-cost').textContent = `$${accrued.toFixed(4)}`;

  $('btn-settings-reset').onclick = () => {
    state.targetResetBox = { id: box.id, name: box.name };
    $('dialog-reset').showModal();
  };

  $('btn-settings-delete').onclick = () => {
    state.targetDeleteBox = { id: box.id, name: box.name };
    $('delete-box-target-name').textContent = box.name;
    $('delete-confirm-input').value = '';
    $('btn-submit-delete').disabled = true;
    $('dialog-delete').showModal();
  };
}

function navigateTo(mainTab, subTab = 'desktop') {
  state.activeMainTab = mainTab;
  state.activeSubTab = subTab;

  // Primary tabs
  ['computers', 'inside', 'account'].forEach(t => {
    const tabBtn = $(`nav-tab-${t}`);
    const panel = $(`view-${t}`);
    if (tabBtn && panel) {
      if (t === mainTab) {
        tabBtn.classList.add('active');
        tabBtn.setAttribute('aria-selected', 'true');
        panel.style.display = 'block';
      } else {
        tabBtn.classList.remove('active');
        tabBtn.setAttribute('aria-selected', 'false');
        panel.style.display = 'none';
      }
    }
  });

  // Sub tabs (inside computer)
  if (mainTab === 'inside') {
    ['desktop', 'files', 'people', 'settings'].forEach(s => {
      const pill = $(`subtab-${s}`);
      const subPanel = $(`inside-view-${s}`);
      if (pill && subPanel) {
        if (s === subTab) {
          pill.classList.add('active');
          pill.setAttribute('aria-selected', 'true');
          subPanel.style.display = 'block';
        } else {
          pill.classList.remove('active');
          pill.setAttribute('aria-selected', 'false');
          subPanel.style.display = 'none';
        }
      }
    });

    if (subTab === 'files') {
      loadWorkspaceFiles(state.selectedBoxId);
    }
  }

  // Update URL hash for predictable back navigation & bookmarking
  const hash = mainTab === 'inside'
    ? `computer=${state.selectedBoxId}&tab=${subTab}`
    : mainTab;
  window.history.replaceState(null, '', `#${hash}`);

  render();
}

let lastFocusedElement = null;

function showAccessibleModal(dialog, autofocusId) {
  if (!dialog) return;
  lastFocusedElement = document.activeElement;
  dialog.showModal();
  const autofocusEl = autofocusId ? $(autofocusId) : null;
  const focusable = autofocusEl || dialog.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
  if (focusable) focusable.focus();

  dialog.onkeydown = (e) => {
    if (e.key === 'Escape') {
      closeAccessibleModal(dialog);
      return;
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(dialog.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
}

function closeAccessibleModal(dialog) {
  if (!dialog) return;
  dialog.close();
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    try { lastFocusedElement.focus(); } catch {}
  }
}

function initEvents() {
  // Navigation Tabs (Commission 012.A & 013.A)
  $('nav-tab-computers').onclick = () => navigateTo('computers');
  $('nav-tab-inside').onclick = () => navigateTo('inside', state.activeSubTab);
  $('nav-tab-account').onclick = () => navigateTo('account');

  // Breadcrumb back button
  $('btn-breadcrumb-back').onclick = () => navigateTo('computers');

  // Sub-Navigation Pills
  $('subtab-desktop').onclick = () => navigateTo('inside', 'desktop');
  $('subtab-files').onclick = () => navigateTo('inside', 'files');
  $('subtab-people').onclick = () => navigateTo('inside', 'people');
  $('subtab-settings').onclick = () => navigateTo('inside', 'settings');

  // Compatibility tabs for tests
  const tabBoxes = $('tab-boxes');
  if (tabBoxes) tabBoxes.onclick = () => navigateTo('computers');
  const tabWorkspace = $('tab-workspace');
  if (tabWorkspace) tabWorkspace.onclick = () => navigateTo('inside', 'desktop');
  const tabCollab = $('tab-collaborators');
  if (tabCollab) tabCollab.onclick = () => navigateTo('inside', 'people');
  const tabSettings = $('tab-settings');
  if (tabSettings) tabSettings.onclick = () => navigateTo('inside', 'settings');

  // Dialogs with accessible focus management
  const createDialog = $('dialog-create');
  const byokDialog = $('dialog-byok');
  const resetDialog = $('dialog-reset');
  const deleteDialog = $('dialog-delete');
  const inviteDialog = $('dialog-invite-member');

  $('btn-new-box').onclick = () => showAccessibleModal(createDialog, 'box-name');
  $('btn-empty-create').onclick = () => showAccessibleModal(createDialog, 'box-name');
  $('btn-close-modal').onclick = () => closeAccessibleModal(createDialog);
  $('btn-cancel-create').onclick = () => closeAccessibleModal(createDialog);

  const customLaunchTrigger = $('btn-custom-launch-trigger');
  if (customLaunchTrigger) {
    customLaunchTrigger.onclick = () => showAccessibleModal(createDialog, 'box-name');
  }

  // Invite Collaborator Dialog
  const openInviteBtn = $('btn-open-invite-dialog');
  if (openInviteBtn) {
    openInviteBtn.onclick = () => {
      const box = getSelectedBox();
      if (!box) {
        alert('Please select or create a computer first.');
        return;
      }
      $('invite-display-name').value = '';
      $('invite-username').value = '';
      $('invite-email').value = '';
      showAccessibleModal(inviteDialog, 'invite-display-name');
    };
  }

  $('btn-close-invite').onclick = () => closeAccessibleModal(inviteDialog);
  $('btn-cancel-invite').onclick = () => closeAccessibleModal(inviteDialog);

  $('form-invite-member').onsubmit = async (e) => {
    e.preventDefault();
    const box = getSelectedBox();
    if (!box) return;

    const submitBtn = $('btn-submit-invite');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Provisioning Independent Session…';

    const displayName = $('invite-display-name').value.trim();
    const username = $('invite-username').value.trim().toLowerCase();
    const email = $('invite-email').value.trim();
    const role = $('invite-role').value;
    const userId = `usr-${username}-${Math.random().toString(36).substring(2, 6)}`;

    try {
      await api(`/api/boxes/${box.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, username, displayName, email, role })
      });
      inviteDialog.close();
      await loadData();
    } catch (err) {
      alert(`Invitation error: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Invitation & Provision Session';
    }
  };

  // Files Refresh button
  const refreshFilesBtn = $('btn-refresh-files');
  if (refreshFilesBtn) {
    refreshFilesBtn.onclick = () => loadWorkspaceFiles(state.selectedBoxId);
  }

  // Export Deliverables button
  const exportBtn = $('btn-export-from-workspace');
  if (exportBtn) {
    exportBtn.onclick = () => {
      if (state.selectedBoxId) {
        window.location.href = `/api/boxes/${state.selectedBoxId}/export`;
      }
    };
  }

  // Quick 1-Click Launch
  const quickClaudeBtn = $('btn-quick-claude');
  if (quickClaudeBtn) {
    quickClaudeBtn.onclick = async () => {
      quickClaudeBtn.disabled = true;
      quickClaudeBtn.textContent = '⏳ Creating Computer (1/4)...';

      try {
        const res = await api('/api/boxes', {
          method: 'POST',
          body: JSON.stringify({
            name: `Computer-${Math.random().toString(36).substring(2, 7)}`,
            tier: 'standard',
            agents: ['claude-code', 'openai-codex'],
            profileId: 'unified-agentbox-workspace',
            async: true
          })
        });

        const box = res.box;
        if (!box) throw new Error('Provisioning did not return computer record');

        quickClaudeBtn.textContent = '⏳ Booting Linux Desktop (2/4)...';
        let ready = false;
        const startTime = Date.now();

        while (!ready && Date.now() - startTime < 15000) {
          await new Promise(r => setTimeout(r, 400));
          const pollRes = await api(`/api/boxes/${box.id}`).catch(() => null);
          if (pollRes?.box?.state === 'running' || pollRes?.box?.state === 'ready') {
            ready = true;
            break;
          }
          if (pollRes?.box?.state === 'failed') {
            throw new Error(pollRes.box.errorMessage || 'Computer boot failed');
          }
        }

        quickClaudeBtn.textContent = '🚀 Opening Desktop (3/4)...';
        await new Promise(r => setTimeout(r, 200));
        window.location.href = `/viewer?box=${box.id}`;
      } catch (err) {
        console.error('Quick launch error:', err);
        alert(`Launch error: ${err.message}`);
        quickClaudeBtn.disabled = false;
        quickClaudeBtn.textContent = '⚡ Launch Computer';
      }
    };
  }

  // BYOK dialog
  $('btn-byok-info').onclick = () => showAccessibleModal(byokDialog);
  $('btn-close-byok').onclick = () => closeAccessibleModal(byokDialog);
  $('btn-close-byok-footer').onclick = () => closeAccessibleModal(byokDialog);

  // Reset dialog
  $('btn-close-reset').onclick = () => closeAccessibleModal(resetDialog);
  $('btn-cancel-reset').onclick = () => closeAccessibleModal(resetDialog);
  $('btn-submit-reset').onclick = async () => {
    if (!state.targetResetBox) return;
    const btn = $('btn-submit-reset');
    btn.disabled = true;
    btn.textContent = 'Resetting Environment…';

    const preserveStorage = $('reset-preserve-storage').checked;
    try {
      await api(`/api/boxes/${state.targetResetBox.id}/reset`, {
        method: 'POST',
        body: JSON.stringify({ preserveStorage })
      });
      closeAccessibleModal(resetDialog);
      await loadData();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Reset Environment';
    }
  };

  // Delete dialog
  $('btn-close-delete').onclick = () => closeAccessibleModal(deleteDialog);
  $('btn-cancel-delete').onclick = () => closeAccessibleModal(deleteDialog);
  $('delete-confirm-input').oninput = (e) => {
    const input = e.target.value.trim();
    const matches = state.targetDeleteBox && input === state.targetDeleteBox.name;
    $('btn-submit-delete').disabled = !matches;
  };

  $('btn-submit-delete').onclick = async () => {
    if (!state.targetDeleteBox) return;
    const btn = $('btn-submit-delete');
    btn.disabled = true;
    btn.textContent = 'Decommissioning…';

    try {
      await api(`/api/boxes/${state.targetDeleteBox.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: state.targetDeleteBox.name })
      });
      closeAccessibleModal(deleteDialog);
      await loadData();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Delete Computer Permanently';
    }
  };

  // Hardware tier selection
  document.querySelectorAll('.tier-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.selectedTier = card.dataset.tier;
    };
  });

  // Create Form Submit
  $('form-create').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = $('btn-submit-create');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Cloud Computer…';

    const name = $('box-name').value.trim();
    try {
      await api('/api/boxes', {
        method: 'POST',
        body: JSON.stringify({
          name,
          tier: state.selectedTier,
          agents: ['claude-code', 'openai-codex'],
          async: true
        })
      });

      createDialog.close();
      $('box-name').value = '';
      await loadData();
    } catch (err) {
      alert(`Creation rejected: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create & Launch Desktop';
    }
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// Initial Boot & URL Hash Evaluation
initEvents();
loadData();
state.pollTimer = setInterval(loadData, 2500);

function applyHashRoute() {
  if (!window.location.hash) return;
  const hash = window.location.hash.slice(1);
  if (hash === 'account') {
    navigateTo('account');
  } else if (hash === 'computers') {
    navigateTo('computers');
  } else if (hash.startsWith('computer=')) {
    const params = new URLSearchParams(hash);
    const boxId = params.get('computer');
    const tab = params.get('tab') || 'desktop';
    if (boxId) state.selectedBoxId = boxId;
    navigateTo('inside', tab);
  }
}

applyHashRoute();
window.addEventListener('hashchange', applyHashRoute);

/**
 * UnlockMyCeler - Dynamic Dropdown & RPA Engine
 */

(function () {
  let isRunning = false;
  let isTraining = false;
  let recordedSteps = [];
  let savedProfile = [];

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- DYNAMIC DOM WAITERS ---

  function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) {
          clearInterval(interval);
          resolve(el);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for "${selector}"`));
        }
      }, 50);
    });
  }

  function waitForElementByText(selector, text, timeout = 10000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const elements = Array.from(document.querySelectorAll(selector));
        const target = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()) && el.offsetParent !== null);
        if (target) {
          clearInterval(interval);
          resolve(target);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for text: "${text}"`));
        }
      }, 50);
    });
  }

  // Waits for ANY of the provided texts (useful for conditional warnings)
  function waitForMultipleTexts(selector, texts, timeout = 10000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const elements = Array.from(document.querySelectorAll(selector));
        for (let text of texts) {
          const target = elements.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()) && el.offsetParent !== null);
          if (target) {
            clearInterval(interval);
            resolve({ element: target, textFound: text });
            return;
          }
        }
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for buttons: ${texts.join(' or ')}`));
        }
      }, 50);
    });
  }

  function waitForDisappear(selector, timeout = 10000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (!el) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for "${selector}" to disappear`));
        }
      }, 50);
    });
  }

  function waitForQueueRefresh(previousCount, timeout = 15000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const currentCount = getValidCards().length;
        if (currentCount < previousCount) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error("Timeout waiting for grid to refresh"));
        }
      }, 100);
    });
  }

  function getValidCards() {
    const badges = document.querySelectorAll('.apv-qitem__no');
    return Array.from(badges)
      .map(badge => badge.closest('.apv-qitem__head') || badge.closest('.apv-qitem'))
      .filter(Boolean);
  }

  // --- HUD DRAG LOGIC ---

  function makeDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      handle.style.cursor = 'grabbing';

      const rect = element.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;

      element.style.bottom = 'auto';
      element.style.right = 'auto';
      element.style.left = initialLeft + 'px';
      element.style.top = initialTop + 'px';
      element.style.margin = '0';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = (initialLeft + dx) + 'px';
      element.style.top = (initialTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      handle.style.cursor = 'grab';
    });
  }

  // --- HUD INJECTION & LOGIC ---

  function injectHUD() {
    if (document.getElementById('auto-approver-hud')) return;

    try {
      const videoUrl = chrome.runtime.getURL('logo.mp4');

      const hud = document.createElement('div');
      hud.id = 'auto-approver-hud';
      hud.innerHTML = `
        <div id="hud-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; cursor:grab; padding-bottom:4px; border-bottom:1px solid #f1f5f9;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:#94a3b8; font-size:14px; user-select:none;">⣿</span>
            <span style="font-weight:800; font-size:14px; color:#0f172a; user-select:none;">⚡ UnlockMyCeler</span>
          </div>
          <span id="hud-badge" style="background:#e0f2fe; color:#0b5a83; font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px;">Checking...</span>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px; text-align:center; margin-bottom:10px; overflow:hidden;">
          <video src="${videoUrl}" autoplay loop muted playsinline style="width: 100%; max-height: 110px; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none';"></video>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div id="hud-status" style="font-size:11px; color:#475569; font-weight:600;">Scanning page...</div>
          <div id="hud-step-text" style="font-size:10px; color:#94a3b8; font-weight:700;">Profile: None</div>
        </div>

        <div id="hud-logs" style="background:#0f172a; color:#38bdf8; font-family:monospace; font-size:10px; border-radius:8px; padding:8px; height:70px; overflow-y:auto; margin-bottom:12px; display:flex; flex-direction:column; gap:3px;">
          <div style="color:#94a3b8;">[UnlockMyCeler] Initialized securely.</div>
        </div>

        <div style="display:flex; gap:6px;">
          <button id="hud-train-btn" style="flex:1; background:#f59e0b; color:#fff; border:none; border-radius:8px; padding:9px 0; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;">
            Train Profile
          </button>
          <button id="hud-run-btn" style="flex:1; background:#cbd5e1; color:#fff; border:none; border-radius:8px; padding:9px 0; font-size:12px; font-weight:700; cursor:not-allowed;" disabled>
            Run Loop
          </button>
        </div>
      `;

      Object.assign(hud.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '310px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '16px',
        padding: '14px',
        boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.2)',
        zIndex: '999999',
        fontFamily: 'Poppins, system-ui, sans-serif'
      });

      document.body.appendChild(hud);

      const header = document.getElementById('hud-header');
      makeDraggable(hud, header);

      document.getElementById('hud-train-btn').addEventListener('click', toggleTraining);
      document.getElementById('hud-run-btn').addEventListener('click', toggleAutomation);

      loadProfile();
      setupQueueObserver();

    } catch (err) {
      console.error("HUD Injection Error:", err);
    }
  }

  function logMessage(msg, type = 'info') {
    const logsContainer = document.getElementById('hud-logs');
    if (!logsContainer) return;
    const colorMap = { info: '#38bdf8', success: '#4ade80', error: '#f87171', warn: '#fbbf24' };
    const logLine = document.createElement('div');
    logLine.style.color = colorMap[type] || '#38bdf8';
    logLine.style.wordBreak = 'break-word';
    logLine.textContent = `> ${msg}`;
    logsContainer.appendChild(logLine);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  // --- STATE MANAGEMENT ---

  function updateHUDState(status, logType = 'info') {
    const statusEl = document.getElementById('hud-status');
    const stepTextEl = document.getElementById('hud-step-text');
    if (statusEl) statusEl.textContent = status;
    if (stepTextEl) stepTextEl.textContent = savedProfile.length > 0 ? `Profile: ${savedProfile.length} steps` : 'Profile: None';
    if (status) logMessage(status, logType);
  }

  function updateQueueState() {
    if (isRunning || isTraining) return;

    const badgeEl = document.getElementById('hud-badge');
    const runBtn = document.getElementById('hud-run-btn');
    const validCards = getValidCards();
    const isLoading = document.querySelector('.spinner') || document.body.innerText.includes('Loading...');

    if (badgeEl) badgeEl.textContent = `${validCards.length} in queue`;

    if (isLoading || validCards.length === 0 || savedProfile.length === 0) {
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.style.background = '#cbd5e1';
        runBtn.style.cursor = 'not-allowed';
      }
    } else {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.style.background = '#0e6694';
        runBtn.style.cursor = 'pointer';
      }
    }
  }

  function setupQueueObserver() {
    updateQueueState();
    let timeoutId = null;
    const observer = new MutationObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateQueueState, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- PROFILING & TRAINING MODE ---

  function loadProfile() {
    chrome.storage.local.get(['celerProfile'], (result) => {
      if (result.celerProfile && result.celerProfile.length > 0) {
        savedProfile = result.celerProfile;
        updateHUDState(`Loaded saved profile.`, 'success');
        updateQueueState();
      }
    });
  }

  function toggleTraining() {
    const trainBtn = document.getElementById('hud-train-btn');
    if (isTraining) {
      isTraining = false;
      trainBtn.textContent = 'Train Profile';
      trainBtn.style.background = '#f59e0b';

      document.removeEventListener('click', recordClick, true);
      document.removeEventListener('change', recordChange, true);

      if (recordedSteps.length > 0) {
        chrome.storage.local.set({ celerProfile: recordedSteps }, () => {
          savedProfile = [...recordedSteps];
          updateHUDState('Profile saved securely.', 'success');
          updateQueueState();
        });
      } else {
        updateHUDState('Training cancelled (no steps).', 'warn');
      }
    } else {
      isTraining = true;
      recordedSteps = [];
      trainBtn.textContent = 'Save Profile';
      trainBtn.style.background = '#10b981';

      updateHUDState('Recording... Process 1 question.', 'warn');
      document.addEventListener('click', recordClick, true);
      document.addEventListener('change', recordChange, true);
    }
  }

  function getResilientSelector(el) {
    if (el.tagName === 'SELECT') return { type: 'select', value: '' };
    if (el.closest('.apv-qitem__head') || el.closest('.apv-qitem__no')) return { type: 'card', value: 'Q-Card' };

    const text = el.textContent.trim();
    if (text && text.length < 40) return { type: 'text', value: text };

    return null;
  }

  function recordClick(e) {
    if (!isTraining || e.target.closest('#auto-approver-hud')) return;
    if (e.target.tagName === 'OPTION') return;

    const selector = getResilientSelector(e.target);
    if (selector) {
      recordedSteps.push({ action: 'click', type: selector.type, value: selector.value });
      logMessage(`Recorded: Click [${selector.value}]`, 'info');
    }
  }

  function recordChange(e) {
    if (!isTraining || e.target.tagName !== 'SELECT') return;
    const selectedText = e.target.options[e.target.selectedIndex].text.trim();

    // Ignore "Yes" or "No" from the table so they don't bloat the profile.
    // The script will dynamically auto-fill all available "Yes" options during playback.
    if (['Yes', 'No', 'N/A'].includes(selectedText)) {
      logMessage(`Ignored table select. Will auto-fill during loop.`, 'warn');
      return;
    }

    recordedSteps.push({ action: 'select', type: 'select', value: selectedText });
    logMessage(`Recorded: Select [${selectedText}]`, 'info');
  }

  // --- AUTOMATION PLAYBACK ---

  async function processSingleQuestion() {
    const initialCardCount = getValidCards().length;

    for (let i = 0; i < savedProfile.length; i++) {
      const step = savedProfile[i];
      updateHUDState(`Executing step ${i + 1}/${savedProfile.length}...`, 'info');

      if (step.action === 'click') {
        if (step.type === 'card') {
          const qBadge = await waitForElement('.apv-qitem__no');
          const clickArea = qBadge.closest('.apv-qitem__head') || qBadge.closest('.apv-qitem');
          clickArea.click();
        } else if (step.type === 'text') {

          // Smart bypass for conditional warnings (Record the decision anyway)
          if (step.value.toLowerCase() === 'record the decision anyway') {
            const result = await waitForMultipleTexts('.apv-qpop button, .apv-qpop div[role="button"], .apv-qpop .apv-step', [step.value, 'Done']);
            result.element.click();

            // If the warning didn't pop up and we clicked 'Done' directly, skip the next 'Done' step
            if (result.textFound.toLowerCase() === 'done') {
              logMessage('Warning skipped. Clicked Done directly.', 'info');
              if (i + 1 < savedProfile.length && savedProfile[i + 1].value.toLowerCase() === 'done') {
                i++; // Fast-forward profile index
              }
            }
          } else {
            const btn = await waitForElementByText('.apv-qpop button, .apv-qpop div[role="button"], .apv-qpop .apv-step', step.value);
            btn.click();
          }
        }
        await sleep(500);

      } else if (step.action === 'select') {
        // DYNAMIC TABLE SWEEP: Find all selects. Set table ones to 'Yes', set main one to the recorded value.
        const allSelects = Array.from(document.querySelectorAll('.apv-qpop select'));
        let mainSelectFound = false;

        for (const sel of allSelects) {
          const targetOpt = Array.from(sel.options).find(o => o.text.trim() === step.value);

          if (targetOpt) {
            // This is the main decision dropdown
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
            nativeSetter.call(sel, targetOpt.value);
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            mainSelectFound = true;
          } else {
            // This is a table dropdown. Auto-select 'Yes'.
            const yesOpt = Array.from(sel.options).find(o => o.text.trim() === 'Yes');
            if (yesOpt) {
              const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
              nativeSetter.call(sel, yesOpt.value);
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }

        if (!mainSelectFound) throw new Error(`Could not find dropdown option: ${step.value}`);
        await sleep(350);
      }
    }

    updateHUDState('Waiting for modal to close...', 'info');
    await waitForDisappear('.apv-qpop');

    logMessage('Syncing with server...', 'info');
    await waitForQueueRefresh(initialCardCount);
    await sleep(250);
    logMessage('Question cleared from queue!', 'success');
  }

  async function toggleAutomation() {
    const runBtn = document.getElementById('hud-run-btn');
    if (isRunning) {
      isRunning = false;
      runBtn.textContent = 'Run Loop';
      runBtn.style.background = '#0e6694';
      updateHUDState('Automation paused.', 'warn');
      updateQueueState();
      return;
    }

    isRunning = true;
    runBtn.textContent = 'Stop Loop';
    runBtn.style.background = '#dc2626';
    updateHUDState('Automation loop started.', 'info');

    while (isRunning) {
      try {
        const validCards = getValidCards();
        if (validCards.length === 0) {
          updateHUDState('All questions completed! 🎉', 'success');
          toggleAutomation();
          break;
        }
        await processSingleQuestion();
      } catch (err) {
        console.error('Playback error:', err);
        updateHUDState(`Error: ${err.message}`, 'error');
        toggleAutomation();
        break;
      }
    }
  }

  if (document.body) injectHUD();
  else document.addEventListener('DOMContentLoaded', injectHUD);

  document.addEventListener('START_APPROVAL_AUTOMATION', () => {
    if (!isRunning && savedProfile.length > 0) toggleAutomation();
  });
})();
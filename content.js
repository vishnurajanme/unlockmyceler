/**
 * UnlockMyCeler - Grid Sync & Video UI Version
 */

(function () {
  let isRunning = false;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
          reject(new Error(`Timeout waiting for button with text "${text}"`));
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
          reject(new Error("Timeout waiting for grid to refresh and remove the approved question"));
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

  function injectHUD() {
    if (document.getElementById('auto-approver-hud')) return;

    try {
      // Fetching a video file instead of an image
      const videoUrl = chrome.runtime.getURL('logo.mp4');

      const hud = document.createElement('div');
      hud.id = 'auto-approver-hud';
      hud.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-weight:800; font-size:14px; color:#0f172a;">⚡ UnlockMyCeler</span>
          <span id="hud-badge" style="background:#e0f2fe; color:#0b5a83; font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px;">Checking...</span>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:8px; text-align:center; margin-bottom:10px; overflow:hidden;">
          <video src="${videoUrl}" autoplay loop muted playsinline style="width: 100%; max-height: 110px; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"></video>
          <div style="display:none; font-size:24px;">🤖🍴</div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <div id="hud-status" style="font-size:11px; color:#475569; font-weight:600;">Scanning page...</div>
          <div id="hud-step-text" style="font-size:10px; color:#94a3b8; font-weight:700;">Step 0/6</div>
        </div>
        
        <div style="background:#e2e8f0; height:6px; border-radius:4px; overflow:hidden; margin-bottom:10px;">
          <div id="hud-progress" style="width:0%; height:100%; background:linear-gradient(90deg, #0284c7, #0ea5e9); transition:width 0.25s ease;"></div>
        </div>

        <div id="hud-logs" style="background:#0f172a; color:#38bdf8; font-family:monospace; font-size:10px; border-radius:8px; padding:8px; height:80px; overflow-y:auto; margin-bottom:12px; display:flex; flex-direction:column; gap:3px;">
          <div style="color:#94a3b8;">[UnlockMyCeler] Initialized securely.</div>
        </div>

        <button id="hud-toggle-btn" style="width:100%; background:#cbd5e1; color:#fff; border:none; border-radius:8px; padding:9px 0; font-size:12px; font-weight:700; cursor:not-allowed;" disabled>
          Waiting for Questions...
        </button>
      `;

      Object.assign(hud.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '290px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '16px',
        padding: '14px',
        boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.2)',
        zIndex: '999999',
        fontFamily: 'Poppins, system-ui, sans-serif'
      });

      document.body.appendChild(hud);

      document.getElementById('hud-toggle-btn').addEventListener('click', () => {
        if (isRunning) stopAutomation();
        else startAutomation();
      });

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

  function updateHUD(status, stepNumber, totalSteps = 6, logType = 'info') {
    const statusEl = document.getElementById('hud-status');
    const progressEl = document.getElementById('hud-progress');
    const stepTextEl = document.getElementById('hud-step-text');

    if (statusEl) statusEl.textContent = status;
    if (progressEl) progressEl.style.width = `${Math.round((stepNumber / totalSteps) * 100)}%`;
    if (stepTextEl) stepTextEl.textContent = `Step ${stepNumber}/${totalSteps}`;

    logMessage(status, logType);
  }

  function updateQueueState() {
    if (isRunning) return;

    const badgeEl = document.getElementById('hud-badge');
    const toggleBtn = document.getElementById('hud-toggle-btn');
    const statusEl = document.getElementById('hud-status');

    const validCards = getValidCards();
    const isLoading = document.querySelector('.spinner') || document.body.innerText.includes('Loading...');

    if (badgeEl) badgeEl.textContent = `${validCards.length} in queue`;

    if (isLoading) {
      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.style.background = '#cbd5e1';
        toggleBtn.style.cursor = 'not-allowed';
        toggleBtn.textContent = 'Page Loading...';
      }
      if (statusEl) statusEl.textContent = 'Loading page...';
    } else if (validCards.length === 0) {
      if (toggleBtn) {
        toggleBtn.disabled = true;
        toggleBtn.style.background = '#cbd5e1';
        toggleBtn.style.cursor = 'not-allowed';
        toggleBtn.textContent = 'No Questions Found';
      }
      if (statusEl) statusEl.textContent = 'Waiting for Q1...';
    } else {
      if (toggleBtn) {
        toggleBtn.disabled = false;
        toggleBtn.style.background = '#0e6694';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.textContent = 'Start Automation';
      }
      if (statusEl) statusEl.textContent = `Ready (${validCards.length} available)`;
    }
  }

  function setupQueueObserver() {
    updateQueueState();
    let timeoutId = null;
    const observer = new MutationObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateQueueState();
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function processSingleQuestion() {
    const initialCardCount = getValidCards().length;

    updateHUD('Locating Q1 card...', 1, 6, 'info');
    
    const qBadge = await waitForElement('.apv-qitem__no');
    const clickArea = qBadge.closest('.apv-qitem__head') || qBadge.closest('.apv-qitem');
    if (!clickArea) throw new Error("Could not find the clickable card header.");
    
    clickArea.click();
    logMessage('Clicked Q1 successfully.', 'success');

    await waitForElement('.apv-qpop');

    updateHUD('Opening Scrutiny...', 2, 6, 'info');
    const scrutinyBtn = await waitForElementByText('.apv-qpop button, .apv-qpop div[role="button"], .apv-qpop .apv-step', 'Scrutiny');
    scrutinyBtn.click();
    logMessage('Scrutiny tab opened.', 'success');

    updateHUD('Switching to Decision...', 3, 6, 'info');
    const decisionBtn = await waitForElementByText('.apv-qpop button, .apv-qpop div[role="button"], .apv-qpop .apv-step', 'Decision');
    decisionBtn.click();
    logMessage('Decision tab opened.', 'success');

    updateHUD('Selecting "Approved"...', 4, 6, 'info');
    const selectElem = await waitForElement('.apv-qpop select');
    
    const approvedOpt = Array.from(selectElem.options).find(o => o.text.trim().toLowerCase() === 'approved');
    if (approvedOpt) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      nativeSetter.call(selectElem, approvedOpt.value);
      selectElem.dispatchEvent(new Event('change', { bubbles: true }));
      logMessage('Option "Approved" selected.', 'success');
    }

    await sleep(250);

    updateHUD('Recording decision...', 5, 6, 'info');
    const recordBtn = await waitForElementByText('.apv-qpop button, .apv-qpop .apv-btn', 'Record decision');
    recordBtn.click();
    logMessage('Decision recorded, waiting...', 'success');

    updateHUD('Finalizing (Done)...', 6, 6, 'info');
    const doneBtn = await waitForElementByText('.apv-qpop button, .apv-qpop .apv-btn', 'Done');
    doneBtn.click();
    logMessage('Clicked Done.', 'success');

    updateHUD('Waiting for grid to refresh...', 6, 6, 'info');
    await waitForDisappear('.apv-qpop');
    
    logMessage('Syncing with server...', 'info');
    await waitForQueueRefresh(initialCardCount);
    
    await sleep(200); 
    logMessage('Question cleared from queue!', 'success');
  }

  async function startAutomation() {
    isRunning = true;
    const toggleBtn = document.getElementById('hud-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = 'Pause Automation';
      toggleBtn.style.background = '#dc2626';
    }

    logMessage('Automation loop started.', 'info');

    while (isRunning) {
      try {
        const validCards = getValidCards();
        if (validCards.length === 0) {
          updateHUD('All questions completed! 🎉', 6, 6, 'success');
          logMessage('Queue is empty. Mission accomplished.', 'success');
          stopAutomation();
          break;
        }
        await processSingleQuestion();
      } catch (err) {
        console.error('Automation error:', err);
        updateHUD('Error encountered!', 0, 6, 'error');
        logMessage(`Error: ${err.message}`, 'error');
        stopAutomation();
        break;
      }
    }
  }

  function stopAutomation() {
    isRunning = false;
    const toggleBtn = document.getElementById('hud-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = 'Start Automation';
      toggleBtn.style.background = '#0e6694';
    }
    const progressEl = document.getElementById('hud-progress');
    if (progressEl) progressEl.style.width = '0%';
    logMessage('Automation paused/stopped.', 'warn');
    updateQueueState();
  }

  if (document.body) {
    injectHUD();
  } else {
    document.addEventListener('DOMContentLoaded', injectHUD);
  }
})();
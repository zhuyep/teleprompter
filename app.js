(function () {
  'use strict';

  // ===== State =====
  const state = {
    fontSize: 48,
    speed: 50,          // 1-100, controls px/s
    lineHeight: 1.8,
    textColor: '#FFFFFF',
    mirror: false,
    playing: false,
    paused: false,
    scrollPos: 0,
    scripts: [],
  };

  const SPEED_MIN = 10;
  const SPEED_MAX = 100;
  const FONT_MIN = 24;
  const FONT_MAX = 120;
  const LH_MIN = 1.2;
  const LH_MAX = 3.0;

  // ===== DOM Elements =====
  const editorView = document.getElementById('editor-view');
  const playerView = document.getElementById('player-view');
  const scriptInput = document.getElementById('script-input');

  const fontSizeDisplay = document.getElementById('fontSize-display');
  const speedDisplay = document.getElementById('speed-display');
  const lineHeightDisplay = document.getElementById('lineHeight-display');

  const btnPlay = document.getElementById('btn-play');
  const btnStop = document.getElementById('btn-stop');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');
  const btnSlower = document.getElementById('btn-slower');
  const btnFaster = document.getElementById('btn-faster');
  const btnMirror = document.getElementById('btn-mirror');

  const iconPause = document.getElementById('icon-pause');
  const iconResume = document.getElementById('icon-resume');

  const scrollContainer = document.getElementById('scroll-container');
  const scrollText = document.getElementById('scroll-text');
  const guideLine = document.getElementById('guide-line');
  const progressFill = document.getElementById('progress-fill');
  const playerControls = document.getElementById('player-controls');

  const countdownOverlay = document.getElementById('countdown-overlay');
  const countdownNumber = document.getElementById('countdown-number');

  const speedIndicator = document.getElementById('speed-indicator');
  const speedIndicatorText = document.getElementById('speed-indicator-text');

  const btnSavedScripts = document.getElementById('btn-saved-scripts');
  const scriptsModal = document.getElementById('scripts-modal');
  const scriptsList = document.getElementById('scripts-list');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnSaveScript = document.getElementById('btn-save-script');

  // ===== Animation State =====
  let animationId = null;
  let lastTimestamp = null;
  let controlsTimeout = null;
  let speedIndicatorTimeout = null;

  // ===== Persistence =====
  function loadState() {
    try {
      const saved = localStorage.getItem('teleprompter_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
      }
      const scripts = localStorage.getItem('teleprompter_scripts');
      if (scripts) {
        state.scripts = JSON.parse(scripts);
      }
      const lastText = localStorage.getItem('teleprompter_lasttext');
      if (lastText) {
        scriptInput.value = lastText;
      }
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    try {
      const { fontSize, speed, lineHeight, textColor, mirror } = state;
      localStorage.setItem('teleprompter_settings', JSON.stringify({ fontSize, speed, lineHeight, textColor, mirror }));
    } catch (e) { /* ignore */ }
  }

  function saveLastText() {
    try {
      localStorage.setItem('teleprompter_lasttext', scriptInput.value);
    } catch (e) { /* ignore */ }
  }

  function saveScripts() {
    try {
      localStorage.setItem('teleprompter_scripts', JSON.stringify(state.scripts));
    } catch (e) { /* ignore */ }
  }

  // ===== UI Updates =====
  function updateDisplays() {
    fontSizeDisplay.textContent = state.fontSize;
    speedDisplay.textContent = state.speed;
    lineHeightDisplay.textContent = state.lineHeight.toFixed(1);

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === state.textColor);
    });

    btnMirror.textContent = state.mirror ? '开' : '关';
    btnMirror.classList.toggle('active', state.mirror);
  }

  function switchView(view) {
    editorView.classList.toggle('active', view === 'editor');
    playerView.classList.toggle('active', view === 'player');
  }

  // ===== Settings Adjustments =====
  document.querySelectorAll('.adj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const delta = parseFloat(btn.dataset.delta);

      if (target === 'fontSize') {
        state.fontSize = clamp(state.fontSize + delta, FONT_MIN, FONT_MAX);
      } else if (target === 'speed') {
        state.speed = clamp(state.speed + delta, SPEED_MIN, SPEED_MAX);
      } else if (target === 'lineHeight') {
        state.lineHeight = clamp(state.lineHeight + delta, LH_MIN, LH_MAX);
        state.lineHeight = Math.round(state.lineHeight * 10) / 10;
      }

      updateDisplays();
      saveSettings();
    });
  });

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.textColor = btn.dataset.color;
      updateDisplays();
      saveSettings();
    });
  });

  btnMirror.addEventListener('click', () => {
    state.mirror = !state.mirror;
    updateDisplays();
    saveSettings();
  });

  // Autosave text on input
  scriptInput.addEventListener('input', debounce(saveLastText, 500));

  // ===== Player Logic =====
  function getScrollSpeed() {
    return state.speed * 1.2;
  }

  function getTotalScroll() {
    return scrollText.scrollHeight;
  }

  function startCountdown(callback) {
    countdownOverlay.classList.remove('hidden');
    let count = 3;
    countdownNumber.textContent = count;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownNumber.textContent = count;
      } else {
        clearInterval(interval);
        countdownOverlay.classList.add('hidden');
        callback();
      }
    }, 1000);
  }

  function startPlaying() {
    const text = scriptInput.value.trim();
    if (!text) {
      scriptInput.focus();
      scriptInput.placeholder = '请先输入提词内容再开始播放！';
      return;
    }

    scrollText.textContent = text;
    scrollText.style.fontSize = state.fontSize + 'px';
    scrollText.style.lineHeight = state.lineHeight;
    scrollText.style.color = state.textColor;
    scrollText.classList.toggle('mirrored', state.mirror);
    document.documentElement.style.setProperty('--scroll-text-color', state.textColor);

    state.scrollPos = 0;
    scrollContainer.scrollTop = 0;

    switchView('player');
    showControls();

    startCountdown(() => {
      state.playing = true;
      state.paused = false;
      updatePauseIcon();
      lastTimestamp = null;
      animationId = requestAnimationFrame(scrollStep);
    });
  }

  function scrollStep(timestamp) {
    if (!state.playing) return;

    if (state.paused) {
      lastTimestamp = null;
      animationId = requestAnimationFrame(scrollStep);
      return;
    }

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
      animationId = requestAnimationFrame(scrollStep);
      return;
    }

    const elapsed = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const delta = getScrollSpeed() * elapsed;
    state.scrollPos += delta;

    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    if (state.scrollPos >= maxScroll) {
      state.scrollPos = maxScroll;
      scrollContainer.scrollTop = maxScroll;
      updateProgress();
      return;
    }

    scrollContainer.scrollTop = state.scrollPos;
    updateProgress();

    animationId = requestAnimationFrame(scrollStep);
  }

  function updateProgress() {
    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const pct = maxScroll > 0 ? (state.scrollPos / maxScroll) * 100 : 0;
    progressFill.style.width = pct + '%';
  }

  function stopPlaying() {
    state.playing = false;
    state.paused = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    switchView('editor');
  }

  function togglePause() {
    if (!state.playing) return;
    state.paused = !state.paused;
    if (!state.paused) {
      lastTimestamp = null;
    }
    updatePauseIcon();
    showControls();
  }

  function updatePauseIcon() {
    iconPause.classList.toggle('hidden', state.paused);
    iconResume.classList.toggle('hidden', !state.paused);
  }

  function resetScroll() {
    state.scrollPos = 0;
    scrollContainer.scrollTop = 0;
    lastTimestamp = null;
    updateProgress();
    showControls();
  }

  function adjustSpeed(delta) {
    state.speed = clamp(state.speed + delta, SPEED_MIN, SPEED_MAX);
    saveSettings();
    showSpeedIndicator();
    showControls();
  }

  function showSpeedIndicator() {
    speedIndicatorText.textContent = '速度: ' + state.speed;
    speedIndicator.classList.remove('hidden');
    speedIndicator.classList.add('show');

    clearTimeout(speedIndicatorTimeout);
    speedIndicatorTimeout = setTimeout(() => {
      speedIndicator.classList.remove('show');
      setTimeout(() => speedIndicator.classList.add('hidden'), 300);
    }, 800);
  }

  // ===== Player Controls Visibility =====
  function showControls() {
    playerControls.classList.remove('auto-hide');
    playerControls.classList.add('visible');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (state.playing && !state.paused) {
        playerControls.classList.add('auto-hide');
        playerControls.classList.remove('visible');
      }
    }, 3000);
  }

  // ===== Player Event Listeners =====
  btnPlay.addEventListener('click', startPlaying);
  btnStop.addEventListener('click', stopPlaying);
  btnPause.addEventListener('click', togglePause);
  btnReset.addEventListener('click', resetScroll);
  btnSlower.addEventListener('click', () => adjustSpeed(-5));
  btnFaster.addEventListener('click', () => adjustSpeed(5));

  // Tap on scroll area to toggle pause
  scrollContainer.addEventListener('click', (e) => {
    if (e.target.closest('.player-controls')) return;
    togglePause();
    showControls();
  });

  // Touch gestures in player for speed adjustment
  let touchStartY = null;
  scrollContainer.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  scrollContainer.addEventListener('touchend', (e) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        adjustSpeed(5);
      } else {
        adjustSpeed(-5);
      }
    }
    touchStartY = null;
  }, { passive: true });

  // Show controls on any touch
  playerView.addEventListener('touchstart', () => showControls(), { passive: true });

  // ===== Scripts Management =====
  btnSavedScripts.addEventListener('click', () => {
    renderScriptsList();
    scriptsModal.classList.remove('hidden');
  });

  btnCloseModal.addEventListener('click', () => {
    scriptsModal.classList.add('hidden');
  });

  document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    scriptsModal.classList.add('hidden');
  });

  btnSaveScript.addEventListener('click', () => {
    const text = scriptInput.value.trim();
    if (!text) return;

    const title = text.substring(0, 30).replace(/\n/g, ' ');
    const script = {
      id: Date.now(),
      title: title,
      text: text,
      date: new Date().toLocaleDateString('zh-CN'),
      charCount: text.length,
    };

    state.scripts.unshift(script);
    if (state.scripts.length > 50) state.scripts.pop();
    saveScripts();
    renderScriptsList();
  });

  function renderScriptsList() {
    if (state.scripts.length === 0) {
      scriptsList.innerHTML = '<p class="empty-hint">暂无保存的稿件</p>';
      return;
    }

    scriptsList.innerHTML = state.scripts.map(s => `
      <div class="script-item" data-id="${s.id}">
        <div class="script-item-text">
          <div class="script-item-title">${escapeHtml(s.title)}</div>
          <div class="script-item-meta">${s.date} · ${s.charCount}字</div>
        </div>
        <button class="script-item-delete" data-delete-id="${s.id}" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    `).join('');

    scriptsList.querySelectorAll('.script-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.script-item-delete')) return;
        const id = parseInt(item.dataset.id);
        const script = state.scripts.find(s => s.id === id);
        if (script) {
          scriptInput.value = script.text;
          saveLastText();
          scriptsModal.classList.add('hidden');
        }
      });
    });

    scriptsList.querySelectorAll('.script-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.deleteId);
        state.scripts = state.scripts.filter(s => s.id !== id);
        saveScripts();
        renderScriptsList();
      });
    });
  }

  // ===== Keyboard Shortcuts =====
  document.addEventListener('keydown', (e) => {
    if (!playerView.classList.contains('active')) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePause();
        break;
      case 'ArrowUp':
        e.preventDefault();
        adjustSpeed(-5);
        break;
      case 'ArrowDown':
        e.preventDefault();
        adjustSpeed(5);
        break;
      case 'Escape':
        e.preventDefault();
        stopPlaying();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        resetScroll();
        break;
    }
  });

  // ===== Utility Functions =====
  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Service Worker Registration =====
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // ===== Init =====
  loadState();
  updateDisplays();
})();

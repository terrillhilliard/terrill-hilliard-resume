// voice-agent.js — "Ask my AI twin"
// A custom red microphone button that starts a live voice conversation with
// Terrill's ElevenLabs Conversational AI agent (the SAME ElevenLabs stack used
// to build JURIS AI). Built on the @elevenlabs/client SDK for full control of
// the UI — no default widget chrome.
//
// ── ACTIVATION ──────────────────────────────────────────────────────────────
// AGENT_ID is set below. Configure the agent's system prompt, knowledge base,
// and guardrails in the ElevenLabs dashboard (see VOICE_AGENT_SETUP.md).
// Append ?agentpreview=1 to preview the button/box UI without starting a call.
// ────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var AGENT_ID = 'agent_6601kwefaz4ne8ytrwxb717pjx99';
  var SDK_URL = 'https://esm.sh/@elevenlabs/client';

  var previewMode = /[?&]agentpreview=1/.test(location.search);
  if (!AGENT_ID && !previewMode) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mic button (red) ---------- */
  var micSvg =
    '<svg class="ai-mic-ico" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>' +
    '<path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>' +
    '<line x1="8" y1="23" x2="16" y2="23"/></svg>';
  var stopSvg =
    '<svg class="ai-mic-ico" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">' +
    '<rect x="7" y="7" width="10" height="10" rx="2"/></svg>';

  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'ai-mic-fab';
  fab.setAttribute('aria-label', 'Talk to my AI twin by voice');
  fab.innerHTML = '<span class="ai-mic-ring" aria-hidden="true"></span>' +
                  '<span class="ai-mic-glyph">' + micSvg + '</span>';
  document.body.appendChild(fab);

  var statusEl = document.createElement('div');
  statusEl.className = 'ai-mic-status';
  statusEl.setAttribute('role', 'status');
  document.body.appendChild(statusEl);

  var glyph = fab.querySelector('.ai-mic-glyph');
  var state = 'idle'; // idle | connecting | active
  var convo = null;

  function setState(s) {
    state = s;
    fab.classList.toggle('is-connecting', s === 'connecting');
    fab.classList.toggle('is-active', s === 'active');
    glyph.innerHTML = s === 'active' ? stopSvg : micSvg;
    fab.setAttribute('aria-label', s === 'active'
      ? 'End voice conversation' : 'Talk to my AI twin by voice');
  }
  function setStatus(txt) {
    statusEl.textContent = txt || '';
    statusEl.classList.toggle('show', !!txt);
  }

  async function start() {
    if (previewMode && !AGENT_ID) { setStatus('Preview mode'); return; }
    setState('connecting');
    setStatus('Connecting…');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      var mod = await import(SDK_URL);
      convo = await mod.Conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'webrtc',
        onConnect: function () { setState('active'); setStatus('Listening…'); },
        onDisconnect: function () { convo = null; setState('idle'); setStatus(''); },
        onModeChange: function (m) {
          if (state !== 'active') return;
          setStatus(m && m.mode === 'speaking' ? 'Speaking…' : 'Listening…');
        },
        onError: function () { convo = null; setState('idle'); flash('Something went wrong — try again'); }
      });
    } catch (err) {
      convo = null;
      setState('idle');
      flash(/denied|permission|notallowed/i.test(String(err && err.name || err))
        ? 'Microphone access needed' : 'Could not connect — try again');
    }
  }

  async function stop() {
    if (convo) { try { await convo.endSession(); } catch (e) {} convo = null; }
    setState('idle');
    setStatus('');
  }

  function flash(msg) {
    setStatus(msg);
    setTimeout(function () { if (state === 'idle') setStatus(''); }, 3200);
  }

  fab.addEventListener('click', function () {
    if (state === 'active' || state === 'connecting') stop(); else start();
  });

  /* ---------- Collapsible intro panel + chevron toggle ----------
     Collapsed by default: only the mic FAB shows. A small chevron toggle
     (left of the mic) expands the info panel; the panel's ✕ or the toggle
     collapses it. Open/closed persists in sessionStorage (survives page
     navigation, resets next session). */
  var panel = document.createElement('aside');
  panel.className = 'ai-callout';
  panel.setAttribute('aria-label', 'AI voice assistant');
  panel.setAttribute('role', 'dialog');
  panel.innerHTML =
    '<button class="ai-callout-x" aria-label="Collapse">×</button>' +
    '<p class="ai-callout-body"><span class="ai-callout-wave">🎙️</span> Tap the red mic to talk by voice. ' +
    'Ask it anything about my experience, projects, or availability.</p>';
  document.body.appendChild(panel);

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ai-panel-toggle';
  toggle.setAttribute('aria-label', 'About the AI assistant');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2.6" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
  document.body.appendChild(toggle);

  var panelOpen = false;
  function setPanel(open) {
    panelOpen = open;
    panel.classList.toggle('ai-callout-show', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    try { sessionStorage.setItem('aiPanelOpen', open ? '1' : '0'); } catch (e) {}
  }
  toggle.addEventListener('click', function () { setPanel(!panelOpen); });
  panel.querySelector('.ai-callout-x').addEventListener('click', function () { setPanel(false); });

  // Default OPEN (popped up) to encourage clicking; respect a prior collapse
  // this session so it doesn't re-open after the user dismisses it.
  var saved = null;
  try { saved = sessionStorage.getItem('aiPanelOpen'); } catch (e) {}
  if (saved !== '0') {
    if (reduceMotion) setPanel(true);
    else setTimeout(function () { setPanel(true); }, 600);
  }
})();

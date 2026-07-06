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

  /* ---------- Intro callout (red, dismissible, once per session) ---------- */
  if (!sessionStorage.getItem('aiCalloutDismissed')) {
    var callout = document.createElement('aside');
    callout.className = 'ai-callout';
    callout.setAttribute('aria-label', 'AI voice assistant');
    callout.innerHTML =
      '<button class="ai-callout-x" aria-label="Dismiss">×</button>' +
      '<p class="ai-callout-title"><span class="ai-callout-wave">🎙️</span> Talk to my AI twin</p>' +
      '<p class="ai-callout-body">Tap the red mic to <strong>talk by voice</strong>. Ask it anything ' +
      'about my experience, projects, or availability.</p>' +
      '<p class="ai-callout-credit">Built on the same ElevenLabs stack I used to ship <strong>JURIS AI</strong>.</p>';
    document.body.appendChild(callout);
    callout.querySelector('.ai-callout-x').addEventListener('click', function () {
      callout.classList.add('ai-callout-hide');
      sessionStorage.setItem('aiCalloutDismissed', '1');
    });
    if (reduceMotion) callout.classList.add('ai-callout-show');
    else setTimeout(function () { callout.classList.add('ai-callout-show'); }, 1400);
  }
})();

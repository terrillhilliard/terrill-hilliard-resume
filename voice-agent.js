// voice-agent.js — "Ask my AI twin"
// ElevenLabs Conversational AI agent embedded on the resume site: voice + text,
// floating launcher, branded intro callout. This is the SAME ElevenLabs stack
// used to build JURIS AI — the agent itself is a live demo of that skill set.
//
// ── ACTIVATION ──────────────────────────────────────────────────────────────
// 1. In the ElevenLabs dashboard, create a Conversational AI agent.
// 2. Attach a knowledge base (upload the resume PDF + paste the project/blog
//    write-ups) so it answers accurately about Terrill.
// 3. Add guardrails in the agent's System Prompt (see SETUP.md in this repo).
// 4. Copy the Agent ID and paste it into AGENT_ID below, then redeploy.
//
// Until AGENT_ID is set, this script is fully inert on the live site — nothing
// renders. Append ?agentpreview=1 to the URL to preview the branded callout UI
// without a live agent.
// ────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var AGENT_ID = 'agent_6601kwefaz4ne8ytrwxb717pjx99'; // ElevenLabs "Terrill Hilliard Resume Website" agent

  var previewMode = /[?&]agentpreview=1/.test(location.search);
  if (!AGENT_ID && !previewMode) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1) Load the official ElevenLabs ConvAI widget (handles voice, mic
  //    permissions, STT -> LLM -> TTS, and a built-in text-chat fallback).
  if (AGENT_ID) {
    var widget = document.createElement('elevenlabs-convai');
    widget.setAttribute('agent-id', AGENT_ID);
    // Customize appearance: remove the default "Need help?" text, brand the
    // launcher orb navy/red, and lead with a clear speaker icon + voice CTA.
    widget.setAttribute('action-text', '🔊 Talk to my AI twin');
    widget.setAttribute('start-call-text', 'Start voice chat');
    widget.setAttribute('end-call-text', 'End chat');
    widget.setAttribute('expand-text', 'Chat by text');
    widget.setAttribute('listening-text', 'Listening…');
    widget.setAttribute('speaking-text', 'Speaking…');
    widget.setAttribute('variant', 'expandable');
    widget.setAttribute('avatar-orb-color-1', '#0a1f44');
    widget.setAttribute('avatar-orb-color-2', '#c8102e');
    document.body.appendChild(widget);

    var s = document.createElement('script');
    s.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    s.async = true;
    s.type = 'text/javascript';
    document.body.appendChild(s);
  }

  // 2) Branded intro callout — dismissible, shown once per browser session.
  if (sessionStorage.getItem('aiCalloutDismissed')) return;

  var callout = document.createElement('aside');
  callout.className = 'ai-callout';
  callout.setAttribute('aria-label', 'AI assistant');
  callout.innerHTML =
    '<button class="ai-callout-x" aria-label="Dismiss">×</button>' +
    '<p class="ai-callout-title"><span class="ai-callout-wave">🔊</span> Talk to my AI twin</p>' +
    '<p class="ai-callout-body">Tap the speaker below to <strong>talk by voice</strong> — or type. Ask it anything about my experience, projects, or availability.</p>' +
    '<p class="ai-callout-credit">Built on the same ElevenLabs stack I used to ship <strong>JURIS AI</strong>.</p>';
  document.body.appendChild(callout);

  callout.querySelector('.ai-callout-x').addEventListener('click', function () {
    callout.classList.add('ai-callout-hide');
    sessionStorage.setItem('aiCalloutDismissed', '1');
  });

  if (reduceMotion) {
    callout.classList.add('ai-callout-show');
  } else {
    setTimeout(function () { callout.classList.add('ai-callout-show'); }, 1400);
  }
})();

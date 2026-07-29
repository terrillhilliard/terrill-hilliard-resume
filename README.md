# terrill-hilliard-resume

Personal resume and portfolio site for **Terrill Hilliard** — IT Support & Security Operations professional (M.S. Cybersecurity · CySA+ · PenTest+ · ISC2 CC).

**Live:** https://terrillhilliardresume.vercel.app

## What's here

- A fast, hand-built resume site — no framework, just vanilla HTML, CSS, and JavaScript.
- A short security blog (for example, SOC investigation playbooks).
- An optional "Ask my AI" voice assistant, built on the same ElevenLabs Conversational AI stack behind my JURIS AI project (setup in `VOICE_AGENT_SETUP.md`).

## Stack

Vanilla HTML / CSS / JavaScript, deployed on Vercel with no build step. The voice
agent uses the `@elevenlabs/client` SDK loaded from a CDN. No secrets are stored in
the repo; the ElevenLabs Agent ID is a public client-side identifier, and the
agent's knowledge base holds only public professional information.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | The resume / landing page |
| `blog.html`, `post-*.html` | Blog and write-ups |
| `styles.css` | Styling |
| `script.js`, `fx.js`, `feed.js` | Interactions, animated background, blog feed |
| `voice-agent.js` | Optional ElevenLabs voice assistant |
| `assets/`, `favicon.svg` | Static assets |

## Featured project

**netrecon** — an open-source network reconnaissance, monitoring, and threat-intel
toolkit I built in Python (host/version scanning, ARP-spoof detection, live CVE
lookups, an AI security analyst, and a web console).
[Code](https://github.com/terrillhilliard/netrecon) ·
[Live demo](https://recon-console-theta.vercel.app)

## Contact

- LinkedIn: https://linkedin.com/in/terrill-hilliard-a989482b8/
- Live resume: https://terrillhilliardresume.vercel.app

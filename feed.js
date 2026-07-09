// feed.js — terminal-style microblog ("Thoughts"). Vanilla JS, no deps.
//
// ── HOW TO POST A NEW THOUGHT ────────────────────────────────────────────────
// Add an object to the TOP of the THOUGHTS array below and redeploy. Fields:
//   id      unique string            e.g. 't007'
//   date    ISO date/time            e.g. '2026-07-10T14:30'
//   text    the thought itself       supports #tags, `inline code`, https:// links
//   tags    array of lowercase tags  e.g. ['redteam','soc']  (no '#')
//   pinned  (optional) true          keeps it at the very top
//   likes   (optional) number        cosmetic starting star count
//   link    (optional) {href,label}  a "read more" link (e.g. a full write-up)
// That single edit is the whole "posting" flow for this static site.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var THOUGHTS = [
    {
      id: 't006', date: '2026-07-09T14:30', pinned: true, likes: 12,
      tags: ['soc', 'blueteam'],
      text: "Hot take that isn't hot: the difference between a junior and a senior SOC analyst " +
            "isn't memorized alerts — it's a repeatable investigation playbook. The tool changes, " +
            "the process shouldn't. Wrote up how I think about it. #soc #blueteam",
      link: { href: 'post-soc-investigation-playbooks.html', label: 'full write-up' }
    },
    {
      id: 't005', date: '2026-07-07T21:10', likes: 9,
      tags: ['redteam', 'homelab'],
      text: "Best detections I've written all came from attacking my own box first. Ran " +
            "`nmap -sV -p- target.local`, then `hydra` against SSH, then went hunting for my own " +
            "noise in Elastic. You can't tune what you've never triggered. #redteam #homelab"
    },
    {
      id: 't004', date: '2026-07-05T16:45', likes: 21,
      tags: ['ai', 'automation'],
      text: "Shipped another iteration of JURIS AI today — sub-second voice + SMS intake that " +
            "qualifies a lead before you ever pick up. Agentic AI isn't a demo anymore, it's a " +
            "coworker that never sleeps. #ai #automation"
    },
    {
      id: 't003', date: '2026-07-02T09:05', likes: 7,
      tags: ['itsupport'],
      text: "Triage rule I'd tattoo on every new tech: sort by blast radius, not by how loud the " +
            "user is. One down print server for a whole floor beats one VP's laptop, every time. #itsupport"
    },
    {
      id: 't002', date: '2026-06-28T23:40', likes: 15,
      tags: ['cli'],
      text: "Underrated one-liner appreciation post: `history | awk '{print $2}' | sort | uniq -c | " +
            "sort -rn | head` — instantly shows the commands you actually live in. Mine is embarrassingly " +
            "`grep`. #cli"
    },
    {
      id: 't001', date: '2026-06-20T12:00', likes: 6,
      tags: ['certs', 'learning'],
      text: "Passed PenTest+ to go with CySA+ and the ISC2 CC. Certs don't make you good — the labs " +
            "you build chasing them do. Now finishing the M.S. and building the next thing. #certs #learning"
    }
  ];

  var listEl  = document.getElementById('feedList');
  var emptyEl = document.getElementById('feedEmpty');
  var tagsEl  = document.getElementById('feedTags');
  var countEl = document.getElementById('feedCount');
  var clockEl = document.getElementById('feedClock');
  var cmdForm = document.getElementById('feedCmd');
  var cmdInput = document.getElementById('feedCmdInput');
  var cmdOut  = document.getElementById('feedCmdOut');
  if (!listEl) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stars = load('feedStars', {});      // id -> true
  var state = { q: '', tag: '', order: 'latest' };

  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- helpers ---------- */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
  }
  // escape first, then decorate #tags, `code`, and links (all from trusted input)
  function fmt(text) {
    var out = esc(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/(https?:\/\/[^\s]+)/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
    out = out.replace(/(^|\s)#([a-z0-9_]+)/gi, function (m, pre, tag) {
      return pre + '<button type="button" class="t-tag" data-tag="' + tag.toLowerCase() + '">#' + tag + '</button>';
    });
    return out;
  }
  function relTime(iso) {
    var then = new Date(iso.replace(' ', 'T')).getTime();
    var s = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (s < 60) return s + 's';
    var m = Math.floor(s / 60); if (m < 60) return m + 'm';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h';
    var d = Math.floor(h / 24); if (d < 7) return d + 'd';
    var dt = new Date(then);
    var mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()];
    return mo + ' ' + dt.getDate();
  }
  function fullTime(iso) {
    var dt = new Date(iso.replace(' ', 'T'));
    return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  function likeCount(t) { return (t.likes || 0) + (stars[t.id] ? 1 : 0); }

  /* ---------- filtering / sorting ---------- */
  function visible() {
    var q = state.q.toLowerCase(), tag = state.tag;
    var arr = THOUGHTS.filter(function (t) {
      if (tag && t.tags.indexOf(tag) === -1) return false;
      if (q && (t.text + ' ' + t.tags.join(' ')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    arr.sort(function (a, b) {
      var da = new Date(a.date.replace(' ', 'T')), db = new Date(b.date.replace(' ', 'T'));
      var base = state.order === 'oldest' ? da - db : db - da;
      // pinned floats to top only in an unfiltered latest view
      if (!state.q && !state.tag && state.order === 'latest') {
        if (a.pinned && !b.pinned) return -1;
        if (b.pinned && !a.pinned) return 1;
      }
      return base;
    });
    return arr;
  }

  /* ---------- render ---------- */
  function icon(name) {
    var p = {
      star: '<path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z"/>',
      copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
      share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v13"/><path d="M8 7l4-4 4 4"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p[name] + '</svg>';
  }

  function render() {
    var arr = visible();
    listEl.innerHTML = '';
    emptyEl.hidden = arr.length > 0;

    arr.forEach(function (t, i) {
      var item = document.createElement('article');
      item.className = 'feed-item';
      if (!reduceMotion) item.style.animationDelay = (i * 55) + 'ms';

      var starred = !!stars[t.id];
      var num = 'thought_' + t.id.replace(/\D/g, '');

      item.innerHTML =
        '<span class="feed-item-av" aria-hidden="true">T</span>' +
        '<div class="feed-item-main">' +
          (t.pinned ? '<div class="feed-pin">📌 pinned</div>' : '') +
          '<div class="feed-item-head">' +
            '<span class="fi-name">Terrill Hilliard</span>' +
            '<span class="fi-handle">@terrillhilliard</span>' +
            '<span class="fi-sep">&middot;</span>' +
            '<time class="fi-time" datetime="' + t.date + '" title="' + esc(fullTime(t.date)) + '">' + relTime(t.date) + '</time>' +
          '</div>' +
          '<div class="feed-item-cmd">$ cat ' + num + '.md</div>' +
          '<div class="feed-item-body">' + fmt(t.text) + '</div>' +
          (t.link ? '<a class="feed-item-link" href="' + t.link.href + '">&rsaquo; ' + esc(t.link.label) + '</a>' : '') +
          '<div class="feed-actions">' +
            '<button type="button" class="feed-act star' + (starred ? ' on' : '') + '" data-act="star" data-id="' + t.id + '">' +
              icon('star') + '<span class="c">' + likeCount(t) + '</span></button>' +
            '<button type="button" class="feed-act" data-act="copy" data-id="' + t.id + '">' +
              icon('copy') + '<span class="c">copy</span></button>' +
            '<button type="button" class="feed-act" data-act="share" data-id="' + t.id + '">' +
              icon('share') + '<span class="c">share</span></button>' +
          '</div>' +
        '</div>';
      listEl.appendChild(item);
    });
  }

  function renderTags() {
    var seen = {};
    THOUGHTS.forEach(function (t) { t.tags.forEach(function (x) { seen[x] = (seen[x] || 0) + 1; }); });
    tagsEl.innerHTML = '';
    Object.keys(seen).sort().forEach(function (tag) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'feed-tag' + (state.tag === tag ? ' active' : '');
      b.setAttribute('data-tag', tag);
      b.textContent = '#' + tag;
      tagsEl.appendChild(b);
    });
    countEl.textContent = THOUGHTS.length;
  }

  /* ---------- interactions ---------- */
  function setTag(tag) {
    state.tag = (state.tag === tag) ? '' : tag;
    state.q = '';
    renderTags(); render();
    out(state.tag ? "tag " + state.tag + " — " + visible().length + " result(s)" : "showing all", 'ok');
  }

  document.addEventListener('click', function (e) {
    var tagBtn = e.target.closest('.feed-tag, .t-tag');
    if (tagBtn) { setTag(tagBtn.getAttribute('data-tag')); return; }

    var act = e.target.closest('.feed-act');
    if (!act) return;
    var id = act.getAttribute('data-id');
    var t = THOUGHTS.filter(function (x) { return x.id === id; })[0];
    var kind = act.getAttribute('data-act');

    if (kind === 'star') {
      stars[id] = !stars[id];
      save('feedStars', stars);
      act.classList.toggle('on', stars[id]);
      act.querySelector('.c').textContent = likeCount(t);
      if (stars[id] && !reduceMotion) { act.classList.remove('pop'); void act.offsetWidth; act.classList.add('pop'); }
    } else if (kind === 'copy') {
      copyText(t.text, act);
    } else if (kind === 'share') {
      var url = 'https://x.com/intent/post?text=' + encodeURIComponent(t.text) +
                '&url=' + encodeURIComponent('https://terrillhilliardresume.vercel.app/blog.html');
      window.open(url, '_blank', 'noopener,width=560,height=640');
    }
  });

  function copyText(text, btn) {
    var done = function () {
      var c = btn.querySelector('.c'), old = c.textContent;
      c.textContent = 'copied ✓'; btn.classList.add('ok');
      setTimeout(function () { c.textContent = old; btn.classList.remove('ok'); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ---------- command bar ---------- */
  function out(msg, kind) {
    cmdOut.textContent = msg || '';
    cmdOut.className = 'feed-cmd-out' + (kind ? ' ' + kind : '');
  }
  var HELP = [
    "commands:",
    "  help            show this list",
    "  grep <term>     filter thoughts by text/tag",
    "  tag <name>      filter by a single #tag",
    "  latest|oldest   sort order",
    "  clear|reset     clear all filters",
    "  whoami          about me",
    "  date            current date/time"
  ].join('\n');

  function runCommand(raw) {
    var line = raw.trim();
    if (!line) return;
    var parts = line.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var arg = parts.slice(1).join(' ');

    if (line.charAt(0) === '#') { setTag(line.slice(1).toLowerCase()); return; }

    switch (cmd) {
      case 'help': case '?': out(HELP, 'ok'); break;
      case 'grep': case 'search': case 'find':
        state.q = arg; state.tag = ''; renderTags(); render();
        out(arg ? "grep '" + arg + "' — " + visible().length + " result(s)" : "usage: grep <term>", arg ? 'ok' : 'err');
        break;
      case 'tag': case 'filter':
        if (arg) setTag(arg.replace(/^#/, '').toLowerCase()); else out("usage: tag <name>", 'err');
        break;
      case 'latest': case 'newest': state.order = 'latest'; render(); out("sorted: latest first", 'ok'); break;
      case 'oldest': state.order = 'oldest'; render(); out("sorted: oldest first", 'ok'); break;
      case 'clear': case 'reset': case 'ls':
        state = { q: '', tag: '', order: 'latest' }; renderTags(); render(); out("showing all " + THOUGHTS.length + " thoughts", 'ok');
        break;
      case 'whoami': out("terrill — IT support & security operations. red + blue + AI.", 'ok'); break;
      case 'date': out(new Date().toString(), 'ok'); break;
      case 'sudo': out("nice try 🙂", 'err'); break;
      default: out("command not found: " + cmd + " — type 'help'", 'err');
    }
  }

  cmdForm.addEventListener('submit', function (e) {
    e.preventDefault();
    runCommand(cmdInput.value);
    cmdInput.value = '';
    cmdInput.parentNode.classList.remove('typing');
  });
  cmdInput.addEventListener('input', function () {
    cmdInput.parentNode.classList.toggle('typing', cmdInput.value.length > 0);
  });

  /* ---------- live clock ---------- */
  function tick() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    clockEl.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  tick(); setInterval(tick, 1000);

  /* ---------- go ---------- */
  renderTags();
  render();
})();

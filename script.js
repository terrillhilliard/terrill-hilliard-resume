// Scroll reveal
(function () {
  const items = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  items.forEach((el) => io.observe(el));
})();

// Scroll progress bar (techy top-of-page indicator)
(function () {
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  var ticking = false;
  function update() {
    var st = window.scrollY;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (docH > 0 ? st / docH : 0).toFixed(4) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

// Hero HUD — live capability terminals
// Each capability slide types a real-time command + fake output. Cycles
// capabilities, alternates the command shown per visit, triggers via
// IntersectionObserver, and honors prefers-reduced-motion.
(function () {
  var rot = document.getElementById('hudRotator');
  if (!rot) return;
  var slides = [].slice.call(rot.querySelectorAll('.hud-slide'));
  var terms = slides.map(function (s) { return s.querySelector('.hud-term'); });
  var ticks = [].slice.call(document.querySelectorAll('.hud-tick'));
  var n = slides.length;
  if (n < 1 || terms.some(function (t) { return !t; })) return;

  // line types: cmd | out | ok | warn | alert
  var CAPS = [
    { sessions: [
      [ {t:'cmd', s:'python triage.py --summarize alerts.json'},
        {t:'out', s:'▸ 142 alerts → 6 clusters'},
        {t:'out', s:'▸ 3 flagged high-severity'},
        {t:'ok',  s:'[done] summary emailed to SOC'} ],
      [ {t:'cmd', s:'juris deploy --agent voice,sms'},
        {t:'out', s:'▸ provisioning agents…'},
        {t:'ok',  s:'✓ online · p50 latency 0.8s'} ]
    ] },
    { sessions: [
      [ {t:'cmd', s:'nmap -sV -p- target.local'},
        {t:'out', s:'22/tcp  open  ssh    OpenSSH 9.6'},
        {t:'out', s:'80/tcp  open  http   nginx 1.25'},
        {t:'out', s:'443/tcp open  https  nginx 1.25'},
        {t:'ok',  s:'[+] 3 open ports · versions mapped'} ],
      [ {t:'cmd', s:'hydra -l admin -P rockyou.txt ssh://target'},
        {t:'out', s:'[ATTEMPT] admin:••••••'},
        {t:'warn',s:'[22][ssh] valid credential found'},
        {t:'alert',s:'[!] weak password flagged'} ]
    ] },
    { sessions: [
      [ {t:'cmd', s:"splunk search 'sourcetype=firewall | stats count by src_ip'"},
        {t:'out', s:'src_ip            count'},
        {t:'out', s:'10.4.2.9            812'},
        {t:'out', s:'45.83.11.7         1,204'},
        {t:'alert',s:'[alert] brute-force → notable event'} ],
      [ {t:'cmd', s:'elastic detect --rule ssh_bruteforce'},
        {t:'out', s:'▸ 27 failed logins / 60s'},
        {t:'out', s:'▸ MITRE T1110 matched'},
        {t:'ok',  s:'[ir] incident opened · NIST 800-61'} ]
    ] },
    { sessions: [
      [ {t:'cmd', s:'psql -c "SELECT count(*) FROM events;"'},
        {t:'out', s:' count'},
        {t:'out', s:' 10,412,338'},
        {t:'ok',  s:'[ok] 10M+ rows scanned in 1.2s'} ],
      [ {t:'cmd', s:'pwsh ./Automate-Tickets.ps1'},
        {t:'out', s:'▸ 48 tickets triaged'},
        {t:'out', s:'▸ assets synced to CMDB'},
        {t:'ok',  s:'[done] runtime 3.4s'} ]
    ] }
  ];

  var cursor = document.createElement('span');
  cursor.className = 'cursor';

  function buildLine(term, line) {
    var el = document.createElement('span');
    el.className = 'tl ' + line.t;
    term.appendChild(el);
    return el;
  }
  function placeCursor(el) { if (el && el.appendChild) el.appendChild(cursor); }

  function renderStatic() {
    terms.forEach(function (term, i) {
      term.innerHTML = '';
      CAPS[i].sessions[0].forEach(function (line) {
        var el = buildLine(term, line);
        if (line.t === 'cmd') {
          var p = document.createElement('span'); p.className = 'prompt'; p.textContent = '$ ';
          el.appendChild(p);
          el.appendChild(document.createTextNode(line.s));
        } else {
          el.textContent = line.s;
        }
      });
    });
  }

  function setActive(i) {
    slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    ticks.forEach(function (t, k) { t.classList.toggle('is-active', k === i); });
  }

  // --- reduced motion: static output, manual switching only ---
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderStatic();
    ticks.forEach(function (tk, idx) {
      tk.addEventListener('click', function () { setActive(idx); });
    });
    return;
  }

  // --- animated engine ---
  var cur = 0, visits = new Array(n).fill(0), token = 0, timers = [], playing = false;
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function wait(ms) { return new Promise(function (res) { timers.push(setTimeout(res, ms)); }); }

  function typeSession(i) {
    var mine = ++token;
    var term = terms[i];
    var session = CAPS[i].sessions[visits[i] % CAPS[i].sessions.length];
    visits[i]++;
    term.innerHTML = '';

    (async function () {
      for (var li = 0; li < session.length; li++) {
        if (mine !== token) return;
        var line = session[li];
        var el = buildLine(term, line);
        if (line.t === 'cmd') {
          var p = document.createElement('span'); p.className = 'prompt'; p.textContent = '$ ';
          el.appendChild(p);
          var txt = document.createTextNode('');
          el.appendChild(txt);
          for (var ci = 0; ci < line.s.length; ci++) {
            if (mine !== token) return;
            txt.textContent += line.s.charAt(ci);
            placeCursor(el);
            await wait(26 + Math.random() * 42);
          }
          await wait(360);
        } else {
          await wait(110);
          if (mine !== token) return;
          el.textContent = line.s;
          placeCursor(el);
          await wait(150);
        }
      }
      if (mine !== token) return;
      placeCursor(term.lastChild);
      await wait(2000);
      if (mine !== token || !playing) return;
      cur = (cur + 1) % n;
      setActive(cur);
      typeSession(cur);
    })();
  }

  function start() { if (playing) return; playing = true; setActive(cur); typeSession(cur); }
  function stop() { playing = false; token++; clearTimers(); }

  ticks.forEach(function (tk, idx) {
    tk.addEventListener('click', function () {
      token++; clearTimers();
      cur = idx; setActive(cur);
      if (playing) typeSession(cur);
    });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
  }, { threshold: 0.25 });
  io.observe(rot);
})();

// Mobile nav toggle
(function () {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMobile');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => menu.classList.toggle('open'));
  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => menu.classList.remove('open'))
  );
})();

// Contact form — composes a pre-filled email (no backend on this static site)
(function () {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form || !status) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    const subject = 'Portfolio contact — ' + firstName + ' ' + lastName;
    const bodyLines = [
      'Name: ' + firstName + ' ' + lastName,
      'Phone: ' + phone,
      'Email: ' + email,
      '',
      'Message:',
      message || '(none)'
    ];
    const mailto =
      'mailto:terrillhilliard96@gmail.com' +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(bodyLines.join('\n'));

    window.location.href = mailto;
    status.textContent = 'Opening your email client to send this to Terrill…';
  });
})();

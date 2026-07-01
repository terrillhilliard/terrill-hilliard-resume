// Starfield background — drawn once (static) so it never forces glass
// cards' backdrop-filter to re-sample a changing layer every frame.
(function () {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');

  function draw() {
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const count = Math.floor((w * h) / 9000);
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.1 + 0.2;
      const a = Math.random() * 0.6 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,240,255,${a})`;
      ctx.fill();
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 150);
  });
  draw();
})();

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

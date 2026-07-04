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

// Hero HUD capability rotator
(function () {
  var rot = document.getElementById('hudRotator');
  if (!rot) return;
  var slides = rot.querySelectorAll('.hud-slide');
  var ticks = document.querySelectorAll('.hud-tick');
  if (slides.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var i = 0;
  setInterval(function () {
    slides[i].classList.remove('is-active');
    if (ticks[i]) ticks[i].classList.remove('is-active');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-active');
    if (ticks[i]) ticks[i].classList.add('is-active');
  }, 2800);
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

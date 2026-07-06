// fx.js — 3D scene: perspective-projected particle field + rotating wireframe
// icosahedron, layered mouse/scroll parallax, holo-shine card tilt, staggered
// reveals. One shared rAF loop; respects prefers-reduced-motion; cursor
// effects disabled on touch devices.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var isNarrow = window.matchMedia('(max-width: 860px)').matches;

  /* ---------- Stagger delays for grouped reveals (runs before script.js IO) ---------- */
  ['.skills-grid', '.stat-cards', '.cert-row', '.post-grid'].forEach(function (sel) {
    var group = document.querySelector(sel);
    if (!group) return;
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.classList.add('reveal', 'reveal-3d');
      child.style.transitionDelay = (i * 90) + 'ms';
    });
  });

  if (reduceMotion) {
    var c = document.getElementById('hero3d');
    if (c) drawStaticFrame(c);
    return;
  }

  /* ---------- Shared state ---------- */
  var mouseTX = 0, mouseTY = 0;
  var mouseX = 0, mouseY = 0;
  var running = true;

  if (finePointer) {
    window.addEventListener('pointermove', function (e) {
      mouseTX = e.clientX / window.innerWidth - 0.5;
      mouseTY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  /* ---------- 3D scene ---------- */
  var canvas = document.getElementById('hero3d');
  var scene = null;
  if (canvas) {
    var start = function () { scene = createScene(canvas); };
    if (document.readyState === 'complete') setTimeout(start, 50);
    else window.addEventListener('load', function () { setTimeout(start, 50); });
  }

  function createScene(canvas) {
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var FOV = 900;
    var w = 0, h = 0, cube = 0;
    var pts = [];       // {x,y,z,r,accent}
    var pairs = [];     // static link pairs [i,j]
    var ico = buildIcosahedron();
    var oct = buildOctahedron();
    var t = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cube = Math.max(w, h) * 0.85;
      seed();
    }

    function seed() {
      var count = isNarrow ? 55 : Math.min(150, Math.floor((w * h) / 12000));
      pts = [];
      for (var i = 0; i < count; i++) {
        pts.push({
          x: (Math.random() - 0.5) * cube * 2,
          y: (Math.random() - 0.5) * cube * 1.2,
          z: (Math.random() - 0.5) * cube,
          r: 1 + Math.random() * 1.6,
          accent: Math.random() < 0.08
        });
      }
      // Static neighbor pairs by true 3D distance (rotation preserves them).
      pairs = [];
      var maxD = cube * 0.22, maxD2 = maxD * maxD;
      var perPoint = new Array(count).fill(0);
      for (i = 0; i < count; i++) {
        for (var j = i + 1; j < count; j++) {
          if (perPoint[i] > 2 || perPoint[j] > 2) continue;
          var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
          if (dx * dx + dy * dy + dz * dz < maxD2) {
            pairs.push([i, j]);
            perPoint[i]++; perPoint[j]++;
          }
        }
      }
    }

    function buildIcosahedron() {
      var p = (1 + Math.sqrt(5)) / 2;
      var v = [
        [-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0],
        [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p],
        [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]
      ];
      var e = [
        [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],[2,3],
        [2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],[4,5],[4,9],
        [4,11],[5,9],[5,11],[6,7],[6,8],[6,10],[7,8],[7,10],[8,9],[10,11]
      ];
      var len = Math.sqrt(1 + p * p);
      v = v.map(function (a) { return [a[0] / len, a[1] / len, a[2] / len]; });
      return { v: v, e: e };
    }

    function buildOctahedron() {
      var v = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
      var e = [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]];
      return { v: v, e: e };
    }

    function rot(x, y, z, ax, ay) {
      var cy = Math.cos(ay), sy = Math.sin(ay);
      var cx = Math.cos(ax), sx = Math.sin(ax);
      var x1 = x * cy + z * sy;
      var z1 = -x * sy + z * cy;
      var y1 = y * cx - z1 * sx;
      var z2 = y * sx + z1 * cx;
      return [x1, y1, z2];
    }

    var sx = new Float32Array(300), sy = new Float32Array(300), sd = new Float32Array(300);

    function draw() {
      t += 0.0022;
      var scroll = window.scrollY;
      var ay = t + mouseX * 0.55;
      var ax = mouseY * 0.3 + scroll * 0.00022;
      var cx = w / 2, cyc = h / 2;

      ctx.clearRect(0, 0, w, h);

      // ----- perspective grid floor (sci-fi horizon) -----
      drawGrid(scroll);

      // ----- particle field (depth-fogged constellation) -----
      var n = pts.length;
      for (var i = 0; i < n; i++) {
        var p = pts[i];
        var r3 = rot(p.x, p.y, p.z, ax, ay);
        var persp = FOV / (FOV + r3[2] + cube * 0.65);
        sx[i] = cx + r3[0] * persp;
        sy[i] = cyc + r3[1] * persp - scroll * 0.1;
        sd[i] = persp; // depth factor ~0.45..1.4
      }

      ctx.lineWidth = 1;
      for (i = 0; i < pairs.length; i++) {
        var a = pairs[i][0], b = pairs[i][1];
        var wy1 = ((sy[a] % (h + 300)) + h + 300) % (h + 300) - 150;
        var wy2 = ((sy[b] % (h + 300)) + h + 300) % (h + 300) - 150;
        if (Math.abs(wy1 - wy2) > 400) continue; // skip wrapped seams
        var alpha = 0.05 + 0.08 * (sd[a] + sd[b] - 1);
        if (alpha <= 0.01) continue;
        ctx.strokeStyle = 'rgba(10,31,68,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(sx[a], wy1);
        ctx.lineTo(sx[b], wy2);
        ctx.stroke();
      }

      for (i = 0; i < n; i++) {
        var q = pts[i];
        var wy = ((sy[i] % (h + 300)) + h + 300) % (h + 300) - 150;
        var rad = q.r * sd[i];
        var al = 0.05 + 0.26 * sd[i]; // depth fog
        ctx.beginPath();
        ctx.arc(sx[i], wy, rad, 0, 6.2832);
        ctx.fillStyle = q.accent
          ? 'rgba(200,16,46,' + Math.min(0.6, al + 0.12).toFixed(3) + ')'
          : 'rgba(10,31,68,' + Math.min(0.42, al).toFixed(3) + ')';
        ctx.fill();
      }

      // ----- floating wireframe geometry (hero, fades on scroll) -----
      var heroFade = 1 - scroll / (h * 0.9);
      if (heroFade > 0.02) {
        var R = isNarrow ? Math.min(w, h) * 0.3 : Math.min(w, h) * 0.34;
        var icx = isNarrow ? w * 0.5 : w * 0.72;
        var icy = (isNarrow ? h * 0.3 : h * 0.44) - scroll * 0.35;
        drawWireframe(ico, icx, icy, R,
          0.45 + t * 1.1 + mouseY * 0.4, t * 3.2 + mouseX * 0.8, heroFade, [1, 9, 4]);

        if (!isNarrow) {
          // smaller octahedron drifting over the grid, gently bobbing
          var R2 = Math.min(w, h) * 0.11;
          var ox = w * 0.17 + Math.sin(t * 1.3) * 22;
          var oy = h * 0.62 + Math.cos(t * 1.05) * 18 - scroll * 0.22;
          drawWireframe(oct, ox, oy, R2,
            t * 1.6 + mouseY * 0.3, t * 2.2 + mouseX * 0.4, heroFade * 0.85, [0, 1]);
        }
      }
    }

    // Perspective floor grid: parallel rows bunched toward a horizon +
    // verticals converging to a vanishing point, flowing toward the viewer.
    function drawGrid(scroll) {
      var horizonY = h * 0.46 - scroll * 0.05;
      var bottom = h + 60;
      if (horizonY > bottom - 60) return;
      var span = bottom - horizonY;
      var vanishX = w * 0.5 + mouseX * 70;
      var flow = (t * 0.85) % 1;
      var rows = 16;

      ctx.lineWidth = 1;
      for (var r = 1; r <= rows; r++) {
        var f = (r - flow) / rows;
        if (f <= 0) continue;
        var ease = f * f;
        var yy = horizonY + span * ease;
        var a = 0.07 * ease;
        if (a <= 0.004) continue;
        ctx.strokeStyle = 'rgba(10,31,68,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
        ctx.stroke();
      }

      var cols = 16;
      for (var cI = -cols; cI <= cols; cI++) {
        var frac = cI / cols;
        var xNear = vanishX + frac * w * 1.5;
        var a2 = 0.045 * (1 - Math.abs(frac) * 0.45);
        if (a2 <= 0.004) continue;
        ctx.strokeStyle = (cI === 0)
          ? 'rgba(200,16,46,0.05)'
          : 'rgba(10,31,68,' + a2.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(xNear, bottom);
        ctx.stroke();
      }
    }

    // Generic rotating wireframe polyhedron with depth-shaded edges/vertices.
    function drawWireframe(shape, cxp, cyp, R, ax, ay, fade, accents) {
      if (fade <= 0.02) return;
      var pv = [];
      for (var i = 0; i < shape.v.length; i++) {
        var rv = rot(shape.v[i][0] * R, shape.v[i][1] * R, shape.v[i][2] * R, ax, ay);
        var pp = FOV / (FOV + rv[2]);
        pv.push([cxp + rv[0] * pp, cyp + rv[1] * pp, pp]);
      }
      ctx.lineWidth = 1.2;
      for (i = 0; i < shape.e.length; i++) {
        var va = pv[shape.e[i][0]], vb = pv[shape.e[i][1]];
        var depth = (va[2] + vb[2]) / 2 - 0.8;
        var ea = Math.max(0, 0.06 + depth * 0.28) * fade;
        if (ea <= 0.005) continue;
        ctx.strokeStyle = 'rgba(10,31,68,' + ea.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(va[0], va[1]);
        ctx.lineTo(vb[0], vb[1]);
        ctx.stroke();
      }
      for (i = 0; i < pv.length; i++) {
        var vd = pv[i][2] - 0.8;
        var vAlpha = Math.max(0, 0.15 + vd * 0.5) * fade;
        if (vAlpha <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(pv[i][0], pv[i][1], 2 + pv[i][2] * 1.6, 0, 6.2832);
        ctx.fillStyle = (accents && accents.indexOf(i) !== -1)
          ? 'rgba(200,16,46,' + Math.min(0.7, vAlpha + 0.15).toFixed(3) + ')'
          : 'rgba(10,31,68,' + Math.min(0.5, vAlpha).toFixed(3) + ')';
        ctx.fill();
      }
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    resize();
    return { draw: draw };
  }

  /* ---------- Mouse-depth layers ---------- */
  var depthEls = [];
  if (finePointer && !isNarrow) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-depth]'), function (el) {
      depthEls.push({ el: el, depth: parseFloat(el.getAttribute('data-depth')) || 0.2 });
    });
  }

  /* ---------- Scroll parallax elements ---------- */
  var parEls = [];
  Array.prototype.forEach.call(document.querySelectorAll('[data-parallax]'), function (el) {
    parEls.push({ el: el, speed: parseFloat(el.getAttribute('data-parallax')) || -0.12, baseTop: 0, height: 0 });
  });
  function measureParallax() {
    var scroll = window.scrollY;
    parEls.forEach(function (p) {
      p.el.style.transform = '';
      var r = p.el.getBoundingClientRect();
      p.baseTop = r.top + scroll;
      p.height = r.height;
    });
  }
  if (parEls.length) {
    measureParallax();
    var mpTimer;
    window.addEventListener('resize', function () {
      clearTimeout(mpTimer);
      mpTimer = setTimeout(measureParallax, 200);
    });
    window.addEventListener('load', function () { setTimeout(measureParallax, 900); });
  }

  /* ---------- Card tilt + holo shine ---------- */
  var tiltPending = null;
  if (finePointer && !isNarrow) {
    var tiltCards = document.querySelectorAll('.timeline-card, .project-card, .post-card, .edu-card');
    Array.prototype.forEach.call(tiltCards, function (card) {
      card.classList.add('js-tilt');
      card.addEventListener('pointerenter', function () {
        card.style.transition = 'transform 0.12s ease-out, box-shadow 0.25s ease';
        card.style.willChange = 'transform';
        card.classList.add('tilting');
      });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width;
        var ny = (e.clientY - r.top) / r.height;
        card.style.setProperty('--shx', (nx * 100).toFixed(1) + '%');
        card.style.setProperty('--shy', (ny * 100).toFixed(1) + '%');
        tiltPending = { el: card, rx: (ny - 0.5) * -5, ry: (nx - 0.5) * 6 };
      });
      card.addEventListener('pointerleave', function () {
        tiltPending = null;
        card.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
        card.style.transform = '';
        card.classList.remove('tilting');
        setTimeout(function () {
          card.style.transition = '';
          card.style.willChange = '';
        }, 450);
      });
    });
  }

  /* ---------- Shared rAF loop ---------- */
  function tick() {
    if (!running) return;

    mouseX += (mouseTX - mouseX) * 0.06;
    mouseY += (mouseTY - mouseY) * 0.06;

    if (scene) scene.draw();

    for (var i = 0; i < depthEls.length; i++) {
      var d = depthEls[i];
      d.el.style.transform = 'translate3d(' + (mouseX * d.depth * 44).toFixed(2) + 'px,' +
        (mouseY * d.depth * 28).toFixed(2) + 'px,0)';
    }

    if (parEls.length) {
      var scroll = window.scrollY;
      var vh = window.innerHeight;
      for (i = 0; i < parEls.length; i++) {
        var p = parEls[i];
        var offset = (scroll + vh / 2 - (p.baseTop + p.height / 2)) * p.speed;
        p.el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      }
    }

    if (tiltPending) {
      tiltPending.el.style.transform =
        'perspective(900px) rotateX(' + tiltPending.rx.toFixed(2) + 'deg) rotateY(' +
        tiltPending.ry.toFixed(2) + 'deg) translateY(-4px)';
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- Reduced-motion static frame ---------- */
  function drawStaticFrame(canvas) {
    var ctx = canvas.getContext('2d');
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    // faint static perspective grid (matches the animated version)
    var horizonY = h * 0.5, bottom = h + 40, vanishX = w * 0.5;
    ctx.lineWidth = 1;
    for (var g = 1; g <= 12; g++) {
      var ease = (g / 12) * (g / 12);
      var yy = horizonY + (bottom - horizonY) * ease;
      ctx.strokeStyle = 'rgba(10,31,68,' + (0.05 * ease).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke();
    }
    for (var gc = -12; gc <= 12; gc++) {
      ctx.strokeStyle = 'rgba(10,31,68,' + (0.03 * (1 - Math.abs(gc) / 14)).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(vanishX, horizonY); ctx.lineTo(vanishX + (gc / 12) * w * 1.5, bottom); ctx.stroke();
    }

    var count = Math.floor((w * h) / 26000);
    var pts = [];
    for (var i = 0; i < count; i++) {
      pts.push({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 1.6 });
    }
    for (i = 0; i < count; i++) {
      for (var j = i + 1; j < count; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 15625) {
          ctx.strokeStyle = 'rgba(10,31,68,' + ((1 - Math.sqrt(d2) / 125) * 0.1).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
    }
    for (i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, pts[i].r, 0, 6.2832);
      ctx.fillStyle = 'rgba(10,31,68,0.22)';
      ctx.fill();
    }
  }
})();

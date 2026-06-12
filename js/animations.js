// ============================================================
// Animations — topographic contours, reveals, cursor, clock
// All motion respects prefers-reduced-motion
// ============================================================
(function () {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Topographic contour canvas (mouse-reactive) ----------
    const canvas = document.getElementById('heroCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const finePointer = window.matchMedia('(pointer: fine)').matches;
        let cw, ch;
        let rings = [];          // precomputed base points
        let mx = -9999, my = -9999;       // smoothed mouse (canvas coords)
        let tmx = -9999, tmy = -9999;     // target mouse
        let rafId = null;
        let inView = true;

        const INFLUENCE = 240;   // px radius of mouse effect
        const STRENGTH = 30;     // max displacement px

        function mulberry32(seed) {
            return function () {
                seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
                let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        function buildContours() {
            const dpr = window.devicePixelRatio || 1;
            cw = canvas.offsetWidth;
            ch = canvas.offsetHeight;
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            rings = [];
            const rand = mulberry32(53264);
            const peakCount = Math.max(3, Math.round(cw / 480));
            let ringIndex = 0;

            for (let p = 0; p < peakCount; p++) {
                const pk = {
                    x: rand() * cw,
                    y: rand() * ch,
                    rings: 7 + Math.floor(rand() * 4),
                    base: 36 + rand() * 50,
                    gap: 26 + rand() * 22,
                    s1: rand() * Math.PI * 2,
                    s2: rand() * Math.PI * 2,
                    a1: 0.14 + rand() * 0.12,
                    a2: 0.06 + rand() * 0.08
                };
                for (let k = 0; k < pk.rings; k++) {
                    const baseR = pk.base + k * pk.gap;
                    const pts = [];
                    const STEPS = 130;
                    for (let i = 0; i < STEPS; i++) {
                        const t = (i / STEPS) * Math.PI * 2;
                        const r = baseR * (
                            1 +
                            pk.a1 * Math.sin(3 * t + pk.s1 + k * 0.35) +
                            pk.a2 * Math.sin(7 * t + pk.s2 - k * 0.2)
                        );
                        pts.push([
                            pk.x + Math.cos(t) * r,
                            pk.y + Math.sin(t) * r * 0.82
                        ]);
                    }
                    rings.push({ pts: pts, orange: (ringIndex % 7 === 3) });
                    ringIndex++;
                }
            }
        }

        function render() {
            ctx.clearRect(0, 0, cw, ch);
            for (const ring of rings) {
                ctx.beginPath();
                const pts = ring.pts;
                for (let i = 0; i <= pts.length; i++) {
                    const pt = pts[i % pts.length];
                    let x = pt[0], y = pt[1];
                    // Displace points near the cursor
                    const dx = x - mx, dy = y - my;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < INFLUENCE * INFLUENCE) {
                        const d = Math.sqrt(d2) || 1;
                        const f = Math.pow(1 - d / INFLUENCE, 2) * STRENGTH;
                        x += (dx / d) * f;
                        y += (dy / d) * f;
                    }
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.lineWidth = 1;
                ctx.strokeStyle = ring.orange
                    ? 'rgba(232, 80, 30, 0.5)'
                    : 'rgba(27, 22, 17, 0.13)';
                ctx.stroke();
            }
        }

        function loop() {
            // Ease the mouse toward its target for fluid motion
            mx += (tmx - mx) * 0.12;
            my += (tmy - my) * 0.12;
            render();
            rafId = inView ? requestAnimationFrame(loop) : null;
        }

        function startLoop() {
            if (rafId === null && inView) rafId = requestAnimationFrame(loop);
        }

        buildContours();
        render();

        let resizeT;
        window.addEventListener('resize', function () {
            clearTimeout(resizeT);
            resizeT = setTimeout(function () { buildContours(); render(); }, 150);
        });

        // Mouse interaction — fine pointers only, and not for reduced motion
        if (finePointer && !prefersReduced) {
            window.addEventListener('mousemove', function (e) {
                const rect = canvas.getBoundingClientRect();
                tmx = e.clientX - rect.left;
                tmy = e.clientY - rect.top;
                startLoop();
            }, { passive: true });

            // Pause the loop when the hero is off-screen
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(function (entries) {
                    inView = entries[0].isIntersecting;
                    if (inView) startLoop();
                }, { threshold: 0 }).observe(canvas);
            }
        }
    }

    // ---------- Header state on scroll ----------
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', function () {
            header.classList.toggle('scrolled', window.scrollY > 40);
        }, { passive: true });
    }

    // ---------- Live clock (Europe/Dublin) ----------
    const clock = document.getElementById('localTime');
    if (clock) {
        const fmt = new Intl.DateTimeFormat('en-IE', {
            hour: '2-digit', minute: '2-digit',
            hour12: false, timeZone: 'Europe/Dublin'
        });
        function tick() { clock.textContent = fmt.format(new Date()); }
        tick();
        setInterval(tick, 30000);
    }

    // ---------- Custom cursor over films ----------
    const dot = document.getElementById('cursorDot');
    if (dot && window.matchMedia('(pointer: fine)').matches && !prefersReduced) {
        let cx = 0, cy = 0, tx = 0, ty = 0, raf = null;

        function loop() {
            cx += (tx - cx) * 0.18;
            cy += (ty - cy) * 0.18;
            dot.style.left = cx + 'px';
            dot.style.top = cy + 'px';
            raf = requestAnimationFrame(loop);
        }

        document.addEventListener('mousemove', function (e) {
            tx = e.clientX; ty = e.clientY;
            if (raf === null) { cx = tx; cy = ty; loop(); }
        });

        document.querySelectorAll('[data-cursor-ga]').forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                dot.textContent = document.body.classList.contains('english')
                    ? el.getAttribute('data-cursor-en')
                    : el.getAttribute('data-cursor-ga');
                dot.classList.add('on');
                el.style.cursor = 'none';
            });
            el.addEventListener('mouseleave', function () {
                dot.classList.remove('on');
                el.style.cursor = '';
            });
        });
    }




    // ---------- Tide divider: gentle swell ----------
    (function () {
        const canvas = document.getElementById('tideCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w, h, t = 0, rafId = null, inView = true;
        let mx = -9999, my = -9999, tmx = -9999, tmy = -9999;
        const finePointer = window.matchMedia('(pointer: fine)').matches;

        function size() {
            const dpr = window.devicePixelRatio || 1;
            w = canvas.offsetWidth;
            h = canvas.offsetHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function wave(x, time, phase) {
            const k = (Math.PI * 2 * 2.2) / w;   // ~2.2 wavelengths across
            return (
                Math.sin(x * k * 0.9 + time * 0.45 + phase) * 14 +
                Math.sin(x * k * 1.9 - time * 0.28 + phase * 1.6 + 1.7) * 8 +
                Math.sin(x * k * 0.4 + time * 0.16 + phase * 0.7) * 10
            );
        }

        // Per-line displacement state: the bump itself is eased, so the
        // water always flows back gently — even after a fast pass-through.
        const lineStates = [{ d: 0, x: 0 }, { d: 0, x: 0 }];

        function updateState(state, yMid) {
            const prox = Math.max(0, 1 - Math.abs(my - yMid) / 130);
            const depth = prox * 30;
            const dir = my < yMid ? 1 : -1;
            const target = dir * depth;
            // gentle attack, far gentler release
            const k = Math.abs(target) > Math.abs(state.d) ? 0.06 : 0.025;
            state.d += (target - state.d) * k;
            state.x += (mx - state.x) * 0.08;
        }

        function drawLine(yMid, time, phase, style, width, state) {
            const SIGMA2 = 2 * 105 * 105;
            ctx.beginPath();
            const STEP = 6;
            for (let x = 0; x <= w; x += STEP) {
                let y = yMid + wave(x, time, phase);
                if (Math.abs(state.d) > 0.15) {
                    const dx = x - state.x;
                    y += state.d * Math.exp(-(dx * dx) / SIGMA2);
                }
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.stroke();
        }

        function render() {
            ctx.clearRect(0, 0, w, h);
            const mid = h * 0.5;
            updateState(lineStates[0], mid + 20);
            updateState(lineStates[1], mid);
            // faint orange echo, drifting slightly out of phase below
            drawLine(mid + 20, t * 0.85, 1.2, 'rgba(232, 80, 30, 0.5)', 1.5, lineStates[0]);
            // primary ink swell
            drawLine(mid, t, 0, 'rgba(27, 22, 17, 0.95)', 2, lineStates[1]);
        }

        function loop() {
            t += 0.016;
            // Ease the cursor position so the water settles fluidly
            mx += (tmx - mx) * 0.14;
            my += (tmy - my) * 0.14;
            render();
            rafId = inView ? requestAnimationFrame(loop) : null;
        }

        size();
        render();

        let rT;
        window.addEventListener('resize', function () {
            clearTimeout(rT);
            rT = setTimeout(function () { size(); render(); }, 150);
        });

        if (!prefersReduced) {
            if (finePointer) {
                window.addEventListener('mousemove', function (e) {
                    const rect = canvas.getBoundingClientRect();
                    tmx = e.clientX - rect.left;
                    tmy = e.clientY - rect.top;
                }, { passive: true });
            }

            if ('IntersectionObserver' in window) {
                new IntersectionObserver(function (entries) {
                    inView = entries[0].isIntersecting;
                    if (inView && rafId === null) rafId = requestAnimationFrame(loop);
                }, { threshold: 0 }).observe(canvas);
            } else {
                rafId = requestAnimationFrame(loop);
            }
        }
    })();

    // ---------- GSAP scroll reveals ----------
    if (typeof gsap === 'undefined' || prefersReduced) return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance (guarded — only on home page)
    if (document.querySelector('.hero-name-1')) {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.hero-eyebrow', { y: 24, opacity: 0, duration: 0.8 })
          .from('.hero-name-1', { y: 90, opacity: 0, duration: 1.2 }, '-=0.5')
          .from('.hero-name-2', { y: 60, opacity: 0, duration: 1.1 }, '-=0.8')
          .from('.hero-tagline', { y: 20, opacity: 0, duration: 0.8 }, '-=0.7')
          .from('.hero-years, .hero-bottom', { opacity: 0, duration: 0.9 }, '-=0.4');

        // Slight horizontal drift of the two names on scroll
        gsap.to('.hero-name-1', {
            xPercent: -4, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
        gsap.to('.hero-name-2', {
            xPercent: 3, ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
        });
    }

    // Section headings rise in
    gsap.utils.toArray('.section-heading').forEach(function (el) {
        gsap.from(el, {
            y: 60, opacity: 0, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' }
        });
    });

    // Generic reveals, staggered per section
    gsap.utils.toArray('section').forEach(function (sec) {
        const items = sec.querySelectorAll('[data-reveal]');
        if (!items.length) return;
        gsap.from(items, {
            y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
            stagger: 0.12,
            scrollTrigger: { trigger: sec, start: 'top 75%' }
        });
    });
})();

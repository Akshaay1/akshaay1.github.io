// Dark Mode Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const modeToggle = document.querySelector('.mode-toggle');
    const body = document.body;
    
    // Check if user has a preferred mode
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        body.classList.add('dark-mode');
    }
    
    modeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        // Save user preference
        localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
    });

    // Initialize Canvas Basketball Game
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        initBasketballGame();
    }
});

// Create a simple confetti effect
function createConfetti() {
    const colors = ['#ff5252', '#ffeb3b', '#2196f3', '#4caf50', '#9c27b0'];
    const container = document.querySelector('.fun-message');
    
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = Math.random() * 10 + 5 + 'px';
        confetti.style.opacity = Math.random() + 0.5;
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        container.appendChild(confetti);
        
        // Animate falling
        const animation = confetti.animate(
            [
                { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${Math.random() * 100 - 50}px, ${Math.random() * 200 + 100}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
            ],
            {
                duration: Math.random() * 1000 + 1000,
                easing: 'cubic-bezier(0, .9, .57, 1)',
                delay: Math.random() * 200
            }
        );
        
        animation.onfinish = function() {
            confetti.remove();
        };
    }
}

function initBasketballGame() {
    const gameContainer = document.querySelector('.game-container');
    const canvas = document.getElementById('gameCanvas');
    const resetButton = document.querySelector('.reset-button');
    if (!canvas || !gameContainer) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = canvas.getContext('2d');
    let W, H, FLOOR_Y;

    function resizeCanvas() {
        const w = gameContainer.clientWidth;
        const h = gameContainer.clientHeight;
        canvas.width = w * DPR;
        canvas.height = h * DPR;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        W = w; H = h;
        FLOOR_Y = Math.round(H * 0.72);
    }

    resizeCanvas();

    // ── Constants & state ──────────────────────────────────────────
    const GRAVITY = 0.42;
    const BALL_R = 18;
    // Slingshot tuning: cap how far you can pull and how fast the ball can launch,
    // so a normal drag can't overpower into wall/ceiling ricochets.
    const POWER = 0.22, MAX_PULL = 165, MAX_SPEED = 27;

    let score = 0, streak = 0;
    let dragStart = null, pull = null, returning = false;
    let shotTime = null, resetTO = null;
    let particles = [], netWave = 0, flashTimer = 0;

    // Derived layout (recalculated on resize)
    let hoopCX, hoopY, rimR, ballSX, ballSY;

    function layout() {
        hoopCX = Math.round(W * 0.76);
        hoopY  = Math.round(H * 0.295);
        rimR   = Math.round(W * 0.08);   // ~40px on 500px
        ballSX = Math.round(W * 0.13);
        ballSY = FLOOR_Y - BALL_R - 1;
    }

    layout();

    const ball = { x: ballSX, y: ballSY, vx: 0, vy: 0, spin: 0, dragging: false, shot: false };

    // ── Input ──────────────────────────────────────────────────────
    function cpos(clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
    }

    // Launch velocity from the current pull — clamped so the shot is never
    // wildly overpowered. Used by BOTH the release and the trajectory preview,
    // so what you see is exactly what you get. The ball stays parked at its
    // home spot (dragStart) while you aim; `pull` is where you've dragged to,
    // and the ball fires the opposite way — a slingshot with a fixed pivot,
    // so it never gets dragged through the floor.
    function launchVel() {
        if (!dragStart || !pull) return { vx: 0, vy: 0 };
        let vx = (dragStart.x - pull.x) * POWER;
        let vy = (dragStart.y - pull.y) * POWER;
        const sp = Math.hypot(vx, vy);
        if (sp > MAX_SPEED) { vx = vx / sp * MAX_SPEED; vy = vy / sp * MAX_SPEED; }
        return { vx, vy };
    }

    function onDown(x, y) {
        if (ball.shot || returning) return;
        // Generous grab radius so it's easy to pick up on a phone.
        if (Math.hypot(x - ball.x, y - ball.y) < BALL_R + 26) {
            dragStart = { x: ball.x, y: ball.y };   // pivot = ball's home spot
            pull = { x: ball.x, y: ball.y };
            ball.dragging = true;
        }
    }
    function onMove(x, y) {
        if (!ball.dragging) return;
        // Only the aim handle moves; the ball itself stays on its pivot.
        let dx = x - dragStart.x, dy = y - dragStart.y;
        const d = Math.hypot(dx, dy);
        if (d > MAX_PULL) { dx = dx / d * MAX_PULL; dy = dy / d * MAX_PULL; }
        pull = { x: dragStart.x + dx, y: dragStart.y + dy };
    }
    function onUp() {
        if (!ball.dragging) return;
        const v = launchVel();
        ball.vx = v.vx; ball.vy = v.vy;
        ball.spin = ball.vx * 0.1;
        ball.dragging = false; ball.shot = true; shotTime = Date.now();
        pull = null;
        resetTO = setTimeout(() => doReset(false), 8000);
    }

    // Start on the canvas; track move/release on the window so a drag that
    // wanders off the canvas still aims and releases correctly.
    canvas.addEventListener('mousedown', e => { const p = cpos(e.clientX, e.clientY); onDown(p.x, p.y); });
    window.addEventListener('mousemove', e => { if (ball.dragging) { const p = cpos(e.clientX, e.clientY); onMove(p.x, p.y); } });
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; const p = cpos(t.clientX, t.clientY); onDown(p.x, p.y); }, { passive: false });
    window.addEventListener('touchmove', e => { if (ball.dragging) { e.preventDefault(); const t = e.touches[0]; const p = cpos(t.clientX, t.clientY); onMove(p.x, p.y); } }, { passive: false });
    window.addEventListener('touchend', onUp);

    // ── Logic ──────────────────────────────────────────────────────
    function doReset(scored) {
        clearTimeout(resetTO);
        if (!scored) { streak = 0; updateHUD(); }
        returning = true; ball.shot = false; ball.vx = 0; ball.vy = 0;
    }

    function updateHUD() {
        document.getElementById('score').innerText = `Score: ${score}`;
        document.getElementById('streak-display').innerText = `🔥 ${streak} streak`;
    }

    function spawnParticles(x, y) {
        const cols = ['#ff8c1a','#ffd700','#ff4444','#fff','#00e5ff','#ff5500'];
        for (let i = 0; i < 28; i++) {
            const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6;
            particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 2.5,
                r: 2.5 + Math.random()*3, c: cols[Math.floor(Math.random()*cols.length)],
                life: 1, d: 0.02 + Math.random()*0.018 });
        }
    }

    function update() {
        if (ball.shot) {
            ball.vy += GRAVITY;
            ball.x += ball.vx; ball.y += ball.vy;
            ball.spin += (ball.vx * 0.05 - ball.spin) * 0.15;
            ball.vx *= 0.994;

            if (ball.y + BALL_R > FLOOR_Y) { ball.y = FLOOR_Y - BALL_R; ball.vy *= -0.5; ball.vx *= 0.8; }
            if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -0.5; }   // ceiling — keep it in play
            if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx *= -0.6; }
            if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx *= -0.6; }

            // Rim collisions
            [{x: hoopCX - rimR, y: hoopY}, {x: hoopCX + rimR, y: hoopY}].forEach(rim => {
                const d = Math.hypot(ball.x - rim.x, ball.y - rim.y);
                if (d < BALL_R + 5) {
                    const nx = (ball.x - rim.x)/d, ny = (ball.y - rim.y)/d;
                    ball.x += nx*(BALL_R + 5 - d); ball.y += ny*(BALL_R + 5 - d);
                    const dot = ball.vx*nx + ball.vy*ny;
                    ball.vx = (ball.vx - 2*dot*nx)*0.45; ball.vy = (ball.vy - 2*dot*ny)*0.45;
                }
            });

            // Score
            if (ball.vy > 0 && ball.y > hoopY && ball.y < hoopY + 38 &&
                Math.abs(ball.x - hoopCX) < rimR - BALL_R * 0.3) {
                score++; streak++;
                spawnParticles(hoopCX, hoopY + 16);
                netWave = 1; flashTimer = 45;
                doReset(true); updateHUD();
            }

            // Auto-reset
            const elapsed = Date.now() - shotTime;
            const still = Math.abs(ball.vx) < 0.3 && Math.abs(ball.vy) < 0.3;
            if ((still && ball.y + BALL_R >= FLOOR_Y - 2) || elapsed > 7000) doReset(false);
        }

        if (returning) {
            const dx = ballSX - ball.x, dy = ballSY - ball.y;
            ball.x += dx*0.13; ball.y += dy*0.13;
            if (Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2) {
                ball.x = ballSX; ball.y = ballSY;
                ball.vx = 0; ball.vy = 0; ball.spin = 0; ball.shot = false; returning = false;
            }
        }

        if (flashTimer > 0) flashTimer--;
        if (netWave > 0) netWave = Math.max(0, netWave - 0.04);
        particles = particles.filter(p => p.life > 0);
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= p.d; });
    }

    // ── Drawing ────────────────────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, W, H);
        drawArena();
        drawFloor();
        drawHoop();
        drawSling();
        drawTrajectory();
        drawBall();
        particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.life * 0.9;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fillStyle = p.c; ctx.fill(); ctx.restore();
        });
        drawFlash();
    }

    function drawArena() {
        // Deep dark background
        const bg = ctx.createRadialGradient(W*0.5, H*0.42, 0, W*0.5, H*0.5, Math.max(W, H)*0.78);
        bg.addColorStop(0, '#1e1e30');
        bg.addColorStop(1, '#06060e');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        // Soft warm spotlight from above-center (arena lighting feel)
        const spot = ctx.createRadialGradient(W*0.5, -H*0.1, 0, W*0.5, H*0.3, H*0.85);
        spot.addColorStop(0, 'rgba(255,210,130,0.09)');
        spot.addColorStop(1, 'rgba(255,180,80,0)');
        ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);
    }

    function drawFloor() {
        // Hardwood
        const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
        fg.addColorStop(0,   '#c67a24');
        fg.addColorStop(0.35,'#b26518');
        fg.addColorStop(1,   '#7a4010');
        ctx.fillStyle = fg; ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);

        // Plank horizontal lines
        ctx.save(); ctx.globalAlpha = 0.1; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        for (let i = 1; i < 9; i++) {
            const y = FLOOR_Y + (H - FLOOR_Y) * i / 8;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        // Subtle wood grain
        ctx.globalAlpha = 0.04;
        for (let x = 15; x < W; x += 55) {
            ctx.beginPath(); ctx.moveTo(x, FLOOR_Y); ctx.lineTo(x + 20, H); ctx.stroke();
        }
        ctx.restore();

        // Court boundary line (glowing)
        ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(W, FLOOR_Y);
        ctx.strokeStyle = 'rgba(255,215,140,0.55)'; ctx.lineWidth = 2; ctx.stroke();

        // Free-throw arc (decorative marking)
        ctx.save(); ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(ballSX, FLOOR_Y, 62, Math.PI, 0);
        ctx.strokeStyle = 'rgba(255,215,140,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
    }

    function drawHoop() {
        const cx = hoopCX, cy = hoopY, r = rimR;
        // Backboard sits to the right of the rim
        const boardX  = cx + r + 10;
        const boardW  = 11;
        const boardTop = cy - 58;
        const boardH   = 106;

        // Vertical support pole
        const pg = ctx.createLinearGradient(boardX + boardW, 0, boardX + boardW + 7, 0);
        pg.addColorStop(0, '#555'); pg.addColorStop(0.5, '#999'); pg.addColorStop(1, '#444');
        ctx.fillStyle = pg;
        ctx.fillRect(boardX + boardW, boardTop - 8, 7, H - boardTop + 10);

        // Backboard (glass/white)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 3;
        const bg2 = ctx.createLinearGradient(boardX, 0, boardX + boardW, 0);
        bg2.addColorStop(0, 'rgba(235,242,255,0.92)');
        bg2.addColorStop(1, 'rgba(210,220,240,0.82)');
        ctx.fillStyle = bg2;
        ctx.beginPath(); ctx.roundRect(boardX, boardTop, boardW, boardH, [0, 2, 2, 0]); ctx.fill();
        ctx.strokeStyle = 'rgba(140,155,180,0.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();

        // Target box on backboard (orange)
        ctx.strokeStyle = 'rgba(255,95,0,0.9)'; ctx.lineWidth = 2;
        ctx.strokeRect(boardX + 1.5, cy - 15, boardW - 3, 32);

        // Arm (rim to backboard)
        ctx.beginPath(); ctx.moveTo(boardX, cy); ctx.lineTo(cx + r, cy);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 4.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(boardX, cy + 2.5); ctx.lineTo(cx + r, cy + 2.5);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; ctx.stroke();

        // ── Rim ────────────────────────────────────────────────────
        // The rim is a flat ellipse (slight top-down perspective)
        const ry = r * 0.13; // ellipse minor axis

        // Back arc (π → 2π = top half of ellipse = "far" side of rim)
        ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, Math.PI, Math.PI * 2);
        ctx.strokeStyle = '#b83200'; ctx.lineWidth = 6; ctx.stroke();

        // Net (sits between back and front rim arcs)
        drawNet(cx, cy, r, ry);

        // Front arc (0 → π = bottom half of ellipse = "near" side of rim, bright)
        ctx.save();
        ctx.shadowColor = 'rgba(255,90,0,0.55)'; ctx.shadowBlur = 10;
        const rg = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        rg.addColorStop(0, '#ff9500'); rg.addColorStop(0.5, '#ff4800'); rg.addColorStop(1, '#ff9500');
        ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI);
        ctx.strokeStyle = rg; ctx.lineWidth = 6; ctx.stroke();
        ctx.restore();

        // Top-edge highlight (sheen)
        ctx.save(); ctx.globalAlpha = 0.38;
        ctx.beginPath(); ctx.ellipse(cx, cy - 1, r * 0.82, ry * 0.6, 0, Math.PI, Math.PI * 2);
        ctx.strokeStyle = '#ffcc88'; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.restore();
    }

    function drawNet(cx, cy, r, ry) {
        const netH = 46, nSegs = 12, wave = netWave;
        ctx.save(); ctx.lineWidth = 0.9;

        // Vertical cords from rim perimeter to bottom point
        for (let i = 0; i <= nSegs; i++) {
            const angle = (Math.PI * 2 * i) / nSegs;
            const topX = cx + r * Math.cos(angle);
            const topY = cy + ry * Math.sin(angle);
            const sway = Math.sin(angle) * wave * 6;
            const botX = cx + sway;
            const botY = cy + netH + wave * 7;
            const alpha = 0.55 + 0.25 * Math.abs(Math.sin(angle));
            ctx.strokeStyle = `rgba(230,230,230,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.bezierCurveTo(topX, topY + netH*0.45, botX, botY - netH*0.28, botX, botY);
            ctx.stroke();
        }

        // Horizontal rings (4 levels, shrinking)
        for (let lv = 1; lv <= 4; lv++) {
            const t = lv / 5;
            const ringY  = cy + netH * t + wave * 5 * t;
            const ringRX = r * (1 - t * 0.58) + wave * 4 * t;
            const ringRY = ry * (1 - t * 0.5);
            const swX    = wave * 2.5 * t;
            ctx.strokeStyle = `rgba(215,215,215,${0.7 - t * 0.08})`;
            ctx.lineWidth   = lv === 1 ? 1.1 : 0.8;
            ctx.beginPath();
            ctx.ellipse(cx + swX, ringY, ringRX, ringRY, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawSling() {
        if (!ball.dragging || !pull) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,210,90,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(pull.x, pull.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(pull.x, pull.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,210,90,0.85)'; ctx.fill();
        ctx.restore();
    }

    function drawTrajectory() {
        if (!ball.dragging || !pull) return;
        const { vx, vy } = launchVel();
        ctx.save();
        for (let t = 2; t < 34; t++) {
            const px = ball.x + vx * t;
            const py = ball.y + vy * t + 0.5 * GRAVITY * t * t;
            if (py > FLOOR_Y) break;
            const a = (1 - t / 34) * 0.75;
            const dotR = Math.max(1.2, 2.8 * (1 - t / 38));
            ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,210,80,${a})`; ctx.fill();
        }
        ctx.restore();
    }

    function drawBall() {
        const x = ball.x, y = ball.y, r = BALL_R;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ball.spin);

        // Soft shadow below ball (floor proximity)
        const floorDist = Math.max(0, FLOOR_Y - y - r);
        const shadowAlpha = Math.max(0, 0.45 - floorDist * 0.005);
        if (shadowAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = shadowAlpha;
            ctx.beginPath();
            ctx.ellipse(0, r + floorDist * 0.6 + 2, r * Math.max(0.4, 0.95 - floorDist*0.008), r*0.22, 0, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
            ctx.restore();
        }

        // Glow
        ctx.save(); ctx.shadowColor = 'rgba(255,110,0,0.45)'; ctx.shadowBlur = 18;

        // Sphere gradient (highlight top-left)
        const g = ctx.createRadialGradient(-r*0.32, -r*0.34, r*0.02, 0, 0, r*1.04);
        g.addColorStop(0,    '#ffcc55');
        g.addColorStop(0.22, '#ffa020');
        g.addColorStop(0.6,  '#e05500');
        g.addColorStop(1,    '#872500');
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();

        // Seams
        ctx.strokeStyle = 'rgba(70,18,0,0.72)'; ctx.lineWidth = 1.6;
        // Horizontal
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
        // Vertical
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
        // Curved seams (classic basketball look)
        ctx.beginPath(); ctx.moveTo(-r*0.68, -r*0.68); ctx.quadraticCurveTo(r*0.38, 0, -r*0.68, r*0.68); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r*0.68, -r*0.68); ctx.quadraticCurveTo(-r*0.38, 0, r*0.68,  r*0.68); ctx.stroke();

        // Highlight sheen
        const hi = ctx.createRadialGradient(-r*0.3, -r*0.32, 0, -r*0.18, -r*0.2, r*0.5);
        hi.addColorStop(0, 'rgba(255,255,255,0.52)'); hi.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fillStyle = hi; ctx.fill();

        // Drag ring
        if (ball.dragging) {
            ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,220,100,0.7)'; ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
        }

        ctx.restore();
    }

    function drawFlash() {
        if (flashTimer <= 0) return;
        const a = flashTimer / 45;
        ctx.save();
        ctx.globalAlpha = a * 0.18;
        ctx.fillStyle = '#ffaa00'; ctx.fillRect(0, 0, W, H);
        if (flashTimer > 18) {
            ctx.globalAlpha = (flashTimer - 18) / 27 * 0.95;
            ctx.font = `bold ${Math.round(W * 0.1)}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 28;
            ctx.fillText('+1', W / 2, H / 2 - 18);
        }
        ctx.restore();
    }

    // Reset button
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            score = 0; streak = 0; clearTimeout(resetTO);
            ball.x = ballSX; ball.y = ballSY; ball.vx = 0; ball.vy = 0;
            ball.spin = 0; ball.shot = false; ball.dragging = false;
            returning = false; particles = []; netWave = 0; flashTimer = 0;
            updateHUD();
        });
    }

    window.addEventListener('resize', () => {
        resizeCanvas(); layout();
        if (!ball.shot && !returning) { ball.x = ballSX; ball.y = ballSY; }
    });

    function loop() { update(); draw(); requestAnimationFrame(loop); }
    loop();
}

// Contact Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            const submitBtn = contactForm.querySelector('.submit-btn');
            
            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Let the form submit naturally to Formspree
            // We'll handle the response with a timeout
            setTimeout(function() {
                // Reset button after submission
                submitBtn.textContent = 'Send Message';
                submitBtn.disabled = false;
                
                // Show success message
                formStatus.style.display = 'block';
                formStatus.style.backgroundColor = '#d4edda';
                formStatus.style.color = '#155724';
                formStatus.style.border = '1px solid #c3e6cb';
                formStatus.textContent = 'Message sent successfully! I\'ll get back to you soon.';
                
                // Reset form
                contactForm.reset();
                
                // Hide success message after 5 seconds
                setTimeout(function() {
                    formStatus.style.display = 'none';
                }, 5000);
            }, 2000);
        });
    }
}); 
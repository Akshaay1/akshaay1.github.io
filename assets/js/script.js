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
    
    // Set canvas size to match container
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;
    
    const ctx = canvas.getContext("2d");
    
    let score = 0;
    let gravity = 0.5;
    let dragStart = null;
    let returning = false;
    let shotStartTime = null; // Track when shot started
    let autoResetTimeout = null; // Timeout for auto-reset
    
    const ballStart = { x: 70, y: canvas.height - 50 };
    
    const ball = {
        x: ballStart.x,
        y: ballStart.y,
        radius: 20,
        vx: 0,
        vy: 0,
        isDragging: false,
        shot: false
    };
    
    const basket = {
        x: canvas.width - 130,
        y: 150,
        rimRadius: 30,
        backboardWidth: 10,
        backboardHeight: 80
    };
    
    // Adjust for dark mode
    function getThemeColors() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        return {
            backboard: isDarkMode ? '#777' : '#6d4c41',
            rim: '#ff5500',
            ball: '#ff7b24',
            ballStroke: isDarkMode ? '#aaa' : '#3e2723',
            trajectory: isDarkMode ? '#77a0ff' : '#1976d2',
            text: isDarkMode ? '#ffffff' : '#222222',
            background: isDarkMode ? '#24245d' : 'transparent'
        };
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (canvas && gameContainer) {
            canvas.width = gameContainer.clientWidth;
            canvas.height = gameContainer.clientHeight;
            
            // Adjust positions based on new dimensions
            ballStart.x = 70;
            ballStart.y = canvas.height - 50;
            ball.x = ballStart.x;
            ball.y = ballStart.y;
            
            basket.x = canvas.width - 130;
            basket.y = 150;
            
            draw(); // Redraw the scene
        }
    });
    
    // Mouse/touch events
    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("touchstart", function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleStart({ offsetX: x, offsetY: y });
    });
    canvas.addEventListener("touchmove", function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleMove({ offsetX: x, offsetY: y });
    });
    canvas.addEventListener("touchend", handleEnd);
    
    function handleStart(e) {
        if (distance(e.offsetX, e.offsetY, ball.x, ball.y) < ball.radius && !ball.shot) {
            dragStart = { x: ball.x, y: ball.y };
            ball.isDragging = true;
        }
    }
    
    function handleMove(e) {
        if (ball.isDragging) {
            ball.x = e.offsetX;
            ball.y = e.offsetY;
        }
    }
    
    function handleEnd() {
        if (ball.isDragging) {
            ball.vx = (dragStart.x - ball.x) * 0.25;
            ball.vy = (dragStart.y - ball.y) * 0.25;
            ball.isDragging = false;
            ball.shot = true;
            shotStartTime = Date.now(); // Record shot start time
            
            // Set auto-reset timeout (10 seconds)
            autoResetTimeout = setTimeout(() => {
                if (ball.shot && !returning) {
                    triggerAutoReset();
                }
            }, 10000);
        }
    }
    
    function triggerAutoReset() {
        clearTimeout(autoResetTimeout);
        returning = true;
        ball.shot = false;
        ball.vx = 0;
        ball.vy = 0;
    }
    
    function update() {
        if (ball.shot) {
            ball.vy += gravity;
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            ball.vx *= 0.99;
            ball.vy *= 0.99;
            
            if (ball.y + ball.radius > canvas.height) {
                ball.y = canvas.height - ball.radius;
                ball.vy *= -0.6;
            }
            
            if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
                ball.vx *= -0.6;
            }
            
            // Scoring detection
            const hoopCenterX = basket.x + basket.rimRadius;
            const hoopCenterY = basket.y;
            
            if (
                distance(ball.x, ball.y, hoopCenterX, hoopCenterY) < basket.rimRadius - 10 &&
                ball.vy > 0
            ) {
                score++;
                document.getElementById("score").innerText = `Score: ${score}`;
                clearTimeout(autoResetTimeout);
                triggerAutoReset();
            }
            
            // Improved auto-reset conditions
            const timeElapsed = Date.now() - shotStartTime;
            const isNearlyStationary = Math.abs(ball.vx) < 0.5 && Math.abs(ball.vy) < 0.5;
            const isOnGround = ball.y + ball.radius >= canvas.height - 25;
            const hasBouncedEnough = timeElapsed > 3000; // At least 3 seconds
            
            if ((isNearlyStationary && isOnGround) || 
                (hasBouncedEnough && isNearlyStationary) ||
                timeElapsed > 8000) { // Force reset after 8 seconds
                clearTimeout(autoResetTimeout);
                triggerAutoReset();
            }
        }
        
        if (returning) {
            let dx = ballStart.x - ball.x;
            let dy = ballStart.y - ball.y;
            
            ball.x += dx * 0.15; // Slightly faster return
            ball.y += dy * 0.15;
            
            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                ball.x = ballStart.x;
                ball.y = ballStart.y;
                ball.vx = 0;
                ball.vy = 0;
                ball.shot = false;
                returning = false;
            }
        }
        
        draw();
        requestAnimationFrame(update);
    }
    
    function draw() {
        const colors = getThemeColors();
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw floor
        ctx.fillStyle = colors.backboard;
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
        
        // Draw backboard
        ctx.fillStyle = colors.backboard;
        ctx.fillRect(
            basket.x + basket.rimRadius * 2,
            basket.y - 60,
            basket.backboardWidth,
            basket.backboardHeight
        );
        
        // Draw rim
        ctx.beginPath();
        ctx.arc(basket.x + basket.rimRadius, basket.y, basket.rimRadius, 0, Math.PI, false);
        ctx.lineWidth = 6;
        ctx.strokeStyle = colors.rim;
        ctx.stroke();
        
        // Draw net
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * i) / 9;
            const x1 = basket.x + basket.rimRadius + basket.rimRadius * Math.cos(angle);
            const y1 = basket.y + basket.rimRadius * Math.sin(angle);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + Math.sin(angle) * 10, y1 + 30);
            ctx.stroke();
        }
        
        // Draw trajectory line
        if (ball.isDragging) {
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(ball.x, ball.y);
            let vx = (dragStart.x - ball.x) * 0.25;
            let vy = (dragStart.y - ball.y) * 0.25;
            for (let t = 0; t < 30; t++) {
                let px = ball.x + vx * t;
                let py = ball.y + vy * t + 0.5 * gravity * t * t;
                ctx.lineTo(px, py);
            }
            ctx.strokeStyle = colors.trajectory;
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw basketball
        drawBasketball(ball.x, ball.y, ball.radius, colors);
    }
    
    function drawBasketball(x, y, radius, colors) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.ball;
        ctx.fill();
        ctx.strokeStyle = colors.ballStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x - radius, y);
        ctx.lineTo(x + radius, y);
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x, y + radius);
        ctx.moveTo(x - radius * 0.7, y - radius * 0.7);
        ctx.quadraticCurveTo(x, y, x + radius * 0.7, y + radius * 0.7);
        ctx.moveTo(x - radius * 0.7, y + radius * 0.7);
        ctx.quadraticCurveTo(x, y, x + radius * 0.7, y - radius * 0.7);
        ctx.stroke();
    }
    
    function distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    // Reset button functionality
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            score = 0;
            document.getElementById("score").innerText = `Score: ${score}`;
            clearTimeout(autoResetTimeout);
            ball.x = ballStart.x;
            ball.y = ballStart.y;
            ball.vx = 0;
            ball.vy = 0;
            ball.shot = false;
            returning = false;
        });
    }
    
    // Start the game loop
    update();
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
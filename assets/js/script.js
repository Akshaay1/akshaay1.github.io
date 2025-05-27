// Dark Mode Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // Mode toggle button functionality
    const modeToggle = document.querySelector('.mode-toggle');
    if (modeToggle) {
        modeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            // Save preference
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
        });
    }
    
    // Basketball Game Logic
    initBasketballGame();
});

// Initialize the Basketball Game
function initBasketballGame() {
    const ball = document.querySelector('.ball');
    const gameContainer = document.querySelector('.game-container');
    const scoreDisplay = document.querySelector('.score-display');
    const resetButton = document.querySelector('.reset-button');
    const basket = document.querySelector('.basket');
    
    if (!ball || !gameContainer || !scoreDisplay) return;
    
    let isDragging = false;
    let startX, startY;
    let score = 0;
    let isShooting = false;
    let ballInMotion = false;
    
    // Update score display
    scoreDisplay.textContent = `Score: ${score}`;
    
    // Ball drag start
    ball.addEventListener('mousedown', startDrag);
    ball.addEventListener('touchstart', function(e) {
        e.preventDefault();
        startDrag(e.touches[0]);
    });
    
    // Ball drag
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
        drag(e.touches[0]);
    });
    
    // Ball release
    document.addEventListener('mouseup', releaseBall);
    document.addEventListener('touchend', releaseBall);
    
    // Reset button
    if (resetButton) {
        resetButton.addEventListener('click', resetGame);
    }
    
    function startDrag(e) {
        if (ballInMotion) return;
        
        isDragging = true;
        startX = e.clientX || e.pageX;
        startY = e.clientY || e.pageY;
        
        ball.style.transition = 'none';
        ball.style.cursor = 'grabbing';
    }
    
    function drag(e) {
        if (!isDragging || ballInMotion) return;
        
        const x = e.clientX || e.pageX;
        const y = e.clientY || e.pageY;
        
        // Calculate the distance and angle for pulling back the ball
        const deltaX = startX - x;
        const deltaY = startY - y;
        
        // Limit the pull distance
        const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 100);
        const angle = Math.atan2(deltaY, deltaX);
        
        const pullX = distance * Math.cos(angle);
        const pullY = distance * Math.sin(angle);
        
        // Visualize trajectory if needed
        showTrajectory(pullX, pullY);
        
        // Apply transform to the ball to show it being pulled back
        ball.style.transform = `translate(${-pullX}px, ${-pullY}px)`;
    }
    
    function releaseBall() {
        if (!isDragging || ballInMotion) return;
        
        isDragging = false;
        ball.style.cursor = 'grab';
        
        // Get the final position of the ball when released
        const ballRect = ball.getBoundingClientRect();
        const transform = window.getComputedStyle(ball).getPropertyValue('transform');
        const matrix = new DOMMatrix(transform);
        
        // Calculate the shoot velocity based on how far the ball was pulled
        const translateX = matrix.m41;
        const translateY = matrix.m42;
        
        if (Math.abs(translateX) > 5 || Math.abs(translateY) > 5) {
            shootBall(-translateX * 0.2, -translateY * 0.2);
        } else {
            ball.style.transition = 'transform 0.3s';
            ball.style.transform = 'translate(0, 0)';
        }
    }
    
    function shootBall(velocityX, velocityY) {
        if (ballInMotion) return;
        
        ballInMotion = true;
        isShooting = true;
        
        // Reset ball style
        ball.style.transition = 'none';
        
        const ballRect = ball.getBoundingClientRect();
        const gameContainerRect = gameContainer.getBoundingClientRect();
        const basketRect = basket.getBoundingClientRect();
        
        // Initial position relative to the game container
        let posX = ballRect.left - gameContainerRect.left + velocityX;
        let posY = ballRect.top - gameContainerRect.top + velocityY;
        
        // Initial velocity and gravity
        let vx = velocityX;
        let vy = velocityY;
        const gravity = 0.8;
        
        // Coefficient of restitution (bounciness)
        const damping = 0.7;
        
        // Animation frame tracking
        let animationFrameId;
        
        // Flag to check if ball went through the hoop
        let wentThroughHoop = false;
        let scoredThisShot = false;
        let checkingForScore = false;
        
        // Initial position of the ball's center
        const ballRadius = ballRect.width / 2;
        const basketLeft = basketRect.left - gameContainerRect.left;
        const basketRight = basketRect.right - gameContainerRect.left;
        const basketTop = basketRect.top - gameContainerRect.top;
        const basketHeight = basketRect.height;
        
        function updateBall() {
            // Apply gravity
            vy += gravity;
            
            // Update position
            posX += vx;
            posY += vy;
            
            // Check collisions with walls
            if (posX < ballRadius) {
                posX = ballRadius;
                vx = -vx * damping;
            } else if (posX > gameContainerRect.width - ballRadius) {
                posX = gameContainerRect.width - ballRadius;
                vx = -vx * damping;
            }
            
            // Check if the ball is at the height of the basket rim
            const ballCenterY = posY + ballRadius;
            
            // Check if the ball went through the hoop
            // The ball should be at the height of the basket and within its horizontal bounds
            if (!checkingForScore && 
                ballCenterY >= basketTop && 
                ballCenterY <= basketTop + basketHeight && 
                posX + ballRadius >= basketLeft && 
                posX - ballRadius <= basketRight) {
                
                checkingForScore = true;
                
                // Wait to see if the ball continues downward through the basket
                setTimeout(() => {
                    if (ballCenterY > basketTop + basketHeight && !scoredThisShot) {
                        wentThroughHoop = true;
                        score++;
                        scoreDisplay.textContent = `Score: ${score}`;
                        scoredThisShot = true;
                    }
                    checkingForScore = false;
                }, 100);
            }
            
            // Check collision with floor
            if (posY > gameContainerRect.height - ballRadius - 30) { // 30 is floor height
                posY = gameContainerRect.height - ballRadius - 30;
                vy = -vy * damping;
                
                // If the ball is mostly stopped
                if (Math.abs(vy) < 2) {
                    vy = 0;
                    
                    // If horizontal velocity is also low, stop the animation
                    if (Math.abs(vx) < 0.5) {
                        vx = 0;
                        
                        // End the shooting sequence after a brief delay
                        setTimeout(() => {
                            ballInMotion = false;
                            isShooting = false;
                            resetBallPosition();
                        }, 500);
                        
                        cancelAnimationFrame(animationFrameId);
                        return;
                    }
                    
                    // Apply friction when on the ground
                    vx *= 0.95;
                }
            }
            
            // Update ball position
            ball.style.left = `${posX - ballRadius}px`;
            ball.style.top = `${posY - ballRadius}px`;
            
            animationFrameId = requestAnimationFrame(updateBall);
        }
        
        // Start the animation
        updateBall();
    }
    
    function showTrajectory(pullX, pullY) {
        // Placeholder for trajectory visualization
        // Can be implemented with dots or a line showing the potential path
    }
    
    function resetBallPosition() {
        ball.style.transition = 'transform 0.5s, left 0.5s, top 0.5s';
        ball.style.transform = 'translate(0, 0)';
        ball.style.left = '40px';
        ball.style.top = '';
        ball.style.bottom = '40px';
    }
    
    function resetGame() {
        score = 0;
        scoreDisplay.textContent = `Score: ${score}`;
        
        if (!ballInMotion) {
            resetBallPosition();
        }
    }
} 
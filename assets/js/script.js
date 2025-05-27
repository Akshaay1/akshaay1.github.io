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

    // Basketball Game
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        const ball = document.querySelector('.ball');
        const aimSlider = document.querySelector('.aim-slider');
        const aimingLine = document.querySelector('.aiming-line');
        const powerBar = document.querySelector('.power-bar');
        const shootButton = document.querySelector('.shoot-button');
        const resetButton = document.querySelector('.reset-button');
        const scoreDisplay = document.querySelector('.score-display');
        
        let score = 0;
        let isPowerRunning = false;
        let powerLevel = 0;
        let powerDirection = 1; // 1 for increasing, -1 for decreasing
        let powerInterval;
        let isAnimating = false;
        
        // Update the aiming line based on slider value
        function updateAimingLine() {
            const angle = aimSlider.value;
            aimingLine.style.transform = `rotate(${angle}deg)`;
        }
        
        // Initialize aiming line
        updateAimingLine();
        
        // Update aiming line when slider is moved
        aimSlider.addEventListener('input', updateAimingLine);
        
        // Start/stop power meter
        shootButton.addEventListener('click', function() {
            if (isAnimating) return;
            
            if (!isPowerRunning) {
                // Start power meter
                isPowerRunning = true;
                shootButton.textContent = 'Stop';
                
                powerInterval = setInterval(function() {
                    powerLevel += powerDirection;
                    
                    if (powerLevel >= 100) {
                        powerDirection = -1;
                    } else if (powerLevel <= 0) {
                        powerDirection = 1;
                    }
                    
                    powerBar.style.width = `${powerLevel}%`;
                }, 30);
                
            } else {
                // Stop power meter and shoot
                isPowerRunning = false;
                clearInterval(powerInterval);
                shootButton.textContent = 'Shoot';
                shootBall();
            }
        });
        
        // Shoot the ball based on angle and power
        function shootBall() {
            if (isAnimating) return;
            isAnimating = true;
            
            const angle = aimSlider.value;
            const power = powerLevel / 100 * 10; // Scale to reasonable value
            
            // Physics calculations for projectile motion
            const radians = angle * Math.PI / 180;
            const initialVelocityX = Math.cos(radians) * power;
            const initialVelocityY = Math.sin(radians) * power;
            
            // Initial ball position
            let ballX = 40; // initial left position
            let ballY = 350; // initial bottom position (inverted)
            let time = 0;
            const gravity = 0.2;
            
            // Animate the ball
            const ballAnimation = setInterval(function() {
                time += 0.5;
                
                // Calculate new position
                ballX = 40 + initialVelocityX * time * 6;
                ballY = 350 - (initialVelocityY * time * 12 - 0.5 * gravity * time * time * 6);
                
                // Update ball position
                ball.style.left = `${ballX}px`;
                ball.style.bottom = `${ballY}px`;
                
                // Check if ball is in basket
                if (ballX > 180 && ballX < 250 && ballY > 300 && ballY < 340) {
                    clearInterval(ballAnimation);
                    score++;
                    scoreDisplay.textContent = `Score: ${score}`;
                    setTimeout(resetBall, 500);
                }
                
                // Check if ball is out of bounds
                if (ballX > 300 || ballY < 0 || ballY > 400) {
                    clearInterval(ballAnimation);
                    setTimeout(resetBall, 500);
                }
            }, 20);
            
            // Show trajectory dots
            const trajectoryInterval = setInterval(function() {
                if (!isAnimating) {
                    clearInterval(trajectoryInterval);
                    return;
                }
                
                const dot = document.createElement('div');
                dot.classList.add('trajectory');
                dot.style.left = `${ballX + 16}px`; // center of ball
                dot.style.bottom = `${ballY + 16}px`; // center of ball
                gameContainer.appendChild(dot);
                
                // Remove dot after a short time
                setTimeout(function() {
                    if (dot && dot.parentNode) {
                        dot.parentNode.removeChild(dot);
                    }
                }, 300);
            }, 50);
        }
        
        // Reset ball position
        function resetBall() {
            ball.style.left = '40px';
            ball.style.bottom = '40px';
            powerBar.style.width = '0%';
            powerLevel = 0;
            isAnimating = false;
        }
        
        // Reset game button
        resetButton.addEventListener('click', function() {
            clearInterval(powerInterval);
            isPowerRunning = false;
            score = 0;
            scoreDisplay.textContent = 'Score: 0';
            shootButton.textContent = 'Shoot';
            resetBall();
            
            // Remove all trajectory dots
            document.querySelectorAll('.trajectory').forEach(dot => {
                dot.parentNode.removeChild(dot);
            });
        });
    }
}); 
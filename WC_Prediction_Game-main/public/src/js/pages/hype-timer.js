// Hype Timer Page - Countdown to June 8th, 5 PM
// Shows estimated time left for app release
// Admins bypass this screen entirely

function createHypeTimerPage() {
    return `
        <div class="hype-timer-container">
            <div class="hype-timer-content fadeInUp">
                <div class="hype-header">
                    <img src="https://www.deloitte.com/content/dam/assets-shared/logos/svg/a-d/deloitte.svg" alt="Deloitte" class="hype-logo">
                    <h1>World Cup Predictor</h1>
                    <p class="hype-subtitle">Coming Soon</p>
                </div>

                <div class="hype-timer-card">
                    <div class="hype-icon">⏳</div>
                    <h2>Get Ready for the Action!</h2>
                    <p class="hype-description">
                        The World Cup prediction game is launching soon. 
                        Prepare your predictions and compete with your colleagues!
                    </p>

                    <div class="timer-section">
                        <p class="timer-label">Estimated time left for release:</p>
                        <div class="timer-display" id="countdownTimer">
                            <span class="timer-value" id="timerDays">0</span><span class="timer-unit">d</span>
                            <span class="timer-value" id="timerHours">0</span><span class="timer-unit">h</span>
                            <span class="timer-value" id="timerMinutes">0</span><span class="timer-unit">m</span>
                            <span class="timer-value" id="timerSeconds">0</span><span class="timer-unit">s</span>
                        </div>
                    </div>

                    <div class="hype-info">
                        <div class="info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>June 8th, 2026</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>5:00 PM (Ireland Time)</span>
                        </div>
                    </div>

                    <div class="hype-features">
                        <h3>What to Expect:</h3>
                        <ul>
                            <li><i class="fas fa-futbol"></i> Predict match scores</li>
                            <li><i class="fas fa-trophy"></i> Pick tournament winner</li>
                            <li><i class="fas fa-boot"></i> Golden Boot predictions</li>
                            <li><i class="fas fa-shield-alt"></i> Golden Glove predictions</li>
                            <li><i class="fas fa-chart-bar"></i> Live leaderboards</li>
                            <li><i class="fas fa-users"></i> Compete with colleagues</li>
                        </ul>
                    </div>

                    <button class="btn btn-secondary" onclick="handleLogout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>

                <div class="hype-footer">
                    <p>Thank you for your patience. The game will be available soon!</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Start the countdown timer
 * Counts down to June 8th, 2026 at 5:00 PM Ireland Time
 */
function startHypeTimer() {
    console.log('[HYPE_TIMER] Starting countdown timer');
    
    // Update timer immediately
    updateHypeTimer();
    
    // Update every second
    const timerInterval = setInterval(() => {
        updateHypeTimer();
    }, 1000);
    
    // Store interval ID for cleanup if needed
    window.hypeTimerInterval = timerInterval;
}

/**
 * Update the countdown timer display
 */
function updateHypeTimer() {
    // Target date: June 8th, 2026 at 5:00 PM Ireland Time (UTC+1)
    // Create date in Ireland timezone
    const targetDate = new Date('2026-06-08T17:00:00+01:00');
    const now = new Date();
    
    const timeRemaining = targetDate - now;
    
    if (timeRemaining <= 0) {
        // Timer has expired - redirect to app
        console.log('[HYPE_TIMER] Countdown complete! Redirecting to app...');
        showPage('homePage');
        return;
    }
    
    // Calculate time units
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    // Update display
    const daysEl = document.getElementById('timerDays');
    const hoursEl = document.getElementById('timerHours');
    const minutesEl = document.getElementById('timerMinutes');
    const secondsEl = document.getElementById('timerSeconds');
    
    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
}

/**
 * Handle logout from hype screen
 */
function handleLogout() {
    console.log('[HYPE_TIMER] User logging out');
    
    // Clear timer interval
    if (window.hypeTimerInterval) {
        clearInterval(window.hypeTimerInterval);
    }
    
    // Clear all user data
    logoutUser();
    
    // Redirect to login
    showPage('loginPage');
}

/**
 * Auto-start timer when hype page is shown
 */
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        const hypePage = document.getElementById('hypeTimerPage');
        if (hypePage && hypePage.classList.contains('active')) {
            console.log('[HYPE_TIMER] Hype timer page is now active');
            // Start timer after a short delay to ensure DOM is ready
            setTimeout(startHypeTimer, 100);
        }
    });
    
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
});
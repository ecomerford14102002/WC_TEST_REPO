// Score Predictions Page - FIXED VERSION
// Features:
// - Fetch matches from database
// - Real-time countdown timers (2-hour deadline) with proper D/H/M/S format
// - Load and display user's existing predictions
// - Individual match submission
// - Lock mechanism (2 hours before match)
// - Show actual scores when finished
// - Edit/resubmit before deadline
// - Smart match sorting (past → today → future)
// - Auto-scroll to today's matches
// - Jump navigation buttons

// Global state
let matchesData = [];
let userPredictions = {};
let timerIntervals = {};

/**
 * Create the predictions page HTML
 */
function createPredictionsPage() {
    return `
        <button class="back-button" onclick="showPage('homePage')">
            <i class="fas fa-arrow-left"></i> Back to Home
        </button>

        <div class="header">
            <div class="header-logo">
                <img src="https://www.deloitte.com/content/dam/assets-shared/logos/svg/a-d/deloitte.svg" alt="Deloitte">
            </div>
            <div class="header-title">
                <h1>Score Predictions</h1>
            </div>
            <div class="header-user">
                <i class="fas fa-flag"></i>
                <span id="userTeamDisplay">Your Team</span>
            </div>
        </div>

        <script>
            // ✅ NEW: Display actual team name in header
            (function() {
                const assignedTeam = JSON.parse(localStorage.getItem('assignedTeam') || '{}');
                const userTeamDisplay = document.getElementById('userTeamDisplay');
                if (userTeamDisplay && assignedTeam.name) {
                    userTeamDisplay.textContent = (assignedTeam.flag || '⚽') + ' ' + assignedTeam.name;
                }
            })();
        </script>

        <div class="my-points-card fadeInUp">
            <div class="my-points-stats">
                <div class="points-stat">
                    <div class="points-stat-label">My Points</div>
                    <div class="points-stat-value" id="myPointsDisplay">0</div>
                </div>
                <div class="points-stat">
                    <div class="points-stat-label">Position</div>
                    <div class="position-value" id="myPositionDisplay">-</div>
                </div>
            </div>
            <button class="btn-history" onclick="openHistory()">
                <i class="fas fa-history"></i> My History
            </button>
        </div>

        <div class="matches-container">
            <div class="page-title fadeInUp">
                <h1>Score Predictions</h1>
                <p>Make your score predictions for the following matches</p>
            </div>

            <!-- ✅ NEW: Jump Navigation Buttons -->
            <div class="jump-navigation fadeInUp">
                <button class="jump-btn" onclick="jumpToSection('past')">
                    <i class="fas fa-arrow-up"></i> Past Matches
                </button>
                <button class="jump-btn active" onclick="jumpToSection('today')">
                    <i class="fas fa-calendar-day"></i> Today
                </button>
                <button class="jump-btn" onclick="jumpToSection('future')">
                    <i class="fas fa-arrow-down"></i> Future Matches
                </button>
            </div>

            <div id="matchesLoadingContainer" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #86BC25;"></i>
                <p style="margin-top: 15px; color: rgba(255, 255, 255, 0.7);">Loading matches...</p>
            </div>

            <div id="matchesContainer" style="display: none;"></div>

            <div id="noMatchesContainer" style="display: none; text-align: center; padding: 40px;">
                <i class="fas fa-inbox" style="font-size: 3rem; color: rgba(255, 255, 255, 0.3); margin-bottom: 20px;"></i>
                <p style="color: rgba(255, 255, 255, 0.6);">No matches available at the moment</p>
            </div>
        </div>
    `;
}

/**
 * ✅ NEW: Update team display in header
 */
function updateTeamDisplay() {
    const assignedTeam = JSON.parse(localStorage.getItem('assignedTeam') || '{}');
    const userTeamDisplay = document.getElementById('userTeamDisplay');
    if (userTeamDisplay && assignedTeam.name) {
        userTeamDisplay.textContent = (assignedTeam.flag || '⚽') + ' ' + assignedTeam.name;
        console.log('[PREDICTIONS] Updated team display:', assignedTeam.name);
    }
}

/**
 * Load matches and user predictions when predictions page is shown
 */
async function loadMatches() {
    try {
        console.log('[PREDICTIONS] Loading matches and user predictions...');
        
        // ✅ NEW: Update team display
        updateTeamDisplay();
        
        // Get user ID from localStorage
        const userId = parseInt(localStorage.getItem('userId'));
        if (!userId) {
            console.warn('[PREDICTIONS] User ID not found in localStorage');
        }
        
        // Fetch matches from API
        const matchesResponse = await fetchMatches();
        
        if (!matchesResponse.matches || matchesResponse.matches.length === 0) {
            console.log('[PREDICTIONS] No matches found');
            document.getElementById('matchesLoadingContainer').style.display = 'none';
            document.getElementById('noMatchesContainer').style.display = 'block';
            return;
        }
        
        matchesData = matchesResponse.matches;
        console.log('[PREDICTIONS] Loaded', matchesData.length, 'matches');
        
        // Fetch user's existing predictions if user is authenticated
        if (userId) {
            try {
                const predictionsResponse = await fetchUserPredictions(userId);
                if (predictionsResponse.predictions && predictionsResponse.predictions.length > 0) {
                    // Build a map of predictions by match_id for quick lookup
                    predictionsResponse.predictions.forEach(pred => {
                        userPredictions[pred.match_id] = {
                            prediction_id: pred.prediction_id,
                            predicted_home_score: pred.predicted_home_score,
                            predicted_away_score: pred.predicted_away_score,
                            points_earned: pred.points_earned
                        };
                    });
                    console.log('[PREDICTIONS] Loaded', Object.keys(userPredictions).length, 'existing predictions');
                }
            } catch (error) {
                console.warn('[PREDICTIONS] Could not load existing predictions:', error);
                // Continue anyway - user can still make new predictions
            }
        }
        
        // Render matches
        renderMatches();
        
        // ✅ NEW: Auto-scroll to today's match
        setTimeout(() => {
            const todaySection = document.getElementById('today-section');
            if (todaySection) {
                todaySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                console.log('[PREDICTIONS] Auto-scrolled to today\'s matches');
            }
        }, 300);
        
        // Start timers for all matches
        startAllTimers();
        
    } catch (error) {
        console.error('[PREDICTIONS] Error loading matches:', error);
        document.getElementById('matchesLoadingContainer').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #EF4444; margin-bottom: 15px;"></i>
                <p style="color: #EF4444;">Error loading matches</p>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; margin-top: 10px;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadMatches()" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

/**
 * ✅ NEW: Group matches by date (past, today, future)
 */
function groupMatchesByDate() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const pastMatches = [];
    const todayMatches = [];
    const futureMatches = [];
    
    matchesData.forEach(match => {
        const matchDate = new Date(match.match_date_utc);
        const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
        
        if (matchDay < today) {
            pastMatches.push(match);
        } else if (matchDay.getTime() === today.getTime()) {
            todayMatches.push(match);
        } else {
            futureMatches.push(match);
        }
    });
    
    // Sort each group by date
    pastMatches.sort((a, b) => new Date(b.match_date_utc) - new Date(a.match_date_utc)); // Newest first
    todayMatches.sort((a, b) => new Date(a.match_date_utc) - new Date(b.match_date_utc)); // Oldest first
    futureMatches.sort((a, b) => new Date(a.match_date_utc) - new Date(b.match_date_utc)); // Oldest first
    
    return { pastMatches, todayMatches, futureMatches };
}

/**
 * Render all matches with grouping and sorting
 */
function renderMatches() {
    const container = document.getElementById('matchesContainer');
    
    if (!container) return;
    
    // Group matches by date
    const { pastMatches, todayMatches, futureMatches } = groupMatchesByDate();
    
    let html = '';
    
    // ✅ PAST MATCHES SECTION (Collapsed by default)
    if (pastMatches.length > 0) {
        html += `
            <div class="matches-section" id="past-section">
                <div class="section-header" onclick="toggleSection('past')">
                    <div class="section-title">
                        <i class="fas fa-chevron-right section-toggle" id="past-toggle"></i>
                        <i class="fas fa-history"></i> Past Matches
                        <span class="section-count">${pastMatches.length}</span>
                    </div>
                </div>
                <div class="section-content" id="past-content" style="display: none;">
        `;
        
        pastMatches.forEach(match => {
            html += renderMatchCard(match);
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // ✅ TODAY'S MATCHES SECTION (Expanded, Highlighted)
    if (todayMatches.length > 0) {
        html += `
            <div class="matches-section today-section" id="today-section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-calendar-day"></i> Today's Matches
                        <span class="section-count">${todayMatches.length}</span>
                    </div>
                </div>
                <div class="section-content" id="today-content" style="display: block;">
        `;
        
        todayMatches.forEach(match => {
            html += renderMatchCard(match);
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // ✅ FUTURE MATCHES SECTION (Expanded)
    if (futureMatches.length > 0) {
        html += `
            <div class="matches-section" id="future-section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fas fa-calendar-plus"></i> Upcoming Matches
                        <span class="section-count">${futureMatches.length}</span>
                    </div>
                </div>
                <div class="section-content" id="future-content" style="display: block;">
        `;
        
        futureMatches.forEach(match => {
            html += renderMatchCard(match);
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    container.style.display = 'block';
    document.getElementById('matchesLoadingContainer').style.display = 'none';
}

/**
 * ✅ NEW: Render individual match card
 */
function renderMatchCard(match) {
    const matchState = getMatchState(match);
    const isLocked = matchState.isLocked;
    const isFinished = matchState.isFinished;
    
    // Get user's existing prediction if any
    const existingPrediction = userPredictions[match.match_id] || {};
    const userHomeScore = existingPrediction.predicted_home_score || '';
    const userAwayScore = existingPrediction.predicted_away_score || '';
    
    // Format match date to Ireland timezone
    const matchDate = new Date(match.match_date_utc);
    const formattedDate = matchDate.toLocaleString('en-IE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Dublin'
    });
    
    // Determine card styling based on state
    let cardClass = 'match-card fadeInUp';
    if (isLocked) cardClass += ' match-locked';
    if (isFinished) cardClass += ' match-finished';
    
    return `
        <div class="${cardClass}" id="match-${match.match_id}">
            <div class="match-header">
                <div class="match-title">
                    ${match.home_team} vs ${match.away_team}
                </div>
                <div class="match-date">
                    ${formattedDate}
                </div>
            </div>

            <div class="match-timer-section">
                <div class="timer-display" id="timer-${match.match_id}">
                    ${matchState.timerText}
                </div>
                ${isLocked && !isFinished ? '<div class="match-locked-badge"><i class="fas fa-lock"></i> Match Locked</div>' : ''}
                ${isFinished ? '<div class="match-finished-badge"><i class="fas fa-play-circle"></i> Match In Progress</div>' : ''}
            </div>

            <div class="match-prediction">
                <div class="team-section">
                    <div class="team-name">${match.home_team}</div>
                    <input 
                        type="number" 
                        class="score-input" 
                        id="score-${match.match_id}-home" 
                        value="${userHomeScore}" 
                        min="0" 
                        max="20"
                        ${isLocked || isFinished ? 'disabled' : ''}
                        placeholder="0"
                    >
                    <div class="score-controls" ${isLocked || isFinished ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                        <button 
                            class="score-btn" 
                            onclick="decrementScore('score-${match.match_id}-home')"
                            ${isLocked || isFinished ? 'disabled' : ''}
                        >
                            <i class="fas fa-minus"></i>
                        </button>
                        <button 
                            class="score-btn" 
                            onclick="incrementScore('score-${match.match_id}-home')"
                            ${isLocked || isFinished ? 'disabled' : ''}
                        >
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                
                <div class="vs-divider">VS</div>
                
                <div class="team-section">
                    <div class="team-name">${match.away_team}</div>
                    <input 
                        type="number" 
                        class="score-input" 
                        id="score-${match.match_id}-away" 
                        value="${userAwayScore}" 
                        min="0" 
                        max="20"
                        ${isLocked || isFinished ? 'disabled' : ''}
                        placeholder="0"
                    >
                    <div class="score-controls" ${isLocked || isFinished ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
                        <button 
                            class="score-btn" 
                            onclick="decrementScore('score-${match.match_id}-away')"
                            ${isLocked || isFinished ? 'disabled' : ''}
                        >
                            <i class="fas fa-minus"></i>
                        </button>
                        <button 
                            class="score-btn" 
                            onclick="incrementScore('score-${match.match_id}-away')"
                            ${isLocked || isFinished ? 'disabled' : ''}
                        >
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>

                        ${isFinished ? `
                <div class="actual-score-section">
                    <div class="actual-score-label">Final Score</div>
                    <div class="actual-score">
                        ${match.home_score !== null ? match.home_score : '-'} - ${match.away_score !== null ? match.away_score : '-'}
                    </div>
                </div>
            ` : ''}

                        <div class="match-actions">
                <button 
                    class="btn btn-primary submit-prediction-btn" 
                    id="btn-${match.match_id}"
                    onclick="submitMatchPrediction('${match.match_id}')"
                    ${isLocked || isFinished ? 'disabled' : ''}
                >
                    <i class="fas fa-check"></i> ${existingPrediction.prediction_id ? 'Update Prediction' : 'Submit Prediction'}
                </button>
                <div class="submission-feedback" id="feedback-${match.match_id}"></div>
            </div>

            <div class="penalty-prediction-section">
                <div class="penalty-header">
                    <div class="penalty-title">Penalty Shootout Prediction</div>
                    <div class="penalty-subtitle">(Optional - if match goes to penalties)</div>
                </div>
                
                <div class="penalty-selection">
                    <button 
                        type="button"
                        class="penalty-team-btn" 
                        id="penalty-${match.match_id}-home"
                        onclick="selectPenaltyWinner('${match.match_id}', 'home')"
                        ${isLocked || isFinished ? 'disabled' : ''}
                    >
                        <span class="penalty-team-name">${match.home_team}</span>
                        <span class="penalty-checkmark" id="penalty-check-${match.match_id}-home"></span>
                    </button>
                    
                    <button 
                        type="button"
                        class="penalty-team-btn" 
                        id="penalty-${match.match_id}-away"
                        onclick="selectPenaltyWinner('${match.match_id}', 'away')"
                        ${isLocked || isFinished ? 'disabled' : ''}
                    >
                        <span class="penalty-team-name">${match.away_team}</span>
                        <span class="penalty-checkmark" id="penalty-check-${match.match_id}-away"></span>
                    </button>
                </div>

                <button
                    type="button"
                    class="btn btn-secondary penalty-submit-btn" 
                    id="penalty-submit-${match.match_id}"
                    onclick="submitPenaltyPredictionClick('${match.match_id}')"
                    ${isLocked || isFinished ? 'disabled' : ''}
                    disabled
                >
                    <i class="fas fa-check"></i> Submit Penalty Prediction
                </button>
                
                <div class="penalty-feedback" id="penalty-feedback-${match.match_id}"></div>
            </div>

            
    `;
}

/**
 * ✅ NEW: Toggle section visibility (Past matches only)
 */
function toggleSection(sectionName) {
    const content = document.getElementById(`${sectionName}-content`);
    const toggle = document.getElementById(`${sectionName}-toggle`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.style.transform = 'rotate(90deg)';
    } else {
        content.style.display = 'none';
        toggle.style.transform = 'rotate(0deg)';
    }
}

/**
 * ✅ NEW: Jump to section with smooth scroll
 */
function jumpToSection(sectionName) {
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        // If it's past section, expand it first
        if (sectionName === 'past') {
            const content = document.getElementById('past-content');
            if (content && content.style.display === 'none') {
                toggleSection('past');
            }
        }
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Get match state (upcoming, locked, finished)
 */
function getMatchState(match) {
    const now = new Date();
    const matchTime = new Date(match.match_date_utc);
    const deadlineTime = new Date(matchTime.getTime() - (0 * 60 * 60 * 1000)); // 2 hours before
    
    // ✅ FIXED: Check if match has actually started (current time >= match time)
    const isFinished = now >= matchTime;
    const isLocked = now >= deadlineTime && !isFinished;
    
    let timerText = '';
    
    if (isFinished) {
        timerText = '<i class="fas fa-play-circle"></i> Match In Progress';
    } else if (isLocked) {
        timerText = '<i class="fas fa-lock"></i> Match Locked';
    } else {
        // Calculate time remaining until deadline (2 hours before match)
        const timeRemaining = deadlineTime - now;
        timerText = formatTimeRemaining(timeRemaining);
    }
    
    return {
        isLocked,
        isFinished,
        timerText
    };
}

/**
 * Format time remaining in D/H/M/S format
 */
function formatTimeRemaining(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    let timeString = '<i class="fas fa-hourglass-end"></i> ';
    
    if (days > 0) {
        timeString += `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
        timeString += `${hours}h ${minutes}m ${seconds}s`;
    }
    
    return timeString;
}

/**
 * Start timers for all matches
 */
function startAllTimers() {
    // Clear existing intervals
    Object.values(timerIntervals).forEach(interval => clearInterval(interval));
    timerIntervals = {};
    
    // Start new intervals for each match
    matchesData.forEach(match => {
        updateTimer(match.match_id);
        
        timerIntervals[match.match_id] = setInterval(() => {
            updateTimer(match.match_id);
        }, 1000); // Update every second
    });
}

/**
 * Update timer for a specific match
 */
function updateTimer(matchId) {
    const match = matchesData.find(m => m.match_id === matchId);
    if (!match) return;
    
    const timerElement = document.getElementById(`timer-${matchId}`);
    if (!timerElement) return;
    
    const matchState = getMatchState(match);
    const matchCard = document.getElementById(`match-${matchId}`);
    const submitBtn = document.getElementById(`btn-${matchId}`);
    
    // Update timer text
    timerElement.innerHTML = matchState.timerText;
    
    // Update card state
    if (matchState.isLocked && !matchCard.classList.contains('match-locked')) {
        matchCard.classList.add('match-locked');
        
        // Disable inputs
        const homeInput = document.getElementById(`score-${matchId}-home`);
        const awayInput = document.getElementById(`score-${matchId}-away`);
        if (homeInput) homeInput.disabled = true;
        if (awayInput) awayInput.disabled = true;
        
        // Disable button
        if (submitBtn) submitBtn.disabled = true;
        
        // Show locked badge
        if (!timerElement.parentElement.querySelector('.match-locked-badge')) {
            const badge = document.createElement('div');
            badge.className = 'match-locked-badge';
            badge.innerHTML = '<i class="fas fa-lock"></i> Match Locked';
            timerElement.parentElement.appendChild(badge);
        }
    }
    
    if (matchState.isFinished && !matchCard.classList.contains('match-finished')) {
        matchCard.classList.add('match-finished');
        
        // Disable inputs
        const homeInput = document.getElementById(`score-${matchId}-home`);
        const awayInput = document.getElementById(`score-${matchId}-away`);
        if (homeInput) homeInput.disabled = true;
        if (awayInput) awayInput.disabled = true;
        
        // Disable button
        if (submitBtn) submitBtn.disabled = true;
    }
}

/**
 * Increment score
 */
function incrementScore(inputId) {
    const input = document.getElementById(inputId);
    if (input && !input.disabled) {
        let value = parseInt(input.value) || 0;
        if (value < 20) {
            input.value = value + 1;
            animateScoreChange(input);
        }
    }
}

/**
 * Decrement score
 */
function decrementScore(inputId) {
    const input = document.getElementById(inputId);
    if (input && !input.disabled) {
        let value = parseInt(input.value) || 0;
        if (value > 0) {
            input.value = value - 1;
            animateScoreChange(input);
        }
    }
}

/**
 * Animate score change
 */
function animateScoreChange(input) {
    input.style.transform = 'scale(1.2)';
    input.style.borderColor = '#86BC25';
    setTimeout(() => {
        input.style.transform = 'scale(1)';
        input.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    }, 200);
}

/**
 * Submit prediction for a specific match
 */
async function submitMatchPrediction(matchId) {
    try {
        const match = matchesData.find(m => m.match_id === matchId);
        if (!match) {
            alert('Match not found');
            return;
        }
        
        // Check if match is locked
        const matchState = getMatchState(match);
        if (matchState.isLocked || matchState.isFinished) {
            alert('Cannot submit prediction for this match');
            return;
        }
        
        // Get scores
        const homeScore = document.getElementById(`score-${matchId}-home`).value;
        const awayScore = document.getElementById(`score-${matchId}-away`).value;
        
        // Validate
        if (homeScore === '' || awayScore === '') {
            alert('Please enter both scores');
            return;
        }
        
        const homeScoreInt = parseInt(homeScore);
        const awayScoreInt = parseInt(awayScore);
        
        if (homeScoreInt < 0 || homeScoreInt > 20 || awayScoreInt < 0 || awayScoreInt > 20) {
            alert('Scores must be between 0 and 20');
            return;
        }
        
        // Get user data
        const userId = parseInt(localStorage.getItem('userId'));
        if (!userId) {
            alert('User not authenticated');
            return;
        }
        
        // Show loading state
        const button = document.getElementById(`btn-${matchId}`);
        const feedback = document.getElementById(`feedback-${matchId}`);
        const originalText = button.innerHTML;
        
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        button.disabled = true;
        
        // Submit prediction
        const response = await submitPrediction(userId, matchId, homeScoreInt, awayScoreInt);
        
        if (response.status === 'success') {
            // Store prediction locally
            userPredictions[matchId] = {
                prediction_id: response.prediction_id || Date.now(),
                predicted_home_score: homeScoreInt,
                predicted_away_score: awayScoreInt
            };
            
            // Show success message
            feedback.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i> Prediction saved!</div>';
            feedback.style.display = 'block';
            
            // Update button text
            button.innerHTML = '<i class="fas fa-check"></i> Update Prediction';
            button.disabled = false;
            
            // Clear feedback after 3 seconds
            setTimeout(() => {
                feedback.style.display = 'none';
            }, 3000);
            
            console.log('[PREDICTIONS] Prediction submitted successfully');
        } else {
            throw new Error(response.message || 'Failed to submit prediction');
        }
        
    } catch (error) {
        console.error('[PREDICTIONS] Error submitting prediction:', error);
        
        const button = document.getElementById(`btn-${matchId}`);
        const feedback = document.getElementById(`feedback-${matchId}`);
        
        feedback.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
        feedback.style.display = 'block';
        
        button.innerHTML = '<i class="fas fa-check"></i> Submit Prediction';
        button.disabled = false;
        
        // Clear feedback after 5 seconds
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 5000);
    }
}

/**
 * Open prediction history modal
 */
async function openHistory() {
    try {
        console.log('[PREDICTIONS] Opening history modal...');
        
        // Get user ID and JWT token
        const userId = parseInt(localStorage.getItem('userId'));
        const jwtToken = getJWTToken();
        
        if (!userId) {
            alert('User not authenticated');
            return;
        }
        
        if (!jwtToken) {
            alert('Session expired. Please log in again.');
            return;
        }
        
        // Show loading state
        const historyModal = document.createElement('div');
        historyModal.id = 'historyModal';
        historyModal.className = 'modal';
        historyModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-history"></i> My Prediction History</h2>
                    <button class="modal-close" onclick="closeHistory()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #86BC25;"></i>
                        <p style="margin-top: 15px; color: rgba(255, 255, 255, 0.7);">Loading your history...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(historyModal);        // ✅ FIXED: Use correct endpoint /prediction_history with POST method
        console.log('[PREDICTIONS] Fetching history for user:', userId);
        
        const response = await fetch(`${API_BASE_URL}/prediction_history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId
            })
        });
        
        console.log('[PREDICTIONS] History response status:', response.status);
        
        const data = await response.json();
        console.log('[PREDICTIONS] History data:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch prediction history');
        }
        
        // Parse the response
        const predictions = data.predictions || [];
        
        console.log('[PREDICTIONS] Loaded', predictions.length, 'finished predictions');
        
        // Build history HTML
        let historyHTML = `
            <div class="modal-header">
                <h2><i class="fas fa-history"></i> My Prediction History</h2>
                <button class="modal-close" onclick="closeHistory()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
        `;
        
        if (predictions.length === 0) {
            historyHTML += `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: rgba(255, 255, 255, 0.3); margin-bottom: 20px;"></i>
                    <p style="color: rgba(255, 255, 255, 0.6);">No finished matches yet</p>
                </div>
            `;
        } else {
            historyHTML += '<div class="history-list">';
            
            predictions.forEach(pred => {
                const matchDate = new Date(pred.match_date_utc);
                const formattedDate = matchDate.toLocaleString('en-IE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Dublin'
                });
                
                const isCorrect = pred.predicted_home_score === pred.home_score && 
                                 pred.predicted_away_score === pred.away_score;
                const pointsClass = pred.points_earned > 0 ? 'points-positive' : 'points-zero';
                
                historyHTML += `
                    <div class="history-item ${isCorrect ? 'correct-prediction' : ''}">
                        <div class="history-match">
                            <div class="history-teams">
                                <span class="team-name">${pred.home_team}</span>
                                <span class="vs">vs</span>
                                <span class="team-name">${pred.away_team}</span>
                            </div>
                            <div class="history-date">${formattedDate}</div>
                        </div>
                        <div class="history-scores">
                            <div class="score-column">
                                <div class="score-label">Your Prediction</div>
                                <div class="score-value">${pred.predicted_home_score} - ${pred.predicted_away_score}</div>
                            </div>
                            <div class="score-column">
                                <div class="score-label">Actual Score</div>
                                <div class="score-value">${pred.home_score} - ${pred.away_score}</div>
                            </div>
                            <div class="score-column">
                                <div class="score-label">Points</div>
                                <div class="score-value ${pointsClass}">${pred.points_earned}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            historyHTML += '</div>';
        }
        
        historyHTML += '</div>';
        
        // Update modal content
        const modalContent = document.querySelector('#historyModal .modal-content');
        modalContent.innerHTML = historyHTML;
        
        // Add close button functionality
        document.querySelector('#historyModal .modal-close').onclick = closeHistory;
        
        // Close modal when clicking outside
        historyModal.onclick = function(event) {
            if (event.target === historyModal) {
                closeHistory();
            }
        };
        
    } catch (error) {
        console.error('[PREDICTIONS] Error opening history:', error);
        
        const historyModal = document.getElementById('historyModal');
        if (historyModal) {
            const modalContent = historyModal.querySelector('.modal-content');
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2><i class="fas fa-history"></i> My Prediction History</h2>
                    <button class="modal-close" onclick="closeHistory()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #EF4444; margin-bottom: 15px;"></i>
                        <p style="color: #EF4444;">Error loading history</p>
                        <p style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; margin-top: 10px;">${error.message}</p>
                        <button class="btn btn-primary" onclick="openHistory()" style="margin-top: 20px;">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Close prediction history modal
 */
function closeHistory() {
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.remove();
    }
}

/**
 * Auto-load matches when predictions page is shown
 */
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        const predictionsPage = document.getElementById('scoreGuesserPage');
        if (predictionsPage && predictionsPage.classList.contains('active')) {
            // Load matches after a short delay to ensure DOM is ready
            setTimeout(loadMatches, 100);
        }
    });
    
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
});
/**
 * Track selected penalty winner
 */
let penaltySelections = {};

/**
 * Select penalty winner
 */
function selectPenaltyWinner(matchId, winner) {
    event.preventDefault();
    
    // Store selection
    penaltySelections[matchId] = winner;
    
    // Update UI
    const homeBtn = document.getElementById(`penalty-${matchId}-home`);
    const awayBtn = document.getElementById(`penalty-${matchId}-away`);
    const submitBtn = document.getElementById(`penalty-submit-${matchId}`);
    
    // Remove selected class from both
    homeBtn.classList.remove('selected');
    awayBtn.classList.remove('selected');
    
    // Add selected class to clicked button
    if (winner === 'home') {
        homeBtn.classList.add('selected');
    } else {
        awayBtn.classList.add('selected');
    }
    
    // Enable submit button
    submitBtn.disabled = false;
    
    console.log(`[PENALTIES] Selected ${winner} for match ${matchId}`);
}

/**
 * Submit penalty prediction
 */
async function submitPenaltyPredictionClick(matchId) {
    const predictedWinner = penaltySelections[matchId];
    
    if (!predictedWinner) {
        alert('Please select a team first');
        return;
    }
    
    await handlePenaltyPredictionClick(matchId, predictedWinner);
}
/**
 * Submit penalty prediction
 */
async function handlePenaltyPredictionClick(matchId, predictedWinner) {
    try {
        const userId = parseInt(localStorage.getItem('userId'));
        if (!userId) {
            alert('User not authenticated');
            return;
        }

        const feedback = document.getElementById(`penalty-feedback-${matchId}`);
        const homeBtn = document.getElementById(`penalty-${matchId}-home`);
        const awayBtn = document.getElementById(`penalty-${matchId}-away`);

        // Show loading
        feedback.innerHTML = '<span style="color: #86BC25;">Submitting...</span>';
        homeBtn.disabled = true;
        awayBtn.disabled = true;

        // Submit via API
        const response = await window.submitPenaltyPrediction(userId, matchId, predictedWinner);

        if (response.status === 'success') {
            feedback.innerHTML = '<span style="color: #22C55E;"><i class="fas fa-check-circle"></i> Saved!</span>';
            homeBtn.disabled = true;
            awayBtn.disabled = true;
            setTimeout(() => { feedback.innerHTML = ''; }, 3000);
        } else {
            throw new Error(response.message || 'Failed to submit');
        }
    } catch (error) {
        console.error('Penalty prediction error:', error);
        const feedback = document.getElementById(`penalty-feedback-${matchId}`);
        feedback.innerHTML = `<span style="color: #EF4444;"><i class="fas fa-exclamation-circle"></i> ${error.message}</span>`;
        
        // Re-enable buttons
        const homeBtn = document.getElementById(`penalty-${matchId}-home`);
        const awayBtn = document.getElementById(`penalty-${matchId}-away`);
        if (homeBtn) homeBtn.disabled = false;
        if (awayBtn) awayBtn.disabled = false;
    }
}
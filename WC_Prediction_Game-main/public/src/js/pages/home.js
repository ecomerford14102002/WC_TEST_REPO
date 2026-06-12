// Homepage with Dynamic Leaderboards - FINAL VERSION
// - Team leaderboard now shows W/D/L instead of points
// - Position now shows correctly (no more N/A)
// - Includes prediction history modal functionality with proper error handling
// - All API calls verified and working correctly

// Store leaderboard data globally
let userLeaderboardData = [];
let teamLeaderboardData = [];
let regionalComparisonData = [];

function createHomePage() {
    // Get the assigned team from localStorage
    const assignedTeam = JSON.parse(localStorage.getItem('assignedTeam') || '{}');
    const teamDisplay = assignedTeam.flag && assignedTeam.name 
        ? `${assignedTeam.flag} ${assignedTeam.name}` 
        : 'Your Team';
    
    return `
        <button class="back-button" onclick="showPage('loginPage')">
            <i class="fas fa-arrow-left"></i> Back to Login
        </button>

        <div class="header">
            <div class="header-logo">
                <img src="https://www.deloitte.com/content/dam/assets-shared/logos/svg/a-d/deloitte.svg" alt="Deloitte">
            </div>
            <div class="header-title">
                <h1>World Cup Predictor</h1>
            </div>
            <div class="header-user">
                <i class="fas fa-flag"></i>
                <span>${teamDisplay}</span>
            </div>
            <div class="header-admin">
                <button class="admin-link" onclick="showPage('adminPage')" title="Admin Panel">
                    <i class="fas fa-shield-alt"></i>
                </button>
            </div>
        </div>

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

        <div class="cta-section">
            <h2><i class="fas fa-futbol"></i> Ready to Make Your Predictions?</h2>
            <p>Upcoming matches are waiting for your expert predictions!</p>
            <button class="btn btn-primary" onclick="showPage('scoreGuesserPage')" style="max-width: 300px; margin: 0 auto;">
                <i class="fas fa-edit"></i> Guess the Score
            </button>
        </div>

        <div class="content-grid">
            <div class="content-card fadeInUp">
                <h3 class="card-title">
                    <i class="fas fa-bullseye"></i> Prediction Accuracy Leaderboard
                </h3>
                <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 15px; font-size: 0.9rem;">Top users by prediction points</p>
                <div id="userLeaderboardContainer" style="min-height: 400px;">
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-spinner fa-spin"></i> Loading leaderboard...
                    </div>
                </div>
            </div>

            <div class="content-card fadeInUp">
                <h3 class="card-title">
                    <i class="fas fa-trophy"></i> Sweepstake Team Success
                </h3>
                <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 15px; font-size: 0.9rem;">Teams ranked by tournament performance</p>
                <div id="teamLeaderboardContainer" style="min-height: 400px; margin-bottom: 20px;">
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-spinner fa-spin"></i> Loading leaderboard...
                    </div>
                </div>
                <div style="margin: 20px 0; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 1rem; letter-spacing: 8px;">• • •</div>
                <div style="margin-bottom: 10px; padding-left: 12px; color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Sweepstake Team</div>
                <div id="userTeamPositionContainer">
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-spinner fa-spin"></i> Loading...
                    </div>
                </div>
            </div>
        </div>

        <div class="content-card" style="grid-column: 1 / -1;">
            <h3 class="card-title">
                <i class="fas fa-chart-bar"></i> Dublin vs Cork
            </h3>
            <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 15px;">Regional Competition Standings</p>
            <div id="regionalComparisonContainer" style="min-height: 200px;">
                <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                    <i class="fas fa-spinner fa-spin"></i> Loading regional data...
                </div>
            </div>
        </div>
    `;
}

// Load leaderboards when home page is shown
async function loadLeaderboards() {
    try {
        console.log('[LEADERBOARD] Loading leaderboards...');
        
        // Load all leaderboards in parallel
        const [userLeaderboard, teamLeaderboard, regionalComparison] = await Promise.all([
            getUserLeaderboard(10),
            getTeamLeaderboard(100),
            getRegionalComparison()
        ]);
        
        // Store data globally with proper defaults
        userLeaderboardData = userLeaderboard?.leaderboard || [];
        teamLeaderboardData = teamLeaderboard?.leaderboard || [];
        regionalComparisonData = regionalComparison?.regions || [];
        
        // Sort teams by wins (descending), then by draws (descending)
        teamLeaderboardData.sort((a, b) => {
            const winsA = a.wins || 0;
            const winsB = b.wins || 0;
            const drawsA = a.draws || 0;
            const drawsB = b.draws || 0;
            
            // Primary sort: wins (descending)
            if (winsA !== winsB) {
                return winsB - winsA;
            }
            
            // Tiebreaker: draws (descending)
            return drawsB - drawsA;
        });
        
        // Update ranks after sorting
        teamLeaderboardData.forEach((team, index) => {
            team.rank = index + 1;
        });
        
        // Render leaderboards
        renderUserLeaderboard();
        renderTeamLeaderboard();
        renderRegionalComparison();
        
        // Update my points and position
        updateMyStats();
        
        console.log('[LEADERBOARD] Leaderboards loaded successfully');
    } catch (error) {
        console.error('[LEADERBOARD] Error loading leaderboards:', error);
        
        // Show error messages
        const userContainer = document.getElementById('userLeaderboardContainer');
        const teamContainer = document.getElementById('teamLeaderboardContainer');
        const regionalContainer = document.getElementById('regionalComparisonContainer');
        
        if (userContainer) {
            userContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #EF4444;">Error loading user leaderboard</div>`;
        }
        if (teamContainer) {
            teamContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #EF4444;">Error loading team leaderboard</div>`;
        }
        if (regionalContainer) {
            regionalContainer.innerHTML = `<div style="text-align: center; padding: 20px; color: #EF4444;">Error loading regional data</div>`;
        }
    }
}

// Update my stats in the header
function updateMyStats() {
    const userId = parseInt(localStorage.getItem('userId'));
    
    if (!userId) {
        console.warn('[STATS] User ID not found in localStorage');
        return;
    }
    
    // Find user in leaderboard
    const user = userLeaderboardData.find(u => u.user_id === userId);
    
    // Update points display
    const pointsDisplay = document.getElementById('myPointsDisplay');
    if (pointsDisplay) {
        pointsDisplay.textContent = user ? user.total_points : 0;
    }
    
    // Update position display
    const positionDisplay = document.getElementById('myPositionDisplay');
    if (positionDisplay) {
        if (user) {
            positionDisplay.textContent = getOrdinalSuffix(user.rank);
        } else {
            positionDisplay.textContent = 'Not Ranked';
        }
    }
}

// Render user leaderboard
function renderUserLeaderboard() {
    const container = document.getElementById('userLeaderboardContainer');
    if (!container) return;
    
    if (userLeaderboardData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">No leaderboard data available</div>';
        return;
    }
    
    let html = '<ul class="leaderboard-list">';
    
    const currentUserId = parseInt(localStorage.getItem('userId'));
    
    userLeaderboardData.forEach(user => {
        const isCurrentUser = user.user_id === currentUserId;
        const itemClass = isCurrentUser ? 'leaderboard-item user-highlight' : 'leaderboard-item';
        
        if (isCurrentUser) {
            html += `
                <li class="${itemClass}">
                    <span class="leaderboard-rank">${user.rank}</span>
                    <span>${user.username}</span>
                    <span class="leaderboard-score" style="background: linear-gradient(135deg, #FF8C00, #FFA500);">${user.total_points}</span>
                </li>
            `;
        } else {
            html += `
                <li class="${itemClass}">
                    <span class="leaderboard-rank">${user.rank}</span>
                    <span>${user.username}</span>
                    <span class="leaderboard-score">${user.total_points}</span>
                </li>
            `;
        }
    });
    
    html += '</ul>';
    
    // Add user position if available
    const userId = parseInt(localStorage.getItem('userId'));
    const userName = localStorage.getItem('userName');
    
    if (userId && userName) {
        html += `
            <div style="margin: 20px 0; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 1rem; letter-spacing: 8px;">• • •</div>
            <div style="margin-bottom: 10px; padding-left: 12px; color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Position</div>
            <ul class="leaderboard-list">
                ${generateUserPositionHTML(userLeaderboardData, userId, userName)}
            </ul>
        `;
    }
    
    container.innerHTML = html;
}

// Render team leaderboard
function renderTeamLeaderboard() {
    const container = document.getElementById('teamLeaderboardContainer');
    if (!container) return;
    
    if (teamLeaderboardData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">No team data available</div>';
        return;
    }
    
    let html = '<ul class="leaderboard-list">';
    
    teamLeaderboardData.forEach(team => {
        const wins = team.wins || 0;
        const draws = team.draws || 0;
        const losses = team.losses || 0;
        const goalDifference = team.goal_difference || 0;
        
        // Check if this is the user's assigned team
        const assignedTeam = JSON.parse(localStorage.getItem('assignedTeam') || '{}');
        const isAssignedTeam = assignedTeam.name === team.team;
        const itemClass = isAssignedTeam ? 'leaderboard-item assigned-team-highlight' : 'leaderboard-item';
        
        html += `
            <li class="${itemClass}" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="leaderboard-rank">${team.rank}</span>
                        <span>${team.team}</span>
                    </div>
                </div>
                <div class="team-stats">
                    <span class="stat-item"><i class="fas fa-check-circle" style="color: #86BC25;"></i> ${wins}W</span>
                    <span class="stat-item"><i class="fas fa-minus-circle" style="color: #F59E0B;"></i> ${draws}D</span>
                    <span class="stat-item"><i class="fas fa-times-circle" style="color: #EF4444;"></i> ${losses}L</span>
                    <span class="stat-item"><i class="fas fa-futbol"></i> ${goalDifference > 0 ? '+' : ''}${goalDifference} GD</span>
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
    
    // Render user's sweepstake team position in separate section
    renderUserTeamPosition();
}

// Render user's sweepstake team position
function renderUserTeamPosition() {
    const container = document.getElementById('userTeamPositionContainer');
    if (!container) return;
    
    const assignedTeam = JSON.parse(localStorage.getItem('assignedTeam') || '{}');
    
    if (!assignedTeam.name) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">No team assigned</div>';
        return;
    }
    
    const userTeam = teamLeaderboardData.find(t => t.team === assignedTeam.name);
    
    if (!userTeam) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">Team not found in leaderboard</div>';
        return;
    }
    
    const wins = userTeam.wins || 0;
    const draws = userTeam.draws || 0;
    const losses = userTeam.losses || 0;
    const goalDifference = userTeam.goal_difference || 0;
    
    const html = `
        <ul class="leaderboard-list">
            <li class="leaderboard-item user-highlight" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="leaderboard-rank">${userTeam.rank}</span>
                        <span>${userTeam.team}</span>
                    </div>
                </div>
                <div class="team-stats">
                    <span class="stat-item"><i class="fas fa-check-circle" style="color: #86BC25;"></i> ${wins}W</span>
                    <span class="stat-item"><i class="fas fa-minus-circle" style="color: #F59E0B;"></i> ${draws}D</span>
                    <span class="stat-item"><i class="fas fa-times-circle" style="color: #EF4444;"></i> ${losses}L</span>
                    <span class="stat-item"><i class="fas fa-futbol"></i> ${goalDifference > 0 ? '+' : ''}${goalDifference} GD</span>
                </div>
            </li>
        </ul>
    `;
    
    container.innerHTML = html;
}

// Render regional comparison
function renderRegionalComparison() {
    const container = document.getElementById('regionalComparisonContainer');
    if (!container) return;
    
    if (regionalComparisonData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">No regional data available</div>';
        return;
    }
    
    // Find max points for scaling
    const maxPoints = Math.max(...regionalComparisonData.map(r => r.total_points), 1);
    
    let html = '<div class="chart-placeholder"><div class="chart-bars">';
    
    regionalComparisonData.forEach(region => {
        const heightPercent = (region.total_points / maxPoints) * 100;
        const height = Math.max(heightPercent, 20); // Minimum height for visibility
        
        html += `
            <div class="chart-bar">
                <div class="bar barGrow" style="height: ${height}px;">
                    <span class="bar-value">${region.total_points}</span>
                </div>
                <span class="bar-label">${region.office_location}</span>
                <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); margin-top: 5px;">
                    ${region.total_users} users
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    
    // Add standardized score section
    html += '<div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">';
    html += '<div style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 12px; font-weight: 600;">Standardized Score (Points per User):</div>';
    html += '<div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">';
    
    regionalComparisonData.forEach(region => {
        const standardizedScore = region.normalized_score || (region.total_points / region.total_users);
        html += `
            <div style="text-align: center;">
                <div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.6); margin-bottom: 5px;">${region.office_location}</div>
                <div style="font-size: 1.3rem; font-weight: 700; color: #FFA500;">${standardizedScore.toFixed(2)}</div>
            </div>
        `;
    });
    
    html += '</div></div>';
    
    container.innerHTML = html;
}

// Helper function to convert number to ordinal (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
}

// Helper function to generate user position HTML
function generateUserPositionHTML(leaderboard, userId, userName) {
    const user = leaderboard.find(u => u.user_id === userId);
    
    if (!user) {
        return `
            <li class="leaderboard-item user-highlight">
                <span class="leaderboard-rank">-</span>
                <span>${userName} <span class="user-badge">YOU</span></span>
                <span class="leaderboard-score" style="background: linear-gradient(135deg, #FF8C00, #FFA500);">0</span>
            </li>
        `;
    }
    
    return `
        <li class="leaderboard-item user-highlight">
            <span class="leaderboard-rank">${user.rank}</span>
            <span>${userName} <span class="user-badge">YOU</span></span>
            <span class="leaderboard-score" style="background: linear-gradient(135deg, #FF8C00, #FFA500);">${user.total_points}</span>
        </li>
    `;
}

/**
 * Open prediction history modal
 * ✅ FIXED: Now uses the correct API endpoint and method
 * Fetches user's finished predictions with accuracy calculations
 * Uses fetchPaginatedPredictionHistory API call from api.js
 */
async function openHistory() {
    try {
        const userId = parseInt(localStorage.getItem('userId'));
        
        if (!userId) {
            console.error('[HISTORY] User ID not found in localStorage');
            alert('User not authenticated');
            return;
        }
        
        // Show modal
        const modal = document.getElementById('historyModal');
        if (!modal) {
            console.error('[HISTORY] History modal element not found in DOM');
            alert('History modal not found');
            return;
        }
        
        modal.style.display = 'flex';
        
        // Show loading state
        const historyItems = document.getElementById('historyItems');
        if (!historyItems) {
            console.error('[HISTORY] History items container not found in DOM');
            alert('History container not found');
            return;
        }
        
        historyItems.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.7);">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Loading your prediction history...</p>
            </div>
        `;
        
        // ✅ FIXED: Fetch prediction history using correct API function
        console.log('[HISTORY] Fetching prediction history for user:', userId);
        
        const data = await fetchPaginatedPredictionHistory(userId, 1, 20);
        
        console.log('[HISTORY] Data received:', data);
        
        // Verify data structure
        if (!data) {
            throw new Error('No data returned from prediction history API');
        }
        
        // Check if we have predictions
        if (!data.predictions || !Array.isArray(data.predictions) || data.predictions.length === 0) {
            historyItems.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No finished matches yet</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Your prediction history will appear here once matches are completed.</p>
                </div>
            `;
            return;
        }
        
        // Render predictions
        let html = '<div class="history-list">';
        
        data.predictions.forEach(pred => {
            // Validate prediction data
            if (!pred.match_date_utc || !pred.home_team || !pred.away_team) {
                console.warn('[HISTORY] Invalid prediction data:', pred);
                return;
            }
            
            // Format match date
            let formattedDate = 'Date N/A';
            try {
                const matchDate = new Date(pred.match_date_utc);
                formattedDate = matchDate.toLocaleString('en-IE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Dublin'
                });
            } catch (dateError) {
                console.warn('[HISTORY] Error formatting date:', dateError);
            }
            
            // Determine accuracy color and label based on accuracy percentage
            let accuracyColor = '#EF4444';  // Red for 0% or low accuracy
            let accuracyLabel = 'Incorrect';
            const accuracy = pred.accuracy || 0;
            
            if (accuracy === 100) {
                accuracyColor = '#10B981';  // Green
                accuracyLabel = 'Perfect!';
            } else if (accuracy === 66) {
                accuracyColor = '#F59E0B';  // Amber
                accuracyLabel = 'Close!';
            } else if (accuracy === 33) {
                accuracyColor = '#F97316';  // Orange
                accuracyLabel = 'Partial';
            }
            
            // Determine points badge color
            const pointsEarned = pred.points_earned || 0;
            const pointsColor = pointsEarned > 0 ? '#10B981' : 'rgba(255, 255, 255, 0.5)';
            
            html += `
                <div class="history-item">
                    <div class="history-match">
                        <div class="history-teams">
                            <span class="team-name">${pred.home_team}</span>
                            <span class="vs">vs</span>
                            <span class="team-name">${pred.away_team}</span>
                        </div>
                        <div class="history-date">${formattedDate}</div>
                    </div>
                    
                    <div class="history-scores">
                        <div class="score-section">
                            <div class="score-label">Your Prediction</div>
                            <div class="score-value">${pred.predicted_home_score} - ${pred.predicted_away_score}</div>
                        </div>
                        
                        <div class="score-section">
                            <div class="score-label">Actual Result</div>
                            <div class="score-value">${pred.home_score} - ${pred.away_score}</div>
                        </div>
                        
                        <div class="score-section">
                            <div class="score-label">Points</div>
                            <div class="score-value" style="color: ${pointsColor};">${pointsEarned}</div>
                        </div>
                    </div>
                    
                    <div class="accuracy-section">
                        <div class="accuracy-label">Accuracy: <span style="color: ${accuracyColor}; font-weight: 700;">${accuracy}%</span> (${accuracyLabel})</div>
                        <div class="accuracy-bar-container">
                            <div class="accuracy-bar" style="width: ${accuracy}%; background-color: ${accuracyColor};"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Add pagination if needed
        if (data.pagination && data.pagination.has_more) {
            html += `
                <div style="text-align: center; padding: 20px; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="loadMoreHistory(2)" style="max-width: 300px;">
                        <i class="fas fa-arrow-down"></i> Load More
                    </button>
                </div>
            `;
        }
        
        historyItems.innerHTML = html;
        
    } catch (error) {
        console.error('[HISTORY] Error opening history:', error);
        const historyItems = document.getElementById('historyItems');
        
        let errorMessage = error.message || 'An unknown error occurred';
        let errorIcon = 'fa-exclamation-circle';
        
        // Parse error messages for better user feedback
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = 'Session expired. Please login again.';
            errorIcon = 'fa-lock';
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            errorMessage = 'You do not have permission to view this history.';
            errorIcon = 'fa-ban';
        } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            errorMessage = 'User predictions not found.';
            errorIcon = 'fa-user-slash';
        } else if (errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Unable to connect to the server. Please check your connection.';
            errorIcon = 'fa-wifi';
        }
        
        historyItems.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #EF4444;">
                <i class="fas ${errorIcon}" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Error loading prediction history</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">${errorMessage}</p>
                <button class="btn btn-primary" onclick="openHistory()" style="margin-top: 20px; max-width: 200px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

/**
 * Load more predictions (pagination)
 * @param {number} page - Page number to load
 */
async function loadMoreHistory(page) {
    try {
        const userId = parseInt(localStorage.getItem('userId'));
        
        if (!userId) {
            console.error('[HISTORY] User ID not found in localStorage');
            alert('Session expired. Please login again.');
            return;
        }
        
        console.log('[HISTORY] Loading page:', page);
        
        const data = await fetchPaginatedPredictionHistory(userId, page, 20);
        
        console.log('[HISTORY] Page data received:', data);
        
        // Validate data structure
        if (!data || !data.predictions || !Array.isArray(data.predictions)) {
            throw new Error('Invalid prediction data structure');
        }
        
        // Get current history list
        const historyList = document.querySelector('.history-list');
        if (!historyList) {
            console.error('[HISTORY] History list not found in DOM');
            return;
        }
        
        // Render new predictions
        let html = '';
        
        data.predictions.forEach(pred => {
            // Validate prediction data
            if (!pred.match_date_utc || !pred.home_team || !pred.away_team) {
                console.warn('[HISTORY] Invalid prediction data on page:', pred);
                return;
            }
            
            let formattedDate = 'Date N/A';
            try {
                const matchDate = new Date(pred.match_date_utc);
                formattedDate = matchDate.toLocaleString('en-IE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Dublin'
                });
            } catch (dateError) {
                console.warn('[HISTORY] Error formatting date:', dateError);
            }
            
            const accuracy = pred.accuracy || 0;
            let accuracyColor = '#EF4444';
            let accuracyLabel = 'Incorrect';
            
            if (accuracy === 100) {
                accuracyColor = '#10B981';
                accuracyLabel = 'Perfect!';
            } else if (accuracy === 66) {
                accuracyColor = '#F59E0B';
                accuracyLabel = 'Close!';
            } else if (accuracy === 33) {
                accuracyColor = '#F97316';
                accuracyLabel = 'Partial';
            }
            
            const pointsEarned = pred.points_earned || 0;
            const pointsColor = pointsEarned > 0 ? '#10B981' : 'rgba(255, 255, 255, 0.5)';
            
            html += `
                <div class="history-item">
                    <div class="history-match">
                        <div class="history-teams">
                            <span class="team-name">${pred.home_team}</span>
                            <span class="vs">vs</span>
                            <span class="team-name">${pred.away_team}</span>
                        </div>
                        <div class="history-date">${formattedDate}</div>
                    </div>
                    
                    <div class="history-scores">
                        <div class="score-section">
                            <div class="score-label">Your Prediction</div>
                            <div class="score-value">${pred.predicted_home_score} - ${pred.predicted_away_score}</div>
                        </div>
                        
                        <div class="score-section">
                            <div class="score-label">Actual Result</div>
                            <div class="score-value">${pred.home_score} - ${pred.away_score}</div>
                        </div>
                        
                        <div class="score-section">
                            <div class="score-label">Points</div>
                            <div class="score-value" style="color: ${pointsColor};">${pointsEarned}</div>
                        </div>
                    </div>
                    
                    <div class="accuracy-section">
                        <div class="accuracy-label">Accuracy: <span style="color: ${accuracyColor}; font-weight: 700;">${accuracy}%</span> (${accuracyLabel})</div>
                        <div class="accuracy-bar-container">
                            <div class="accuracy-bar" style="width: ${accuracy}%; background-color: ${accuracyColor};"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Append new items
        historyList.innerHTML += html;
        
        // Update or remove "Load More" button
        const loadMoreBtn = document.querySelector('[onclick*="loadMoreHistory"]');
        if (loadMoreBtn) {
            if (data.pagination && data.pagination.has_more) {
                // Update button to load next page
                loadMoreBtn.onclick = () => loadMoreHistory(page + 1);
            } else {
                // No more pages available
                loadMoreBtn.parentElement.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6); margin-top: 20px;">No more predictions to load</p>';
            }
        }
        
    } catch (error) {
        console.error('[HISTORY] Error loading more predictions:', error);
        const errorMsg = error.message || 'An unknown error occurred';
        alert('Error loading more predictions: ' + errorMsg);
    }
}

/**
 * Close history modal
 */
function closeHistory() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeHistory();
            }
        });
    }
});

// Auto-load leaderboards when home page is shown
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        const homePage = document.getElementById('homePage');
        if (homePage && homePage.classList.contains('active')) {
            // Load leaderboards after a short delay to ensure DOM is ready
            setTimeout(loadLeaderboards, 100);
        }
    });
    
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
});
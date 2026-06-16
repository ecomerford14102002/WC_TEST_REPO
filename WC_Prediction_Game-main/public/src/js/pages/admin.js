// Admin Dashboard - UPDATED WITH POST REQUESTS
// Uses proper click handlers instead of onchange

// Check if user is admin
function isUserAdmin() {
    const isAdmin = localStorage.getItem('isAdmin');
    console.log('[ADMIN] isAdmin flag:', isAdmin);
    return isAdmin === 'true';
}

// Create Admin Page
function createAdminPage() {
    // Check if user is admin
    if (!isUserAdmin()) {
        return `
            <div class="admin-access-denied fadeInUp">
                <div class="access-denied-content">
                    <i class="fas fa-lock" style="font-size: 4rem; color: #EF4444; margin-bottom: 20px;"></i>
                    <h2>Access Denied</h2>
                    <p>You do not have permission to access the admin section.</p>
                    <p style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); margin-top: 10px;">
                        Contact your administrator if you believe this is an error.
                    </p>
                    <button class="btn btn-primary" onclick="showPage('homePage')" style="margin-top: 20px;">
                        <i class="fas fa-arrow-left"></i> Back to Home
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <button class="back-button" onclick="showPage('homePage')">
            <i class="fas fa-arrow-left"></i> Back to Home
        </button>

        <div class="admin-header">
            <div class="admin-title">
                <i class="fas fa-shield-alt"></i>
                <h1>Admin Dashboard</h1>
            </div>
            <div class="admin-user-info">
                <span>${localStorage.getItem('userEmail')}</span>
                <span class="admin-badge">ADMIN</span>
            </div>
        </div>

        <!-- Admin Tabs -->
        <div class="admin-tabs">
            <button class="admin-tab-btn active" onclick="switchAdminTab(event, 'match-scores')">
                <i class="fas fa-futbol"></i> Match Scores
            </button>
            <button class="admin-tab-btn" onclick="switchAdminTab(event, 'users')">
                <i class="fas fa-users"></i> Users
            </button>
            <button class="admin-tab-btn" onclick="switchAdminTab(event, 'predictions')">
                <i class="fas fa-chart-bar"></i> Predictions
            </button>
            <button class="admin-tab-btn" onclick="switchAdminTab(event, 'leaderboard')">
                <i class="fas fa-trophy"></i> Leaderboard
            </button>
        </div>

        <!-- Match Scores Tab -->
        <div id="match-scores" class="admin-tab-content active">
            <div class="admin-card">
                <h2><i class="fas fa-futbol"></i> Match Score Entry</h2>
                <p class="admin-subtitle">Enter actual match scores to update leaderboards</p>
                
                <div class="match-entry-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="match-select">Select Match</label>
                            <select id="match-select" class="form-input">
                                <option value="">-- Click to load matches --</option>
                            </select>
                            <button class="admin-button" onclick="loadAdminMatches()" style="margin-top: 10px; width: 100%;">
                                <i class="fas fa-download"></i> Load Matches
                            </button>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="team1-score">Home Team Score</label>
                            <input type="number" id="team1-score" class="form-input" placeholder="0" min="0" max="20">
                        </div>
                        <div class="form-group">
                            <label for="team2-score">Away Team Score</label>
                            <input type="number" id="team2-score" class="form-input" placeholder="0" min="0" max="20">
                        </div>
                    </div>

                    <button class="admin-button" onclick="submitMatchScore()">
                        <i class="fas fa-check"></i> Submit Score
                    </button>
                </div>

                <h3>Match Results</h3>
                <div id="match-results-container" style="min-height: 300px;">
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                        <p>Click "Load Matches" button above to load matches</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Users Tab -->
        <div id="users" class="admin-tab-content">
            <div class="admin-card">
                <h2><i class="fas fa-users"></i> User Management</h2>
                <p class="admin-subtitle">View and manage registered users</p>
                
                <div class="search-box">
                    <input type="text" class="form-input" id="user-search" placeholder="Search users by name or email..." onkeyup="filterUsers()">
                </div>

                <div id="users-container" style="min-height: 400px;">
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                        <p>Users will load when you click this tab</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Predictions Tab -->
        <div id="predictions" class="admin-tab-content">
            <div class="admin-card">
                <h2><i class="fas fa-chart-bar"></i> User Predictions</h2>
                <p class="admin-subtitle">View all user predictions and accuracy</p>
                
                <div class="filter-box">
                    <select class="form-input" id="prediction-filter" onchange="filterPredictions()" style="width: 100%; max-width: 300px;">
                        <option value="">-- All Predictions --</option>
                        <option value="match">Match Scores</option>
                        <option value="tournament">Tournament Winner</option>
                        <option value="boot">Golden Boot</option>
                        <option value="glove">Golden Glove</option>
                    </select>
                </div>

                <div id="predictions-container" style="min-height: 400px;">
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                        <p>Predictions will load when you click this tab</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Leaderboard Tab -->
        <div id="leaderboard" class="admin-tab-content">
            <div class="admin-card">
                <h2><i class="fas fa-trophy"></i> Leaderboard Management</h2>
                <p class="admin-subtitle">View leaderboard and statistics</p>
                
                <div id="leaderboard-stats" class="leaderboard-info">
                    <div class="info-card">
                        <h4>Total Users</h4>
                        <p id="stat-total-users">-</p>
                    </div>
                    <div class="info-card">
                        <h4>Total Predictions</h4>
                        <p id="stat-total-predictions">-</p>
                    </div>
                    <div class="info-card">
                        <h4>Completed Matches</h4>
                        <p id="stat-completed-matches">-</p>
                    </div>
                </div>

                <h3>Top 10 Users</h3>
                <div id="leaderboard-container" style="min-height: 400px;">
                    <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.6);">
                        <p>Leaderboard will load when you click this tab</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Switch between admin tabs
function switchAdminTab(event, tabName) {
    console.log('[ADMIN] Switching to tab:', tabName);
    
    // Prevent default
    if (event) {
        event.preventDefault();
    }
    
    // Hide all tabs
    const tabs = document.querySelectorAll('.admin-tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.admin-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.closest('.admin-tab-btn').classList.add('active');
    }
    
    // Load data for the tab ONLY when clicked
    console.log('[ADMIN] Loading data for tab:', tabName);
    if (tabName === 'match-scores') {
        console.log('[ADMIN] Match Scores tab activated - waiting for user to click Load button');
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'predictions') {
        loadPredictions();
    } else if (tabName === 'leaderboard') {
        loadLeaderboard();
    }
}

// ============================================================================
// MATCH SCORES TAB - WORKING VERSION
// ============================================================================

// Load matches - CALLED BY BUTTON CLICK
async function loadAdminMatches() {
    try {
        console.log('[ADMIN] ===== LOADING MATCHES =====');
        
        // Show loading state
        const container = document.getElementById('match-results-container');
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading matches...</div>';
        
        // Use the existing fetchMatches from api.js
        const response = await fetchMatches();
        
        console.log('[ADMIN] Matches response:', response);
        
        if (!response.matches || response.matches.length === 0) {
            console.log('[ADMIN] No matches found');
            document.getElementById('match-select').innerHTML = '<option value="">No matches found</option>';
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #EF4444;">No matches found in database</div>';
            return;
        }
        
        console.log('[ADMIN] Found', response.matches.length, 'matches');
        
        // Populate dropdown
        let html = '<option value="">-- Select a match --</option>';
        response.matches.forEach(match => {
            const matchDate = new Date(match.match_date_utc).toLocaleString('en-IE', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            html += `<option value="${match.match_id}" data-home="${match.home_team}" data-away="${match.away_team}">${match.home_team} vs ${match.away_team} - ${matchDate}</option>`;
        });
        document.getElementById('match-select').innerHTML = html;
        console.log('[ADMIN] Dropdown populated with', response.matches.length, 'matches');
        
        // Load match results table
        renderMatchResults(response.matches);
        
        console.log('[ADMIN] ===== MATCHES LOADED SUCCESSFULLY =====');
        
    } catch (error) {
        console.error('[ADMIN] ERROR LOADING MATCHES:', error);
        document.getElementById('match-select').innerHTML = '<option value="">Error loading matches</option>';
        document.getElementById('match-results-container').innerHTML = `<p style="color: #EF4444; text-align: center;">Error: ${error.message}</p>`;
    }
}

// Load match details when selected
function loadMatchDetails() {
    const select = document.getElementById('match-select');
    const matchId = select.value;
    
    if (!matchId) {
        document.getElementById('team1-score').value = '';
        document.getElementById('team2-score').value = '';
        return;
    }
    
    // Clear scores
    document.getElementById('team1-score').value = '';
    document.getElementById('team2-score').value = '';
}

// Render match results table
function renderMatchResults(matches) {
    const container = document.getElementById('match-results-container');
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Match</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    matches.forEach(match => {
        const matchDate = new Date(match.match_date_utc).toLocaleString('en-IE', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const scoreDisplay = match.home_score !== null && match.away_score !== null 
            ? `<span class="score-badge">${match.home_score} - ${match.away_score}</span>`
            : '-';
        
        const statusBadge = match.status === 'finished' 
            ? '<span class="status-badge completed">Completed</span>'
            : '<span class="status-badge pending">Pending</span>';
        
        html += `
            <tr>
                <td>${match.home_team} vs ${match.away_team}</td>
                <td>${matchDate}</td>
                <td>${scoreDisplay}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Submit match score
async function submitMatchScore() {
    const matchSelect = document.getElementById('match-select');
    const matchId = matchSelect.value;
    const homeScore = document.getElementById('team1-score').value;
    const awayScore = document.getElementById('team2-score').value;
    
    if (!matchId) {
        alert('Please select a match');
        return;
    }
    
    if (homeScore === '' || awayScore === '') {
        alert('Please enter both scores');
        return;
    }
    
    try {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        button.disabled = true;
        
        const userId = parseInt(localStorage.getItem('userId'));
        const jwtToken = localStorage.getItem('jwt_token');
        
        const response = await submitAdminScore({
            action: 'enter_score',
            admin_user_id: userId,
            jwt_token: jwtToken,
            match_id: matchId,
            home_score: parseInt(homeScore),
            away_score: parseInt(awayScore)
        });
        
        console.log('[ADMIN] Score submission response:', response);
        
        if (response.status === 'success') {
            alert(`✅ Score submitted!
${response.home_team} ${response.home_score} - ${response.away_score} ${response.away_team}
${response.predictions_updated} predictions updated`);
            
            // Reload matches
            loadAdminMatches();
            
            // Clear form
            document.getElementById('team1-score').value = '';
            document.getElementById('team2-score').value = '';
            document.getElementById('match-select').value = '';
        } else {
            alert(`❌ Error: ${response.message}`);
        }
        
        button.innerHTML = originalText;
        button.disabled = false;
    } catch (error) {
        console.error('[ADMIN] Error submitting score:', error);
        alert(`Error: ${error.message}`);
        event.target.innerHTML = '<i class="fas fa-check"></i> Submit Score';
        event.target.disabled = false;
    }
}

// ============================================================================
// USERS TAB
// ============================================================================

let allUsers = [];

async function loadUsers() {
    try {
        console.log('[ADMIN] Loading users...');
        
        const response = await fetchAllUsers();
        
        if (!response.users || response.users.length === 0) {
            document.getElementById('users-container').innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6);">No users found</p>';
            return;
        }
        
        allUsers = response.users;
        renderUsers(allUsers);
        
        console.log('[ADMIN] Users loaded:', response.users.length);
    } catch (error) {
        console.error('[ADMIN] Error loading users:', error);
        document.getElementById('users-container').innerHTML = `<p style="text-align: center; color: #EF4444;">Error loading users: ${error.message}</p>`;
    }
}

function renderUsers(users) {
    const container = document.getElementById('users-container');
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Assigned Team</th>
                    <th>Registration Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const regDate = new Date(user.created_at).toLocaleString('en-IE', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const adminBadge = user.is_admin ? ' <span class="admin-badge">ADMIN</span>' : '';
        
        html += `
            <tr>
                <td>${user.username}${adminBadge}</td>
                <td>${user.email}</td>
                <td>${user.sweepstake_country || '-'}</td>
                <td>${regDate}</td>
                <td><span class="status-badge active">Active</span></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function filterUsers() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    
    const filtered = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
    );
    
    renderUsers(filtered);
}

// ============================================================================
// PREDICTIONS TAB
// ============================================================================

let allPredictions = [];

async function loadPredictions() {
    try {
        console.log('[ADMIN] Loading predictions...');
        
        // ✅ FIXED: Use POST instead of GET
        const response = await fetch(`${API_BASE_URL}/admin_predictions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_all_predictions' })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch predictions');
        }
        
        // Handle both direct response and wrapped response
        const predictions = data.data?.predictions || data.predictions || [];
        
        if (!predictions || predictions.length === 0) {
            document.getElementById('predictions-container').innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6);">No predictions found</p>';
            return;
        }
        
        allPredictions = predictions;
        renderPredictions(allPredictions);
        
        console.log('[ADMIN] Predictions loaded:', predictions.length);
    } catch (error) {
        console.error('[ADMIN] Error loading predictions:', error);
        document.getElementById('predictions-container').innerHTML = `<p style="text-align: center; color: #EF4444;">Error loading predictions: ${error.message}</p>`;
    }
}

function renderPredictions(predictions) {
    const container = document.getElementById('predictions-container');
    
    if (predictions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: rgba(255, 255, 255, 0.6);">No predictions found</p>';
        return;
    }
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Prediction</th>
                    <th>Result</th>
                    <th>Accuracy</th>
                    <th>Points</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    predictions.forEach(pred => {
        const predDate = new Date(pred.created_at).toLocaleString('en-IE', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let typeDisplay = '';
        let predictionDisplay = '';
        let resultDisplay = '';
        let accuracyDisplay = '-';
        let pointsDisplay = pred.points_earned || '0';
        
        if (pred.prediction_type === 'match') {
            typeDisplay = '<span class="badge-type match">Match Score</span>';
            predictionDisplay = `${pred.predicted_home_score}-${pred.predicted_away_score}`;
            resultDisplay = pred.home_score !== null ? `${pred.home_score}-${pred.away_score}` : '-';
            
            // Calculate accuracy
            if (pred.accuracy !== undefined) {
                accuracyDisplay = `<span style="color: ${pred.accuracy === 100 ? '#10B981' : pred.accuracy === 66 ? '#F59E0B' : pred.accuracy === 33 ? '#F97316' : '#EF4444'};">${pred.accuracy}%</span>`;
            }
        } else if (pred.prediction_type === 'tournament') {
            typeDisplay = '<span class="badge-type tournament">Tournament</span>';
            predictionDisplay = pred.country_guess || '-';
            resultDisplay = '-';
        } else if (pred.prediction_type === 'boot') {
            typeDisplay = '<span class="badge-type boot">Golden Boot</span>';
            predictionDisplay = pred.golden_boot_guess || '-';
            resultDisplay = '-';
        } else if (pred.prediction_type === 'glove') {
            typeDisplay = '<span class="badge-type glove">Golden Glove</span>';
            predictionDisplay = pred.golden_glove_guess || '-';
            resultDisplay = '-';
        }
        
        const pointsClass = pointsDisplay > 0 ? 'points-badge correct' : 'points-badge';
        
        html += `
            <tr>
                <td>${pred.username}</td>
                <td>${typeDisplay}</td>
                <td>${predictionDisplay}</td>
                <td>${resultDisplay}</td>
                <td>${accuracyDisplay}</td>
                <td><span class="${pointsClass}">+${pointsDisplay}</span></td>
                <td>${predDate}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

function filterPredictions() {
    const filterType = document.getElementById('prediction-filter').value;
    
    if (!filterType) {
        renderPredictions(allPredictions);
    } else {
        const filtered = allPredictions.filter(pred => pred.prediction_type === filterType);
        renderPredictions(filtered);
    }
}

// ============================================================================
// LEADERBOARD TAB
// ============================================================================

async function loadLeaderboard() {
    try {
        console.log('[ADMIN] Loading leaderboard...');
        
        // ✅ FIXED: Use POST instead of GET
        const response = await fetch(`${API_BASE_URL}/admin_leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_admin_leaderboard' })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch leaderboard');
        }
        
        // Handle both direct response and wrapped response
        const responseData = data.data || data;
        
        document.getElementById('stat-total-users').textContent = responseData.stats?.total_users || 0;
        document.getElementById('stat-total-predictions').textContent = responseData.stats?.total_predictions || 0;
        document.getElementById('stat-completed-matches').textContent = responseData.stats?.completed_matches || 0;
        
        renderLeaderboard(responseData.leaderboard || []);
        
        console.log('[ADMIN] Leaderboard loaded');
    } catch (error) {
        console.error('[ADMIN] Error loading leaderboard:', error);
        document.getElementById('leaderboard-container').innerHTML = `<p style="text-align: center; color: #EF4444;">Error loading leaderboard: ${error.message}</p>`;
    }
}

function renderLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard-container');
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Team</th>
                    <th>Points</th>
                    <th>Accuracy</th>
                    <th>Predictions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    leaderboard.forEach(user => {
        const accuracy = user.accuracy_percentage ? `${user.accuracy_percentage.toFixed(1)}%` : '-';
        
        html += `
            <tr>
                <td>${user.rank}</td>
                <td>${user.username}</td>
                <td>${user.sweepstake_country || '-'}</td>
                <td><span class="score-badge">${user.total_points}</span></td>
                <td>${accuracy}</td>
                <td>${user.prediction_count}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}
// api.js - UPDATED FOR AWS API GATEWAY
// API Service for communicating with AWS Lambda backend via API Gateway
// Includes functions for match fetching, prediction submission, user prediction retrieval, and prediction history

const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    } else {
        // Use your API Gateway URL for production
        return 'https://fvw5hp0zo5.execute-api.eu-west-1.amazonaws.com/prod';
    }
})();

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise} Response from server
 */
async function registerUser(userData) {
    try {
        console.log('Calling registerUser with:', userData);
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userData.email,
                username: userData.username,
                password: userData.password,
                office_location: userData.office_location
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Response with JWT token
 */
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Store JWT token in localStorage
 * @param {string} token - JWT token
 */
function storeJWTToken(token) {
    localStorage.setItem('jwt_token', token);
}

/**
 * Get JWT token from localStorage
 * @returns {string} JWT token or null
 */
function getJWTToken() {
    return localStorage.getItem('jwt_token');
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid token
 */
function isAuthenticated() {
    return !!getJWTToken();
}

/**
 * Logout user
 */
function logoutUser() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userOfficeLocation');
    localStorage.removeItem('assignedTeam');
    localStorage.removeItem('predictions');
    localStorage.removeItem('predictionState');
    localStorage.removeItem('isAdmin');
}

/**
 * Get authorization headers with JWT token
 * @returns {Object} Headers object with Authorization
 */
function getAuthHeaders() {
    const token = getJWTToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Fetch all matches from the database
 * @param {string} status - Optional filter by status (scheduled, in_progress, finished)
 * @returns {Promise} Matches data
 */
async function fetchMatches(status = null) {
    try {
        console.log('Fetching matches from database...');
        
        let url = `${API_BASE_URL}/matches`;
        if (status) {
            url += `?status=${encodeURIComponent(status)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch matches');
        }

        console.log('Matches fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('Fetch matches error:', error);
        throw error;
    }
}

/**
 * Fetch user's existing predictions for all matches
 * @param {number} userId - User ID
 * @returns {Promise} User predictions data
 */
async function fetchUserPredictions(userId) {
    try {
        console.log('[API] Fetching predictions for user:', userId);
        
        const response = await fetch(`${API_BASE_URL}/user_predictions?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch user predictions');
        }

        console.log('[API] User predictions fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('[API] Fetch user predictions error:', error);
        throw error;
    }
}

/**
 * Fetch user's finished predictions (prediction history)
 * @param {number} userId - User ID
 * @returns {Promise} User finished predictions data
 */
async function fetchPredictionHistory(userId) {
    try {
        console.log('[API] Fetching prediction history for user:', userId);
        
        const response = await fetch(`${API_BASE_URL}/prediction_history?user_id=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch prediction history');
        }

        console.log('[API] Prediction history fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('[API] Fetch prediction history error:', error);
        throw error;
    }
}

/**
 * Submit a score prediction for a match
 * @param {number} userId - User ID
 * @param {string} matchId - Match ID
 * @param {number} predictedHomeScore - Predicted home team score
 * @param {number} predictedAwayScore - Predicted away team score
 * @returns {Promise} Response from server
 */
async function submitPrediction(userId, matchId, predictedHomeScore, predictedAwayScore) {
    try {
        console.log('Submitting prediction:', {
            userId,
            matchId,
            predictedHomeScore,
            predictedAwayScore
        });

        const jwtToken = getJWTToken();
        
        if (!jwtToken) {
            throw new Error('User not authenticated');
        }

        const response = await fetch(`${API_BASE_URL}/score_prediction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                jwt_token: jwtToken,
                match_id: matchId,
                predicted_home_score: parseInt(predictedHomeScore),
                predicted_away_score: parseInt(predictedAwayScore)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit prediction');
        }

        console.log('Prediction submitted successfully:', data);
        return data;
    } catch (error) {
        console.error('Submit prediction error:', error);
        throw error;
    }
}

/**
 * Get user leaderboard
 * @param {number} limit - Number of users to return (default 10, max 100)
 * @returns {Promise} Leaderboard data
 */
async function getUserLeaderboard(limit = 10) {
    try {
        console.log('Fetching user leaderboard with limit:', limit);
        
        const response = await fetch(`${API_BASE_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_user_leaderboard',
                limit: limit
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch user leaderboard');
        }

        console.log('User leaderboard response:', data);
        return data;
    } catch (error) {
        console.error('User leaderboard error:', error);
        throw error;
    }
}

/**
 * Get team leaderboard
 * @returns {Promise} Team leaderboard data
 */
async function getTeamLeaderboard() {
    try {
        console.log('Fetching team leaderboard');
        
        const response = await fetch(`${API_BASE_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_team_leaderboard'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch team leaderboard');
        }

        console.log('Team leaderboard response:', data);
        return data;
    } catch (error) {
        console.error('Team leaderboard error:', error);
        throw error;
    }
}

/**
 * Get regional comparison (Dublin vs Cork)
 * @returns {Promise} Regional comparison data
 */
async function getRegionalComparison() {
    try {
        console.log('Fetching regional comparison');
        
        const response = await fetch(`${API_BASE_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_regional_comparison'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch regional comparison');
        }

        console.log('Regional comparison response:', data);
        return data;
    } catch (error) {
        console.error('Regional comparison error:', error);
        throw error;
    }
}

/**
 * Get user statistics
 * @param {number} userId - User ID
 * @param {string} jwtToken - JWT token
 * @returns {Promise} User statistics
 */
async function getUserStats(userId, jwtToken) {
    try {
        console.log('Fetching user stats for user:', userId);
        
        const response = await fetch(`${API_BASE_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_user_stats',
                user_id: userId,
                jwt_token: jwtToken
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch user stats');
        }

        console.log('User stats response:', data);
        return data;
    } catch (error) {
        console.error('User stats error:', error);
        throw error;
    }
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Submit admin score entry
 * @param {Object} scoreData - Score entry data
 * @returns {Promise} Response from server
 */
async function submitAdminScore(scoreData) {
    try {
        console.log('[API] Submitting admin score:', scoreData);
        
        const response = await fetch(`${API_BASE_URL}/admin_score_entry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scoreData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit score');
        }

        console.log('[API] Score submitted successfully:', data);
        return data;
    } catch (error) {
        console.error('[API] Submit score error:', error);
        throw error;
    }
}

/**
 * Fetch all users for admin
 * @returns {Promise} All users data
 */
async function fetchAllUsers() {
    try {
        console.log('[API] Fetching all users');
        
        const response = await fetch(`${API_BASE_URL}/admin_users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch users');
        }

        console.log('[API] Users fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('[API] Fetch users error:', error);
        throw error;
    }
}

/**
 * Fetch all predictions for admin
 * @returns {Promise} All predictions data
 */
async function fetchAllPredictions() {
    try {
        console.log('[API] Fetching all predictions');
        
        const response = await fetch(`${API_BASE_URL}/admin_predictions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch predictions');
        }

        console.log('[API] Predictions fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('[API] Fetch predictions error:', error);
        throw error;
    }
}

/**
 * Fetch admin leaderboard
 * @returns {Promise} Leaderboard data
 */
async function fetchAdminLeaderboard() {
    try {
        console.log('[API] Fetching admin leaderboard');
        
        const response = await fetch(`${API_BASE_URL}/admin_leaderboard`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch leaderboard');
        }

        console.log('[API] Leaderboard fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('[API] Fetch leaderboard error:', error);
        throw error;
    }
}

/**
 * Assign team to user
 * @param {number} userId - User ID
 * @param {string} jwtToken - JWT token
 * @returns {Promise} Team assignment response
 */
async function assignTeamToUser(userId, jwtToken) {
    try {
        console.log('[API] Assigning team for user:', userId);
        
        const response = await fetch(`${API_BASE_URL}/team_assignment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'assign_team',
                user_id: userId,
                jwt_token: jwtToken
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to assign team');
        }

        console.log('[API] Team assignment response:', data);
        return data;
    } catch (error) {
        console.error('[API] Team assignment error:', error);
        throw error;
    }
}

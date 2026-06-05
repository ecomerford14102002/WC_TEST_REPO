// Helper Functions

// Go back to previous page in prediction flow
function goBackToPreviousPage() {
    const predictionState = JSON.parse(localStorage.getItem('predictionState') || '{}');
    
    if (!predictionState.predictions?.tournamentWinner) {
        showPage('allocationPage');
    } else if (!predictionState.predictions?.goldenBoot) {
        showPage('tournamentWinnerPage');
    } else if (!predictionState.predictions?.goldenGlove) {
        showPage('goldenBootPage');
    } else {
        showPage('homePage');
    }
}

// Increment score
function incrementScore(inputId) {
    const input = document.getElementById(inputId);
    const currentValue = parseInt(input.value) || 0;
    if (currentValue < 20) {
        input.value = currentValue + 1;
        animateScoreChange(input);
    }
}

// Decrement score
function decrementScore(inputId) {
    const input = document.getElementById(inputId);
    const currentValue = parseInt(input.value) || 0;
    if (currentValue > 0) {
        input.value = currentValue - 1;
        animateScoreChange(input);
    }
}

// Animate score change
function animateScoreChange(input) {
    input.style.transform = 'scale(1.2)';
    input.style.borderColor = '#86BC25';
    setTimeout(() => {
        input.style.transform = 'scale(1)';
        input.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    }, 200);
}

// Create confetti
function createConfetti() {
    const popup = document.querySelector('.allocation-popup');
    const colors = ['#86BC25', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            popup.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }, i * 50);
    }
}

// Open history modal
function openHistory() {
    document.getElementById('historyModal').classList.add('active');
}

// Close history modal
function closeHistory() {
    document.getElementById('historyModal').classList.remove('active');
}

// Get user points
function getUserPoints() {
    const userId = localStorage.getItem('userId');
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const user = allUsers.find(u => u.id === userId);
    return user ? user.points : 0;
}

// Get user position
function getUserPosition() {
    const userId = localStorage.getItem('userId');
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const sortedUsers = allUsers.sort((a, b) => b.points - a.points);
    const position = sortedUsers.findIndex(u => u.id === userId) + 1;
    return getOrdinalSuffix(position);
}

// Convert number to ordinal (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
}

// Generate leaderboard HTML
function generateLeaderboardHTML() {
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const sortedUsers = allUsers.sort((a, b) => b.points - a.points).slice(0, 10);
    
    return sortedUsers.map((user, index) => `
        <li class="leaderboard-item">
            <span class="leaderboard-rank">${index + 1}</span>
            <span>${user.name}</span>
            <span class="leaderboard-score">${user.points}</span>
        </li>
    `).join('');
}

// Generate user position HTML
function generateUserPositionHTML() {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const sortedUsers = allUsers.sort((a, b) => b.points - a.points);
    const position = sortedUsers.findIndex(u => u.id === userId) + 1;
    const userPoints = getUserPoints();
    
    return `
        <li class="leaderboard-item user-highlight">
            <span class="leaderboard-rank">${position}</span>
            <span>${userName} <span class="user-badge">YOU</span></span>
            <span class="leaderboard-score" style="background: linear-gradient(135deg, #FF8C00, #FFA500);">${userPoints}</span>
        </li>
    `;
}
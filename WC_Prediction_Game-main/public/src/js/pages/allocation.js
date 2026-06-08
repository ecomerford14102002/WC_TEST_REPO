// Country Allocation Page - FIXED to use actual Lambda response

function createAllocationPage() {
    return `
        <div class="allocation-overlay">
            <div class="allocation-popup popupAppear">
                <h2>🎉 Assigning Your Team... 🎉</h2>
                <div class="country-name countryReveal" id="teamDisplay">Loading...</div>
                <p class="allocation-message" id="allocationMessage">Getting your sweepstake team...</p>
                <button class="btn btn-primary" id="continueBtn" onclick="initPredictionFlow()" style="display: none;">
                    Continue to App <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;
}

// Call team assignment Lambda when page loads
async function assignTeamOnLoad() {
    try {
        const userId = localStorage.getItem('userId');
        const jwtToken = localStorage.getItem('jwt_token');
        
        if (!userId || !jwtToken) {
            alert('Error: User not authenticated');
            showPage('loginPage');
            return;
        }
        
        console.log('Assigning team for user:', userId);
        
        console.log('Assigning team for user:', userId);
        
        // Call API function to assign team
        const data = await assignTeamToUser(parseInt(userId), jwtToken);
        console.log('Team assignment response:', data);
        
        if (data.status === 'success') {
            // Get the assigned team name from Lambda response
            const assignedTeamName = data.assigned_team;
            
            // Store in window variable for allocation page to use
            window.assignedTeamName = assignedTeamName;
            
            // Update the display
            const teamDisplay = document.getElementById('teamDisplay');
            const allocationMessage = document.getElementById('allocationMessage');
            const continueBtn = document.getElementById('continueBtn');
            
            if (teamDisplay) {
                teamDisplay.textContent = `⚽ ${assignedTeamName}`;
            }
            
            if (allocationMessage) {
                allocationMessage.textContent = `You've been assigned ${assignedTeamName} for the sweepstake! Good luck with your predictions!`;
            }
            
            if (continueBtn) {
                continueBtn.style.display = 'block';
            }
            
            // Save to localStorage
            localStorage.setItem('assignedTeam', JSON.stringify({
                name: assignedTeamName,
                flag: '⚽'
            }));
            
        } else {
            alert('Error assigning team: ' + (data.message || 'Unknown error'));
            showPage('loginPage');
        }
        
    } catch (error) {
        console.error('Error assigning team:', error);
        alert('Error assigning team: ' + error.message);
        showPage('loginPage');
    }
}

function initPredictionFlow() {
    const userId = localStorage.getItem('userId');
    const assignedTeam = JSON.parse(localStorage.getItem('assignedTeam') || '{}');
    
    localStorage.setItem('predictionState', JSON.stringify({
        userId: userId,
        assignedTeam: assignedTeam,
        teamAssigned: true,
        predictions: {
            tournamentWinner: false,
            goldenBoot: false,
            goldenGlove: false
        },
        completedAt: {},
        allPredictionsComplete: false
    }));
    
    localStorage.setItem('predictions', JSON.stringify({}));
    
    setTimeout(() => {
        showPage('tournamentWinnerPage');
    }, 1500);
}

// Auto-assign team when page is shown
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on allocation page and assign team
    const observer = new MutationObserver(function(mutations) {
        const allocationPage = document.getElementById('allocationPage');
        if (allocationPage && allocationPage.classList.contains('active')) {
            assignTeamOnLoad();
        }
    });
    
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
});

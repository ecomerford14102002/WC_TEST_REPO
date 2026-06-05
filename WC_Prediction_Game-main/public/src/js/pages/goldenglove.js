// Golden Glove Prediction Page - UPDATED with improved UI

function createGoldenGlovePage() {
    return `
        <button class="back-button" onclick="goBackToPreviousPage()">
            <i class="fas fa-arrow-left"></i> Back
        </button>

        <div class="prediction-page fadeInUp">
            <div class="prediction-header">
                <h1>Golden Glove</h1>
                <div class="progress-indicator">
                    <div class="progress-step completed">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step completed">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step active">3</div>
                </div>
            </div>

            <div class="prediction-card">
                <div class="prediction-icon">🧤</div>
                <h2>Who will win the Golden Glove?</h2>
                <p class="prediction-subtitle">Name the goalkeeper you think will have the best performance (First name and Surname)</p>
                
                <div class="prediction-form">
                    <input 
                        type="text" 
                        id="golden-glove" 
                        class="form-input-large" 
                        placeholder="e.g., Gianluigi Donnarumma"
                        maxlength="100"
                    >
                    <div class="character-counter">
                        <span id="glove-count">0</span>/100 characters
                    </div>
                </div>

                <div class="prediction-actions">
                    <button class="btn btn-primary btn-large" onclick="submitGoldenGlove(this)">
                        <i class="fas fa-check-circle"></i> Complete All Predictions
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function submitGoldenGlove(button) {
    const gloveInput = document.getElementById('golden-glove');
    
    if (!gloveInput) {
        alert('Error: Input field not found');
        return;
    }
    
    const goalkeeperName = gloveInput.value.trim();

    if (!goalkeeperName) {
        alert('Please enter a goalkeeper name');
        return;
    }

    if (goalkeeperName.length < 2) {
        alert('Goalkeeper name must be at least 2 characters');
        return;
    }

    try {
        // Show loading state
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        button.disabled = true;

        const userId = localStorage.getItem('userId');
        const jwtToken = localStorage.getItem('jwt_token');

        console.log('Saving golden glove prediction:', {
            userId: userId,
            playerName: goalkeeperName,
            jwtToken: jwtToken ? 'present' : 'missing'
        });

        // Call Lambda to save prediction
        const response = await fetch('/api/team-assignment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({
                action: 'predict_golden_glove',
                user_id: parseInt(userId),
                jwt_token: jwtToken,
                player_name: goalkeeperName
            })
        });

        const data = await response.json();
        console.log('Golden glove prediction response:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Prediction save failed');
        }

        // Save to localStorage
        const predictions = JSON.parse(localStorage.getItem('predictions') || '{}');
        predictions.goldenGlove = goalkeeperName;
        localStorage.setItem('predictions', JSON.stringify(predictions));

        // Update prediction state
        const predictionState = JSON.parse(localStorage.getItem('predictionState') || '{}');
        predictionState.predictions.goldenGlove = true;
        predictionState.completedAt.goldenGlove = new Date().toISOString();
        predictionState.allPredictionsComplete = true;
        localStorage.setItem('predictionState', JSON.stringify(predictionState));

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;

        // Navigate based on admin status
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        console.log('[GOLDEN_GLOVE] User is admin:', isAdmin);
        
        if (isAdmin) {
            // Admins go to home page
            const homePage = document.getElementById('homePage');
            if (homePage) {
                // Hide all pages
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                    page.style.display = 'none';
                });
                
                // Show home page
                homePage.innerHTML = createHomePage();
                homePage.classList.add('active');
                homePage.style.display = 'block';
            } else {
                alert('Error: Homepage not found');
            }
        } else {
            // Regular users go to hype timer
            const hypeTimerPage = document.getElementById('hypeTimerPage');
            if (hypeTimerPage) {
                // Hide all pages
                document.querySelectorAll('.page').forEach(page => {
                    page.classList.remove('active');
                    page.style.display = 'none';
                });
                
                // Show hype timer page
                hypeTimerPage.innerHTML = createHypeTimerPage();
                hypeTimerPage.classList.add('active');
                hypeTimerPage.style.display = 'block';
            } else {
                alert('Error: Hype timer page not found');
            }
        }

    } catch (error) {
        // Reset button
        button.innerHTML = '<i class="fas fa-check-circle"></i> Complete All Predictions';
        button.disabled = false;

        console.error('Golden glove prediction error:', error);
        alert(`Error saving prediction: ${error.message}`);
    }
}

// Update character counter
document.addEventListener('DOMContentLoaded', function() {
    const gloveInput = document.getElementById('golden-glove');
    if (gloveInput) {
        gloveInput.addEventListener('input', function() {
            const count = document.getElementById('glove-count');
            if (count) {
                count.textContent = this.value.length;
            }
        });
    }
});
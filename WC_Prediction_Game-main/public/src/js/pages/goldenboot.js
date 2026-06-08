// Golden Boot Prediction Page - UPDATED with improved UI

function createGoldenBootPage() {
    return `
        <button class="back-button" onclick="goBackToPreviousPage()">
            <i class="fas fa-arrow-left"></i> Back
        </button>

        <div class="prediction-page fadeInUp">
            <div class="prediction-header">
                <h1>Golden Boot</h1>
                <div class="progress-indicator">
                    <div class="progress-step completed">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step active">2</div>
                    <div class="progress-line"></div>
                    <div class="progress-step">3</div>
                </div>
            </div>

            <div class="prediction-card">
                <div class="prediction-icon">👟</div>
                <h2>Who will win the Golden Boot?</h2>
                <p class="prediction-subtitle">Name the player you think will score the most goals (First Name and Surname)</p>
                
                <div class="prediction-form">
                    <input 
                        type="text" 
                        id="golden-boot" 
                        class="form-input-large" 
                        placeholder="e.g., Kylian Mbappé"
                        maxlength="100"
                    >
                    <div class="character-counter">
                        <span id="boot-count">0</span>/100 characters
                    </div>
                </div>

                <div class="prediction-actions">
                    <button class="btn btn-primary btn-large" onclick="submitGoldenBoot(this)">
                        <i class="fas fa-arrow-right"></i> Continue to Next Step
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function submitGoldenBoot(button) {
    const playerName = document.getElementById('golden-boot').value.trim();

    if (!playerName) {
        alert('Please enter a player name');
        return;
    }

    if (playerName.length < 2) {
        alert('Player name must be at least 2 characters');
        return;
    }

    try {
        // Show loading state
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        button.disabled = true;

        const userId = localStorage.getItem('userId');
        const jwtToken = localStorage.getItem('jwt_token');

        console.log('Saving golden boot prediction:', {
            userId: userId,
            playerName: playerName,
            jwtToken: jwtToken ? 'present' : 'missing'
        });

        // Call API function to save prediction
        const data = await submitGoldenBootPrediction(userId, jwtToken, playerName);
        console.log('Golden boot prediction response:', data);

        // Save to localStorage
        const predictions = JSON.parse(localStorage.getItem('predictions') || '{}');
        predictions.goldenBoot = playerName;
        localStorage.setItem('predictions', JSON.stringify(predictions));

        // Update prediction state
        const predictionState = JSON.parse(localStorage.getItem('predictionState') || '{}');
        predictionState.predictions.goldenBoot = true;
        predictionState.completedAt.goldenBoot = new Date().toISOString();
        localStorage.setItem('predictionState', JSON.stringify(predictionState));

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;

        // Navigate to golden glove page
        const goldenGlovePage = document.getElementById('goldenGlovePage');
        if (goldenGlovePage) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
                page.style.display = 'none';
            });
            
            // Show golden glove page
            goldenGlovePage.innerHTML = createGoldenGlovePage();
            goldenGlovePage.classList.add('active');
            goldenGlovePage.style.display = 'block';
        }

    } catch (error) {
        // Reset button
        button.innerHTML = '<i class="fas fa-arrow-right"></i> Continue to Next Step';
        button.disabled = false;

        console.error('Golden boot prediction error:', error);
        alert(`Error saving prediction: ${error.message}`);
    }
}
// Update character counter
document.addEventListener('DOMContentLoaded', function() {
    const bootInput = document.getElementById('golden-boot');
    if (bootInput) {
        bootInput.addEventListener('input', function() {
            const count = document.getElementById('boot-count');
            if (count) {
                count.textContent = this.value.length;
            }
        });
    }
});

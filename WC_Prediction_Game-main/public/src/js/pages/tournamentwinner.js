// Tournament Winner Prediction Page - UPDATED with improved UI

function createTournamentWinnerPage() {
    const teams = [
        // CONCACAF - HOST NATIONS (3 teams)
        '🇺🇸 United States',
        '🇲🇽 Mexico',
        '🇨🇦 Canada',
        
        // CONCACAF - QUALIFIED (3 teams)
        '🇨🇼 Curaçao',
        '🇭🇹 Haiti',
        '🇵🇦 Panama',
        
        // CONMEBOL (6 teams)
        '🇦🇷 Argentina',
        '🇧🇷 Brazil',
        '🇨🇴 Colombia',
        '🇪🇨 Ecuador',
        '🇵🇾 Paraguay',
        '🇺🇾 Uruguay',
        
        // UEFA (16 teams)
        '🇦🇹 Austria',
        '🇧🇪 Belgium',
        '🇧🇦 Bosnia and Herzegovina',
        '🇭🇷 Croatia',
        '🇨🇿 Czechia',
        '🇬🇧 England',
        '🇫🇷 France',
        '🇩🇪 Germany',
        '🇳🇱 Netherlands',
        '🇳🇴 Norway',
        '🇵🇹 Portugal',
        '🇬🇧 Scotland',
        '🇪🇸 Spain',
        '🇸🇪 Sweden',
        '🇨🇭 Switzerland',
        '🇹🇷 Türkiye',
        
        // AFC (9 teams)
        '🇦🇺 Australia',
        '🇮🇶 Iraq',
        '🇮🇷 IR Iran',
        '🇯🇵 Japan',
        '🇯🇴 Jordan',
        '🇰🇷 Korea Republic',
        '🇶🇦 Qatar',
        '🇸🇦 Saudi Arabia',
        '🇺🇿 Uzbekistan',
        
        // CAF (10 teams)
        '🇩🇿 Algeria',
        '🇨🇻 Cabo Verde',
        '🇨🇩 Congo DR',
        '🇨🇮 Côte d\'Ivoire',
        '🇪🇬 Egypt',
        '🇬🇭 Ghana',
        '🇲🇦 Morocco',
        '🇸🇳 Senegal',
        '🇿🇦 South Africa',
        '🇹🇳 Tunisia',
        
        // OFC (1 team)
        '🇳🇿 New Zealand'
    ];

    const teamOptions = teams.map(team => 
        `<option value="${team}">${team}</option>`
    ).join('');

    return `
        <button class="back-button" onclick="goBackToPreviousPage()">
            <i class="fas fa-arrow-left"></i> Back
        </button>

        <div class="prediction-page fadeInUp">
            <div class="prediction-header">
                <h1>Tournament Winner</h1>
                <div class="progress-indicator">
                    <div class="progress-step active">1</div>
                    <div class="progress-line"></div>
                    <div class="progress-step">2</div>
                    <div class="progress-line"></div>
                    <div class="progress-step">3</div>
                </div>
            </div>

            <div class="prediction-card">
                <div class="prediction-icon">🏆</div>
                <h2>Who will win the 2026 World Cup?</h2>
                <p class="prediction-subtitle">Select the team you think will lift the trophy</p>
                
                <div class="prediction-form">
                    <select id="tournament-winner" class="form-select-large">
                        <option value="">-- Select a team --</option>
                        ${teamOptions}
                    </select>
                </div>

                <div class="prediction-actions">
                    <button class="btn btn-primary btn-large" onclick="submitTournamentWinner(this)">
                        <i class="fas fa-arrow-right"></i> Continue
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function submitTournamentWinner(button) {
    const selection = document.getElementById('tournament-winner').value;

    if (!selection) {
        alert('Please select a team');
        return;
    }

    try {
        // Show loading state
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        button.disabled = true;

        const userId = localStorage.getItem('userId');
        const jwtToken = localStorage.getItem('jwt_token');

        // Extract country name without emoji (remove first 2 characters which are emoji + space)
        const countryName = selection.substring(2).trim();

        console.log('Saving tournament winner prediction:', {
            userId: userId,
            country: countryName,
            jwtToken: jwtToken ? 'present' : 'missing'
        });

        // Call API function to save prediction
        const data = await submitTournamentWinnerPrediction(userId, jwtToken, countryName);
        console.log('Tournament winner prediction response:', data);

        // Save to localStorage
        const predictions = JSON.parse(localStorage.getItem('predictions') || '{}');
        predictions.tournamentWinner = selection;
        localStorage.setItem('predictions', JSON.stringify(predictions));

        // Update prediction state
        const predictionState = JSON.parse(localStorage.getItem('predictionState') || '{}');
        predictionState.predictions.tournamentWinner = true;
        predictionState.completedAt.tournamentWinner = new Date().toISOString();
        localStorage.setItem('predictionState', JSON.stringify(predictionState));

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;

        // Navigate to golden boot page
        const goldenBootPage = document.getElementById('goldenBootPage');
        if (goldenBootPage) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
                page.style.display = 'none';
            });
            
            // Show golden boot page
            goldenBootPage.innerHTML = createGoldenBootPage();
            goldenBootPage.classList.add('active');
            goldenBootPage.style.display = 'block';
        }

    } catch (error) {
        // Reset button
        button.innerHTML = '<i class="fas fa-arrow-right"></i> Continue';
        button.disabled = false;

        console.error('Tournament winner prediction error:', error);
        alert(`Error saving prediction: ${error.message}`);
    }
}

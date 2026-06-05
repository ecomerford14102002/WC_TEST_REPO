// Main App Logic - UPDATED (Verification page removed)

// Initialize app
function initApp() {
    const app = document.getElementById('app');
    
    // Create login page
    const loginPage = document.createElement('div');
    loginPage.className = 'page active';
    loginPage.id = 'loginPage';
    loginPage.innerHTML = createLoginPage();
    app.appendChild(loginPage);
    
    // Create signup page
    const signupPage = document.createElement('div');
    signupPage.className = 'page';
    signupPage.id = 'signupPage';
    signupPage.innerHTML = createSignupPage();
    app.appendChild(signupPage);
    
    // ✅ REMOVED: Verification page - no longer needed    // Create allocation page
    const allocationPage = document.createElement('div');
    allocationPage.className = 'page';
    allocationPage.id = 'allocationPage';
    allocationPage.innerHTML = createAllocationPage();
    app.appendChild(allocationPage);
    
    // Create hype timer page
    const hypeTimerPage = document.createElement('div');
    hypeTimerPage.className = 'page';
    hypeTimerPage.id = 'hypeTimerPage';
    app.appendChild(hypeTimerPage);
    
    // Create home page
    const homePage = document.createElement('div');
    homePage.className = 'page';
    homePage.id = 'homePage';
    homePage.innerHTML = createHomePage();
    app.appendChild(homePage);
    
    // Create predictions page
    const predictionsPage = document.createElement('div');
    predictionsPage.className = 'page';
    predictionsPage.id = 'scoreGuesserPage';
    predictionsPage.innerHTML = createPredictionsPage();
    app.appendChild(predictionsPage);
    
    // Create tournament winner page
    const tournamentWinnerPage = document.createElement('div');
    tournamentWinnerPage.className = 'page';
    tournamentWinnerPage.id = 'tournamentWinnerPage';
    app.appendChild(tournamentWinnerPage);
    
    // Create golden boot page
    const goldenBootPage = document.createElement('div');
    goldenBootPage.className = 'page';
    goldenBootPage.id = 'goldenBootPage';
    app.appendChild(goldenBootPage);
    
    // Create golden glove page
    const goldenGlovePage = document.createElement('div');
    goldenGlovePage.className = 'page';
    goldenGlovePage.id = 'goldenGlovePage';
    app.appendChild(goldenGlovePage);

    // Create admin page
    const adminPage = document.createElement('div');
    adminPage.className = 'page';
    adminPage.id = 'adminPage';
    app.appendChild(adminPage);
}

// Show/Hide pages function
function showPage(pageId) {
    console.log('=== showPage called with:', pageId);
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    console.log('Total pages found:', pages.length);
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    // Find and show target page
    const targetPage = document.getElementById(pageId);
    console.log('Looking for page with ID:', pageId);
    console.log('Target page found:', !!targetPage);
    
    if (targetPage) {
        console.log('Target page found, rendering content...');
        
        // Dynamically render prediction pages when shown
        if (pageId === 'tournamentWinnerPage' && !targetPage.innerHTML) {
            console.log('Creating Tournament Winner Page');
            targetPage.innerHTML = createTournamentWinnerPage();
        } else if (pageId === 'goldenBootPage' && !targetPage.innerHTML) {
            console.log('Creating Golden Boot Page');
            targetPage.innerHTML = createGoldenBootPage();
        } else if (pageId === 'goldenGlovePage' && !targetPage.innerHTML) {
            console.log('Creating Golden Glove Page');
            targetPage.innerHTML = createGoldenGlovePage();
        }
        else if (pageId === 'adminPage' && !targetPage.innerHTML) {
            console.log('Creating Admin Page');
            targetPage.innerHTML = createAdminPage();
        }
        
        // Show the page - use multiple methods to ensure it's visible
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
        targetPage.style.visibility = 'visible';
        targetPage.style.opacity = '1';
        console.log('✓ Page activated:', pageId);
        console.log('Page HTML length:', targetPage.innerHTML.length);
    } else {
        console.error('✗ Page not found:', pageId);
        console.log('Available pages:', Array.from(pages).map(p => p.id));
    }
}

// Initialize prediction flow after team assignment
function initPredictionFlow() {
    const userId = localStorage.getItem('userId');
    
    localStorage.setItem('predictionState', JSON.stringify({
        userId: userId,
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

// Helper function to go back to previous page
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

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
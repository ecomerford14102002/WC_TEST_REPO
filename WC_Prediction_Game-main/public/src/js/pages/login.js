// Login Page - UPDATED TO STORE is_admin FLAG

function createLoginPage() {
    return `
        <div class="login-container fadeInUp">
            <div class="login-logo">
                <img src="https://www.deloitte.com/content/dam/assets-shared/logos/svg/a-d/deloitte.svg" alt="Deloitte">
                <h1>World Cup Predictor</h1>
                <p>Make your predictions and compete with colleagues</p>
            </div>
            
            <div>
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" class="form-input" placeholder="your.email@deloitte.ie">
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" class="form-input" placeholder="Enter your password">
                </div>
                
                <button type="button" class="btn btn-primary" id="loginBtn" onclick="handleLogin(this)">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
                
                <button type="button" class="btn btn-secondary" onclick="showPage('signupPage')">
                    <i class="fas fa-user-plus"></i> Sign Up
                </button>
                
            </div>
        </div>
    `;
}

// Handle login
async function handleLogin(button) {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Validation
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (!email.includes('@')) {
        alert('Please enter a valid email');
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    try {
        // Show loading state
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        button.disabled = true;

        console.log('Calling loginUser with email:', email);

        // Call API
        const response = await loginUser(email, password);

        console.log('Login response:', response);

        // Store user data
        localStorage.setItem('userId', response.user_id);
        localStorage.setItem('userName', response.username);
        localStorage.setItem('userEmail', response.email);
        localStorage.setItem('jwt_token', response.jwt_token);
        
        // IMPORTANT: Store the is_admin flag
        localStorage.setItem('isAdmin', response.is_admin ? 'true' : 'false');
        console.log('[LOGIN] Stored isAdmin flag:', response.is_admin ? 'true' : 'false');

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;

        // Show success message
        alert(`✅ Login successful!\nWelcome back, ${response.username}!`);        // ✅ UPDATED: All users now go directly to home page (hype timer removed)
        console.log('[LOGIN] User authenticated - going to home page');
        showPage('homePage');

    } catch (error) {
        // Reset button
        button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        button.disabled = false;

        // Show error message
        console.error('Login error:', error);
        alert(`❌ Login failed: ${error.message}`);
    }
}
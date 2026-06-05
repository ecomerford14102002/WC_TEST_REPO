// Sign-Up Page - UPDATED with email domain validation, no verification, and hype timer routing

function createSignupPage() {
    return `
        <div class="login-container fadeInUp">
            <div class="login-logo">
                <img src="https://www.deloitte.com/content/dam/assets-shared/logos/svg/a-d/deloitte.svg" alt="Deloitte">
                <h1>Create Account</h1>
                <p>Join the World Cup prediction competition</p>
            </div>
            
            <div>
                <div class="form-group">
                    <label for="signup-email">Email Address</label>
                    <input type="email" id="signup-email" class="form-input" placeholder="your.email@deloitte.ie">
                    <small class="form-hint">Must be a valid Deloitte email (@deloitte.ie)</small>
                </div>
                
                <div class="form-group">
                    <label for="signup-username">Username</label>
                    <input type="text" id="signup-username" class="form-input" placeholder="your_username">
                </div>
                
                <div class="form-group">
                    <label for="signup-password">Password</label>
                    <input type="password" id="signup-password" class="form-input" placeholder="Create a password">
                </div>

                <div class="form-group">
                    <label for="confirm-password">Confirm Password</label>
                    <input type="password" id="confirm-password" class="form-input" placeholder="Re-enter your password">
                </div>
                
                <div class="form-group">
                    <label for="signup-office">Office Location</label>
                    <select id="signup-office" class="form-input" style="background-color: #3a3a3a; color: white;">
                        <option value="">Select your office location</option>
                        <option value="Cork">Cork</option>
                        <option value="Dublin">Dublin</option>
                    </select>
                </div>
                
                <button type="button" class="btn btn-primary" id="signupBtn" onclick="handleSignup(this)">
                    <i class="fas fa-user-plus"></i> Sign Up
                </button>
                
                <button type="button" class="btn btn-secondary" onclick="showPage('loginPage')">
                    <i class="fas fa-arrow-left"></i> Back to Login
                </button>
            </div>
        </div>
    `;
}

// Handle signup
async function handleSignup(button) {
    const email = document.getElementById('signup-email').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const officeLocation = document.getElementById('signup-office').value.trim();
    
    // Validation
    if (!email || !username || !password || !confirmPassword || !officeLocation) {
        alert('Please fill in all fields');
        return;
    }

    if (!email.includes('@')) {
        alert('Please enter a valid email');
        return;
    }

    // ✅ NEW: Validate email domain must be @deloitte.ie
    if (!email.endsWith('@deloitte.ie')) {
        alert('Please use your Deloitte email address (@deloitte.ie)');
        return;
    }

    if (username.length < 3 || username.length > 20) {
        alert('Username must be 3-20 characters');
        return;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(username)) {
        alert('Username must start with letter or underscore, contain only alphanumeric and underscores');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    if (officeLocation !== 'Cork' && officeLocation !== 'Dublin') {
        alert('Please select a valid office location');
        return;
    }

    try {
        // Show loading state
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating user...';
        button.disabled = true;

        console.log('Calling registerUser with:', {
            email: email,
            username: username,
            office_location: officeLocation
        });

        // Call API
        const response = await registerUser({
            email: email,
            username: username,
            password: password,
            office_location: officeLocation
        });

        console.log('Registration response:', response);

        // Store user data
        localStorage.setItem('userId', response.user_id);
        localStorage.setItem('userName', response.username);
        localStorage.setItem('userEmail', response.email);
        localStorage.setItem('userOfficeLocation', response.office_location);
        
        // Store JWT token from registration response
        if (response.jwt_token) {
            localStorage.setItem('jwt_token', response.jwt_token);
            console.log('JWT token stored from registration');
        } else {
            console.warn('No JWT token in registration response');
        }

        // ✅ Store the is_admin flag from registration response
        localStorage.setItem('isAdmin', response.is_admin ? 'true' : 'false');
        console.log('[SIGNUP] Stored isAdmin flag:', response.is_admin ? 'true' : 'false');

        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;

        // Show success message
        alert(`✅ Account created successfully!\nWelcome, ${response.username}!`);

        // ✅ CHANGED: Navigate directly to allocation page (skip verification)
        showPage('allocationPage');

    } catch (error) {
        // Reset button
        button.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
        button.disabled = false;

        // Show error message
        console.error('Signup error:', error);
        
        // ✅ NEW: Handle specific error messages from backend
        let errorMessage = error.message;
        
        if (error.message.includes('Email is already in use')) {
            errorMessage = '❌ Email is already in use. Please use a different email.';
        } else if (error.message.includes('Username is already in use')) {
            errorMessage = '❌ Username is already in use. Please choose a different username.';
        } else if (error.message.includes('Deloitte')) {
            errorMessage = '❌ Please use your Deloitte email address (@deloitte.ie)';
        }
        
        alert(`Registration failed: ${errorMessage}`);
    }
}
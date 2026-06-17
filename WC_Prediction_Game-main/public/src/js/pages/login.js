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
                
                <!-- NEW: Forgot Password Link -->
                <div style="text-align: center; margin-top: 20px;">
                    <button type="button" style="background: none; border: none; color: #86BC25; cursor: pointer; text-decoration: underline; font-size: 0.9rem;" onclick="showForgotPasswordModal()">
                        Forgot your password?
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showForgotPasswordModal() {
    const modal = document.createElement('div');
    modal.id = 'forgotPasswordModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2><i class="fas fa-key"></i> Reset Password</h2>
                <button class="modal-close" onclick="closeForgotPasswordModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 20px;">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="forgot-email" class="form-input" placeholder="your.email@deloitte.ie">
                </div>
                <button class="btn btn-primary" onclick="submitForgotPassword(this)" style="width: 100%;">
                    <i class="fas fa-envelope"></i> Send Reset Link
                </button>
                <div id="forgot-feedback" style="margin-top: 15px;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitForgotPassword(button) {
    const email = document.getElementById('forgot-email').value.trim();
    const feedback = document.getElementById('forgot-feedback');
    
    if (!email) {
        feedback.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Please enter your email</div>';
        return;
    }
    
    if (!email.endsWith('@deloitte.ie')) {
        feedback.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Please use your Deloitte email</div>';
        return;
    }
    
    try {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        button.disabled = true;
        
        const response = await requestPasswordReset(email);
        
        if (response.status === 'success') {
            feedback.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i> 
                    Check your email for the reset link. It expires in 1 hour.
                </div>
            `;
            
            setTimeout(() => {
                closeForgotPasswordModal();
            }, 3000);
        } else {
            feedback.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${response.message}</div>`;
        }
        
        button.innerHTML = originalText;
        button.disabled = false;
    } catch (error) {
        feedback.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
        button.innerHTML = '<i class="fas fa-envelope"></i> Send Reset Link';
        button.disabled = false;
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.remove();
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

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
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


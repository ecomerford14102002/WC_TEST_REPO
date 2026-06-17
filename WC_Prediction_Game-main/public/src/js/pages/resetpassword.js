function createResetPasswordPage() {
    // Get token from URL (e.g., ?token=abc123)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        return `
            <div class="login-container fadeInUp">
                <div class="login-logo">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #EF4444; margin-bottom: 20px;"></i>
                    <h1>Invalid Link</h1>
                    <p>The reset link is missing or invalid</p>
                </div>
                <button class="btn btn-primary" onclick="window.location.href='/'">
                    <i class="fas fa-arrow-left"></i> Back to Login
                </button>
            </div>
        `;
    }
    
    return `
        <div class="login-container fadeInUp">
            <div class="login-logo">
                <img src="https://www.deloitte.com/content/dam/assets-shared/logos/svg/a-d/deloitte.svg" alt="Deloitte">
                <h1>Reset Password</h1>
                <p>Enter your new password</p>
            </div>
            
            <div>
                <div class="form-group">
                    <label for="reset-password">New Password</label>
                    <input type="password" id="reset-password" class="form-input" placeholder="Enter new password">
                </div>
                
                <div class="form-group">
                    <label for="reset-confirm">Confirm Password</label>
                    <input type="password" id="reset-confirm" class="form-input" placeholder="Confirm new password">
                </div>
                
                <button type="button" class="btn btn-primary" onclick="submitResetPassword('${token}', this)">
                    <i class="fas fa-check"></i> Reset Password
                </button>
                
                <button type="button" class="btn btn-secondary" onclick="window.location.href='/'">
                    <i class="fas fa-arrow-left"></i> Back to Login
                </button>
                
                <div id="reset-feedback" style="margin-top: 15px;"></div>
            </div>
        </div>
    `;
}

async function submitResetPassword(token, button) {
    const newPassword = document.getElementById('reset-password').value;
    const confirmPassword = document.getElementById('reset-confirm').value;
    const feedback = document.getElementById('reset-feedback');
    
    if (!newPassword || !confirmPassword) {
        feedback.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Please fill all fields</div>';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        feedback.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Passwords do not match</div>';
        return;
    }
    
    if (newPassword.length < 6) {
        feedback.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Password must be at least 6 characters</div>';
        return;
    }
    
    try {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        button.disabled = true;
        
        const response = await resetPassword(token, newPassword);
        
        if (response.status === 'success') {
            feedback.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i> 
                    Password reset successfully! Redirecting to login...
                </div>
            `;
            
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            feedback.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${response.message}</div>`;
            button.innerHTML = originalText;
            button.disabled = false;
        }
    } catch (error) {
        feedback.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
        button.innerHTML = '<i class="fas fa-check"></i> Reset Password';
        button.disabled = false;
    }
}
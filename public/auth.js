// Authentication state management
let currentUser = null;
let authToken = null;

// Check for existing session on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        authToken = token;
        try {
            const response = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                currentUser = await response.json();
                showAuthenticatedUI();
                return;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
    
    showUnauthenticatedUI();
}

function showUnauthenticatedUI() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.style.display = 'block';
    }
    
    // Hide main content
    const mainContent = document.querySelector('.container > header, .section');
    if (mainContent) {
        document.querySelectorAll('.section, .container > header').forEach(el => {
            el.style.display = 'none';
        });
    }
}

function showAuthenticatedUI() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.style.display = 'none';
    }
    
    // Show main content
    document.querySelectorAll('.section, .container > header').forEach(el => {
        el.style.display = 'block';
    });
    
    // Update user info in header
    updateUserInfo();
    
    // Load user data
    loadUserData();
}

function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (userInfo && currentUser) {
        userInfo.innerHTML = `
            <span>Welcome, ${currentUser.full_name || currentUser.email}</span>
            <button id="profile-btn" class="profile-button">Profile</button>
            <button id="logout-btn" class="logout-button">Logout</button>
        `;
        
        document.getElementById('profile-btn').addEventListener('click', showProfileModal);
        document.getElementById('logout-btn').addEventListener('click', logout);
    }
}

async function signup(email, password, fullName) {
    try {
        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, fullName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Account created successfully! Please sign in.');
            showSignInForm();
        } else {
            throw new Error(data.error || 'Signup failed');
        }
    } catch (error) {
        showError('Signup failed: ' + error.message);
    }
}

async function signin(email, password) {
    try {
        const response = await fetch('/auth/signin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.session.access_token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showAuthenticatedUI();
            showSuccess('Successfully signed in!');
        } else {
            throw new Error(data.error || 'Sign in failed');
        }
    } catch (error) {
        showError('Sign in failed: ' + error.message);
    }
}

async function logout() {
    try {
        if (authToken) {
            await fetch('/auth/signout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        showUnauthenticatedUI();
        showSuccess('Successfully logged out');
    }
}

// Google Drive Integration
async function connectGoogleDrive() {
    try {
        const response = await fetch('/auth/google', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            window.open(data.authUrl, 'google-auth', 'width=500,height=600');
            
            // Listen for auth completion
            const checkAuth = setInterval(() => {
                if (window.location.search.includes('google_auth=success')) {
                    clearInterval(checkAuth);
                    showSuccess('Google Drive connected successfully!');
                    updateIntegrationStatus();
                } else if (window.location.search.includes('google_auth=error')) {
                    clearInterval(checkAuth);
                    showError('Google Drive connection failed');
                }
            }, 1000);
        }
    } catch (error) {
        showError('Failed to connect Google Drive: ' + error.message);
    }
}

// Profile management
function showProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Populate form with current user data
        document.getElementById('profile-full-name').value = currentUser.full_name || '';
        document.getElementById('profile-notion-workspace').value = currentUser.notion_workspace_id || '';
        
        updateIntegrationStatus();
    }
}

function hideProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function updateProfile() {
    try {
        const fullName = document.getElementById('profile-full-name').value;
        const notionWorkspaceId = document.getElementById('profile-notion-workspace').value;
        
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                full_name: fullName,
                notion_workspace_id: notionWorkspaceId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data;
            updateUserInfo();
            hideProfileModal();
            showSuccess('Profile updated successfully!');
        } else {
            throw new Error(data.error || 'Profile update failed');
        }
    } catch (error) {
        showError('Profile update failed: ' + error.message);
    }
}

async function updateIntegrationStatus() {
    const googleStatus = document.getElementById('google-drive-status');
    const notionStatus = document.getElementById('notion-status');
    
    if (currentUser?.google_tokens) {
        googleStatus.innerHTML = '<span class="status-connected">✓ Connected</span>';
    } else {
        googleStatus.innerHTML = '<span class="status-disconnected">Not connected</span>';
    }
    
    if (currentUser?.notion_workspace_id) {
        notionStatus.innerHTML = '<span class="status-connected">✓ Configured</span>';
    } else {
        notionStatus.innerHTML = '<span class="status-disconnected">Not configured</span>';
    }
}

// UI form handlers
function showSignInForm() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('signin-form').style.display = 'block';
    document.getElementById('auth-title').textContent = 'Sign In';
    document.getElementById('auth-toggle').innerHTML = 'Need an account? <a href="#" onclick="showSignUpForm()">Sign up</a>';
}

function showSignUpForm() {
    document.getElementById('signin-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('auth-title').textContent = 'Sign Up';
    document.getElementById('auth-toggle').innerHTML = 'Already have an account? <a href="#" onclick="showSignInForm()">Sign in</a>';
}

// Form event handlers
document.addEventListener('DOMContentLoaded', function() {
    // Auth forms
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const fullName = document.getElementById('signup-name').value;
            signup(email, password, fullName);
        });
    }
    
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;
            signin(email, password);
        });
    }
    
    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateProfile();
        });
    }
    
    // Google Drive connect button
    const googleConnectBtn = document.getElementById('connect-google-drive');
    if (googleConnectBtn) {
        googleConnectBtn.addEventListener('click', connectGoogleDrive);
    }
    
    // Profile modal close
    const profileCloseBtn = document.getElementById('profile-close');
    if (profileCloseBtn) {
        profileCloseBtn.addEventListener('click', hideProfileModal);
    }
});

// Helper function to make authenticated requests
async function authenticatedFetch(url, options = {}) {
    if (!authToken) {
        throw new Error('Not authenticated');
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`
    };
    
    return fetch(url, { ...options, headers });
}

// Load user-specific data
async function loadUserData() {
    if (currentUser) {
        // Load companies and novels with authentication
        loadCompanies();
        loadNovels();
    }
}
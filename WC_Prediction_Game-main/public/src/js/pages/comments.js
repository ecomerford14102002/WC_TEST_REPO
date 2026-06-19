// comments.js - Comment Section Management

const VALID_REACTIONS = ['👍', '😂', '🔥', '❤️', '🤯', '😢'];

/**
 * Initialize comments section for a user profile
 * @param {number} targetUserId - User ID to load comments for
 */
async function initializeComments(targetUserId) {
    try {
        console.log('[COMMENTS] Initializing comments for user:', targetUserId);
        
        const commentsContainer = document.getElementById('comments-container');
        if (!commentsContainer) {
            console.warn('[COMMENTS] Comments container not found');
            return;
        }
        
        // Load existing comments
        await loadComments(targetUserId);
        
        // Setup comment form
        setupCommentForm(targetUserId);
        
    } catch (error) {
        console.error('[COMMENTS] Initialization error:', error);
    }
}

/**
 * Load and display comments
 */
async function loadComments(targetUserId) {
    try {
        console.log('[COMMENTS] Loading comments for user:', targetUserId);
        
        const currentUserId = parseInt(localStorage.getItem('userId'));
        const data = await getComments(targetUserId, currentUserId);
        const comments = data.data?.comments || [];
        
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        
        commentsList.innerHTML = '';
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
        
    } catch (error) {
        console.error('[COMMENTS] Load comments error:', error);
    }
}

/**
 * Create a comment DOM element
 */
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.id = `comment-${comment.id}`;
    
    const currentUserId = parseInt(localStorage.getItem('userId'));
    const isAuthor = currentUserId === comment.user_id;
    
    const timeAgo = formatTimeAgo(comment.created_at);
    
    let reactionsHTML = '<div class="comment-reactions">';
    VALID_REACTIONS.forEach(emoji => {
        const count = comment.reactions[emoji] || 0;
        const userReacted = comment.user_reactions && comment.user_reactions.includes(emoji);
        const activeClass = userReacted ? 'active' : '';
        
        reactionsHTML += `
            <button class="reaction-btn ${activeClass}" 
                    data-emoji="${emoji}" 
                    data-comment-id="${comment.id}"
                    title="Click to react">
                ${emoji} <span class="reaction-count">${count}</span>
            </button>
        `;
    });
    reactionsHTML += '</div>';
    
    let deleteBtn = '';
    if (isAuthor) {
        deleteBtn = `<button class="delete-comment-btn" data-comment-id="${comment.id}">Delete</button>`;
    }
    
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${comment.author_name}</span>
            <span class="comment-time">${timeAgo}</span>
        </div>
        <div class="comment-content">${escapeHtml(comment.content)}</div>
        ${reactionsHTML}
        <div class="comment-actions">
            ${deleteBtn}
        </div>
    `;
    
    // Attach event listeners
    div.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', handleReactionClick);
    });
    
    if (isAuthor) {
        div.querySelector('.delete-comment-btn').addEventListener('click', handleDeleteComment);
    }
    
    return div;
}

/**
 * Setup comment form
 */
function setupCommentForm(targetUserId) {
    const form = document.getElementById('comment-form');
    const textarea = document.getElementById('comment-textarea');
    const counter = document.getElementById('char-counter');
    const submitBtn = document.getElementById('submit-comment-btn');
    
    if (!form || !textarea) return;
    
    // Character counter
    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        counter.textContent = `${length}/500`;
        
        if (length > 500) {
            textarea.value = textarea.value.substring(0, 500);
            counter.textContent = '500/500';
        }
        
        submitBtn.disabled = length === 0;
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const content = textarea.value.trim();
        if (!content) return;
        
        const userId = parseInt(localStorage.getItem('userId'));
        const jwtToken = localStorage.getItem('jwt_token');
        
        if (!userId || !jwtToken) {
            alert('Please log in to comment');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        
        try {
            await postComment(userId, targetUserId, content, jwtToken);
            textarea.value = '';
            counter.textContent = '0/500';
            submitBtn.textContent = 'Post Comment';
            await loadComments(targetUserId);
        } catch (error) {
            alert('Failed to post comment: ' + error.message);
            submitBtn.textContent = 'Post Comment';
        } finally {
            submitBtn.disabled = false;
        }
    });
}

/**
 * Handle reaction button click
 */
async function handleReactionClick(e) {
    const btn = e.currentTarget;
    const emoji = btn.dataset.emoji;
    const commentId = parseInt(btn.dataset.commentId);
    
    const userId = parseInt(localStorage.getItem('userId'));
    const jwtToken = localStorage.getItem('jwt_token');
    
    if (!userId || !jwtToken) {
        alert('Please log in to react');
        return;
    }
    
    try {
        const isActive = btn.classList.contains('active');
        
        if (isActive) {
            await removeReaction(commentId, userId, emoji, jwtToken);
        } else {
            await addReaction(commentId, userId, emoji, jwtToken);
        }
        
        // Reload comments to reflect changes
        const targetUserId = parseInt(document.getElementById('target-user-id').value);
        await loadComments(targetUserId);
        
    } catch (error) {
        console.error('[COMMENTS] Reaction error:', error);
        alert('Failed to update reaction');
    }
}

/**
 * Handle delete comment
 */
async function handleDeleteComment(e) {
    const btn = e.currentTarget;
    const commentId = parseInt(btn.dataset.commentId);
    
    if (!confirm('Are you sure you want to delete this comment?')) {
        return;
    }
    
    const userId = parseInt(localStorage.getItem('userId'));
    const jwtToken = localStorage.getItem('jwt_token');
    
    if (!userId || !jwtToken) {
        alert('Please log in');
        return;
    }
    
    try {
        await deleteComment(commentId, userId, jwtToken);
        const targetUserId = parseInt(document.getElementById('target-user-id').value);
        await loadComments(targetUserId);
    } catch (error) {
        console.error('[COMMENTS] Delete error:', error);
        alert('Failed to delete comment');
    }
}

/**
 * Format timestamp to relative time
 */
function formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
// comments.js - Comment Section Management - UPDATED FOR HOME PAGE

const VALID_REACTIONS = ['👍', '😂', '🔥', '❤️', '🤯', '😢'];

/**
 * Initialize comments section on home page
 */
async function initializeComments() {
    try {
        console.log('[COMMENTS] Initializing comments section');
        
        const commentsContainer = document.getElementById('comments-container');
        if (!commentsContainer) {
            console.warn('[COMMENTS] Comments container not found');
            return;
        }
        
        // Load existing comments
        await loadComments();
        
        // Setup comment form
        setupCommentForm();
        
    } catch (error) {
        console.error('[COMMENTS] Initialization error:', error);
    }
}

/**
 * Load and display comments - UPDATED TO USE POST
 */
async function loadComments() {
    try {
        console.log('[COMMENTS] Loading comments');
        
        const response = await fetch(`${API_BASE_URL}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'get_comments'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const comments = data.comments || data.data?.comments || [];
        
        console.log('[COMMENTS] Loaded comments:', comments);
        
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;
        
        commentsList.innerHTML = '';
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments-message">No comments yet. Be the first to share your thoughts!</div>';
            return;
        }
        
        comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
        
    } catch (error) {
        console.error('[COMMENTS] Load comments error:', error);
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.innerHTML = '<div class="comments-loading"><i class="fas fa-exclamation-circle"></i> Error loading comments</div>';
        }
    }
}

/**
 * Create a comment DOM element
 */
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.id = `comment-${comment.id || comment.comment_id}`;
    
    const currentUserId = parseInt(localStorage.getItem('userId'));
    const isAuthor = currentUserId === comment.user_id;
    
    const timeAgo = formatTimeAgo(comment.created_at);
    
    let reactionsHTML = '<div class="comment-reactions">';
    VALID_REACTIONS.forEach(emoji => {
        const count = (comment.reactions && comment.reactions[emoji]) || 0;
        const userReacted = comment.user_reactions && comment.user_reactions.includes(emoji);
        const activeClass = userReacted ? 'active' : '';
        
        reactionsHTML += `
            <button class="reaction-btn ${activeClass}" 
                    data-emoji="${emoji}" 
                    data-comment-id="${comment.id || comment.comment_id}"
                    title="Click to react">
                ${emoji} <span class="reaction-count">${count}</span>
            </button>
        `;
    });
    reactionsHTML += '</div>';
    
    let deleteBtn = '';
    if (isAuthor) {
        deleteBtn = `<button class="delete-comment-btn" data-comment-id="${comment.id || comment.comment_id}"><i class="fas fa-trash"></i> Delete</button>`;
    }
    
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${comment.username || comment.author_name || 'Anonymous'}</span>
            <span class="comment-timestamp">${timeAgo}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.text || comment.content)}</div>
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
function setupCommentForm() {
    const form = document.getElementById('comment-form');
    const textarea = document.getElementById('comment-text');
    const counter = document.getElementById('comment-count');
    const submitBtn = document.getElementById('submit-comment');
    
    if (!form || !textarea) {
        console.warn('[COMMENTS] Form elements not found');
        return;
    }
    
    // Character counter
    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        if (counter) {
            counter.textContent = length;
        }
        
        if (length > 500) {
            textarea.value = textarea.value.substring(0, 500);
            if (counter) counter.textContent = '500';
        }
        
        if (submitBtn) {
            submitBtn.disabled = length === 0;
        }
    });
    
    // Form submission
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const content = textarea.value.trim();
            if (!content) {
                alert('Please enter a comment');
                return;
            }
            
            const userId = parseInt(localStorage.getItem('userId'));
            const userName = localStorage.getItem('userName');
            
            if (!userId) {
                alert('Please log in to comment');
                return;
            }
            
            submitBtn.disabled = true;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'post_comment',
                        user_id: userId,
                        username: userName,
                        text: content
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('[COMMENTS] Comment posted:', data);
                
                textarea.value = '';
                if (counter) counter.textContent = '0';
                submitBtn.innerHTML = originalText;
                
                // Show success message
                const feedback = document.createElement('div');
                feedback.className = 'comment-success';
                feedback.innerHTML = '<i class="fas fa-check-circle"></i> Comment posted!';
                textarea.parentElement.insertBefore(feedback, textarea.nextSibling);
                
                setTimeout(() => feedback.remove(), 3000);
                
                // Reload comments
                await loadComments();
                
            } catch (error) {
                console.error('[COMMENTS] Error posting comment:', error);
                
                const feedback = document.createElement('div');
                feedback.className = 'comment-error';
                feedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
                textarea.parentElement.insertBefore(feedback, textarea.nextSibling);
                
                setTimeout(() => feedback.remove(), 5000);
                submitBtn.innerHTML = originalText;
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
}

/**
 * Handle reaction button click
 */
async function handleReactionClick(e) {
    const btn = e.currentTarget;
    const emoji = btn.dataset.emoji;
    const commentId = parseInt(btn.dataset.commentId);
    
    const userId = parseInt(localStorage.getItem('userId'));
    
    if (!userId) {
        alert('Please log in to react');
        return;
    }
    
    try {
        const isActive = btn.classList.contains('active');
        
        if (isActive) {
            await removeReaction(commentId, userId, emoji);
        } else {
            await addReaction(commentId, userId, emoji);
        }
        
        // Reload comments to reflect changes
        await loadComments();
        
    } catch (error) {
        console.error('[COMMENTS] Reaction error:', error);
        alert('Failed to update reaction');
    }
}

/**
 * Add reaction to comment
 */
async function addReaction(commentId, userId, emoji) {
    const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'add_reaction',
            comment_id: commentId,
            user_id: userId,
            emoji: emoji
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to add reaction: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Remove reaction from comment
 */
async function removeReaction(commentId, userId, emoji) {
    const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'remove_reaction',
            comment_id: commentId,
            user_id: userId,
            emoji: emoji
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to remove reaction: ${response.statusText}`);
    }

    return response.json();
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
    
    if (!userId) {
        alert('Please log in');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'delete_comment',
                comment_id: commentId,
                user_id: userId
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.statusText}`);
        }

        await loadComments();
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

// Auto-initialize comments when home page loads
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        const homePage = document.getElementById('homePage');
        if (homePage && homePage.classList.contains('active')) {
            setTimeout(initializeComments, 100);
        }
    });

    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
});
// Navigation Functions - SIMPLIFIED
// (showPage is in main.js, don't duplicate it here)

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const historyModal = document.getElementById('historyModal');
        if (historyModal.classList.contains('active')) {
            closeHistory();
        }
    }
});
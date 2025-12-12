// Common functionality for all pages

// Page navigation function
async function changePage(pageName) {
    console.log('changePage called with:', pageName);
    try {
        if (!window.electronAPI) {
            console.error('electronAPI not available');
            return;
        }
        
        const result = await window.electronAPI.invoke('change-page-to', pageName);
        console.log('IPC result:', result);
        if (!result.success) {
            console.error('Failed to change page:', result.error);
        }
    } catch (error) {
        console.error('Error changing page:', error);
    }
}

// Make functions available globally
window.changePage = changePage;

// Add transition effect when page loads
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(10px)';
    document.body.style.transition = 'opacity 0.15s ease-out, transform 0.15s ease-out';
    
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
        document.body.style.transform = 'translateY(0)';
    });
});

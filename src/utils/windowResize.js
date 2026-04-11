export async function resizeLayout() {
    try {
        const result = await window.cheatingDaddyAPI.invoke('update-sizes');
        if (result.success) {
            console.log('Window resized for current view');
        } else {
            console.error('Failed to resize window:', result.error);
        }
    } catch (error) {
        console.error('Error resizing window:', error);
    }
}

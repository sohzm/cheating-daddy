export async function resizeLayout() {
    try {
        if (window.electronAPI) {
            const result = await window.electronAPI.window.updateSizes();
            if (result.success) {
                console.log('Window resized for current view');
            } else {
                console.error('Failed to resize window:', result.error);
            }
        }
    } catch (error) {
        console.error('Error resizing window:', error);
    }
}

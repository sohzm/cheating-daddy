/**
 * Utility function to resize the window for the current view
 * The main process will call back to get the current view name and layout mode
 */

/* export async function resizeLayout() */
export async function resizeLayout() {
    try {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const result = await ipcRenderer.invoke('update-sizes');
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

/**
 * Utility function to get the current view name from a view component
 * Used for mapping custom element tag names to view names
 * @param {string} tagName - The tag name of the custom element (e.g., 'customize-view')
 * @returns {string} - The view name for resizing
 */
export function getViewNameFromTag(tagName) {
    const viewMap = {
        'customize-view': 'customize',
        'help-view': 'help',
        'history-view': 'history',
        'advanced-view': 'advanced',
        'main-view': 'main',
        'assistant-view': 'assistant',
        'onboarding-view': 'onboarding',
    };

    return viewMap[tagName] || 'main';
}

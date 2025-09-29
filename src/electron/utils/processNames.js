// processNames.js - Random process name generation for better stealth

// Pool of legitimate-sounding application name components
const prefixes = [
    'System',
    'Desktop',
    'Audio',
    'Media',
    'Network',
    'Security',
    'Helper',
    'Service',
    'Background',
    'Core',
    'Windows',
    'Microsoft',
    'Apple',
    'Google',
    'Chrome',
    'Firefox',
    'Adobe',
    'Intel',
    'NVIDIA',
    'Driver',
    'Update',
    'Sync',
    'Cloud',
    'Backup',
    'Office',
    'Document',
    'File',
    'Data',
    'Remote',
    'Connection',
    'Stream',
];

const suffixes = [
    'Manager',
    'Service',
    'Helper',
    'Agent',
    'Process',
    'Handler',
    'Monitor',
    'Sync',
    'Update',
    'Assistant',
    'Connector',
    'Bridge',
    'Gateway',
    'Client',
    'Server',
    'Engine',
    'Driver',
    'Daemon',
    'Worker',
    'Scheduler',
    'Controller',
    'Viewer',
    'Player',
    'Editor',
    'Converter',
    'Optimizer',
    'Cleaner',
    'Scanner',
    'Analyzer',
];

const extensions = [
    '',
    'Pro',
    'Plus',
    'Lite',
    'Express',
    'Standard',
    'Premium',
    'Advanced',
    'Basic',
    'Essential',
    'Ultimate',
    'Enterprise',
    '2024',
    '365',
    'X',
    'HD',
];

// Company-like suffixes for more realism
const companies = [
    'Microsoft',
    'Apple',
    'Google',
    'Adobe',
    'Intel',
    'NVIDIA',
    'HP',
    'Dell',
    'Lenovo',
    'Samsung',
    'LG',
    'Sony',
    'Canon',
    'Epson',
    'Realtek',
    'Qualcomm',
];

let currentRandomName = null;
let currentRandomDisplayName = null;

/**
 * Generates a random legitimate-sounding process name
 * @param {boolean} includeCompany - Whether to include company name
 * @returns {string} Random process name
 */
function generateRandomProcessName(includeCompany = false) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const extension = Math.random() > 0.7 ? extensions[Math.floor(Math.random() * extensions.length)] : '';

    let baseName = `${prefix}${suffix}${extension}`;

    if (includeCompany && Math.random() > 0.5) {
        const company = companies[Math.floor(Math.random() * companies.length)];
        baseName = `${company} ${baseName}`;
    }

    return baseName;
}

/**
 * Generates a random executable name (lowercase, no spaces)
 * @returns {string} Random executable name
 */
function generateRandomExecutableName() {
    const name = generateRandomProcessName(false);
    return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Gets or generates the current session's random name
 * This ensures consistency throughout the application session
 * @returns {string} Current random process name
 */
function getCurrentRandomName() {
    if (!currentRandomName) {
        currentRandomName = generateRandomExecutableName();
    }
    return currentRandomName;
}

/**
 * Gets or generates the current session's random display name
 * This ensures consistency throughout the application session
 * @returns {string} Current random display name
 */
function getCurrentRandomDisplayName() {
    if (!currentRandomDisplayName) {
        currentRandomDisplayName = generateRandomProcessName(true);
    }
    return currentRandomDisplayName;
}

/**
 * Forces regeneration of random names (for new sessions)
 */
function regenerateRandomNames() {
    currentRandomName = generateRandomExecutableName();
    currentRandomDisplayName = generateRandomProcessName(true);
}

/**
 * Gets a random company name for branding
 * @returns {string} Random company name
 */
function getRandomCompanyName() {
    return companies[Math.floor(Math.random() * companies.length)];
}

/**
 * Generate a random window title that sounds legitimate
 * @returns {string} Random window title
 */
function generateRandomWindowTitle() {
    const titles = [
        'System Configuration',
        'Audio Settings',
        'Network Monitor',
        'Performance Monitor',
        'System Information',
        'Device Manager',
        'Background Services',
        'System Updates',
        'Security Center',
        'Task Manager',
        'Resource Monitor',
        'System Properties',
        'Network Connections',
        'Audio Devices',
        'Display Settings',
    ];

    return titles[Math.floor(Math.random() * titles.length)];
}

module.exports = {
    generateRandomProcessName,
    generateRandomExecutableName,
    getCurrentRandomName,
    getCurrentRandomDisplayName,
    regenerateRandomNames,
    getRandomCompanyName,
    generateRandomWindowTitle,
};

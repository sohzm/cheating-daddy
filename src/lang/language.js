const fs = require('fs');
const path = require('path');

/**
 * language.js
 * Selección de idioma y obtención de mensajes traducidos.
 * Compatible con ES Modules y CommonJS.
 */


// Obtener el idioma desde localStorage (en entorno browser)
function getLanguage() {
    if (typeof window !== 'undefined' && window.localStorage) 
    {
        return localStorage.getItem('selectedAppLanguage') || 'en-US';
    }
    // Fallback para Node.js (puedes cambiar el valor por defecto)
    return 'en-US';
}

// Mapear idioma a archivo JSON
function getLanguageFile(lang) {
    const map = {
        'es-CO': 'es-CO.json',
        'pt-BR': 'pt-BR.json', 
        'en-US': 'en-US.json',
        // Agrega más idiomas si es necesario
    };
    return map[lang] || map['es-CO'];
}

// Cargar archivo de idioma (Node.js)
function loadLanguageDataNode(langFile) {
    const filePath = path.join(__dirname, langFile);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return {};
}

// Cargar archivo de idioma (Browser)
async function loadLanguageDataBrowser(langFile) {
    const response = await fetch(langFile);
    if (response.ok) {
        return await response.json();
    }
    return {};
}

// Obtener mensaje traducido
async function getMessage(messageKey, lang = 'en-US') {
    //const lang = getLanguage();
    const langFile = getLanguageFile(lang);

    let messages = {};
    if (typeof window !== 'undefined' && window.fetch) {
        // Browser
        messages = await loadLanguageDataBrowser(langFile);
    } else {
        // Node.js
        messages = loadLanguageDataNode(langFile);
    }

    return messages[messageKey] || messageKey;
}

// Exportación ES Module y CommonJS
const language = {
    getLanguage,
    getMessage,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = language;
}

if (typeof exports !== 'undefined') {
    exports.language = language;
}

// ES Module export (para import)
//export default language;
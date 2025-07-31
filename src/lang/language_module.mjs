/**
 * @author: Oscar Ortiz Pinzón (@Oscardo)
 * @City: Bogotá, Colombia
 * @date: 2024-01-01
 * @version: 1.0.0
 * @file language_module.mjs
 * @description
 * Language module for handling translations in a web application
 * Supports dynamic imports, fetch API, XMLHttpRequest, and Node.js file system
 * Provides functions to get the current language, load language files, and retrieve messages
 * REQUIRES external JSON files
*/

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isBrowser = typeof window !== 'undefined';
const languageCache = {};

// Functions to get the current language and language file
/** Gets the current language from localStorage or defaults to 'en-US'
* @return {string} - Current language code (e.g., 'es-CO',  'pt-BR', 'en-US')
*/
export function getLanguage() {
    if (isBrowser && window.localStorage) {
        return localStorage.getItem('selectedAppLanguage') || 'en-US';
    }
    return 'en-US';
}

/**  Gets the language file based on the language code
* Returns 'en-US.json' if the language is not found
* @param {string} lang - Language code (e.g., 'es-CO', 'pt-BR', 'en-US')
* @return {string} - Name of the corresponding JSON file
*/
export function getLanguageFile(lang) {
    const map = {
        'es-CO': 'es-CO.json',
        'pt-BR': 'pt-BR.json', 
        'en-US': 'en-US.json',
    };
    return map[lang] || map['en-US'];
}

/** * SOLUTION 1: Dynamic Import (ESM)
* Requires dynamic import support
* Uses dynamic import syntax to load JSON files
* @param {string} lang - Language code (e.g., 'es-CO', 'pt-BR', 'en-US')
* @return {Promise<Object>} - Returns a promise that resolves to the JSON data
* */
export async function loadLanguageDataDynamicImport(lang) {
    try {
        //console.log(`🔄 Trying dynamic import for: ${lang}`);
        
        // Mapear idioma a ruta del módulo JSON
        const jsonModules = {
            'es-CO': './es-CO.json',
            'pt-BR': './pt-BR.json', 
            'en-US': './en-US.json',
        };
        
        const modulePath = jsonModules[lang] || jsonModules['es-CO'];
        
        // Import dinámico del JSON
        const module = await import(modulePath, {
            assert: { type: 'json' }  // Para navegadores que lo requieren
        });
        
        //console.log(`✅ Dynamic import successful for: ${lang}`);
        return module.default || module;
        
    } catch (error) {
        console.log(`❌ Dynamic import failed:`, error.message);
        return null;
    }
}

/** * SOLUTION 2: Fetch API (more compatible)
* Use fetch to load JSON files
* Try multiple common paths to find the file
* @param {string} langFile - Name of the language file (e.g., 'es-CO.json')
* @return {Promise<Object>} - Returns a promise that resolves to the JSON data
* */
export async function loadLanguageDataFetch(langFile) {
    if (!isBrowser || typeof fetch === 'undefined') return null;
    
    if (languageCache[langFile]) {
        //console.log(`💾 Using cached: ${langFile}`);
        return languageCache[langFile];
    }
    
    // Estrategias de ruta en orden de prioridad
    const pathStrategies = [
        // Ruta relativa simple
        langFile,
        `./${langFile}`,
        
        // Rutas comunes de assets
        `./assets/${langFile}`,
        `./assets/lang/${langFile}`,
        `./lang/${langFile}`,
        `./i18n/${langFile}`,
        `./locales/${langFile}`,
        
        // Rutas absolutas
        `/assets/${langFile}`,
        `/assets/lang/${langFile}`,
        `/lang/${langFile}`,
        `/i18n/${langFile}`,
        `/locales/${langFile}`,
        `/public/${langFile}`,
        `/static/${langFile}`,
        
        // Ruta del servidor de desarrollo (ej: Vite, Webpack)
        `/src/assets/${langFile}`,
        `/src/lang/${langFile}`,
    ];
    
    for (const path of pathStrategies) {
        try {
            //console.log(`🔍 Trying fetch: ${path}`);
            
            const response = await fetch(path, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                // Opciones para evitar cache en desarrollo
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const data = await response.json();
                //console.log(`✅ Fetch successful: ${path}`);
                languageCache[langFile] = data;
                return data;
            }
            
            //console.log(`❌ HTTP ${response.status} for: ${path}`);
            
        } catch (error) {
            console.log(`❌ Fetch error for ${path}:`, error.message);
        }
    }
    
    return null;
}

/** * SOLUTION 3: XMLHttpRequest (fallback)
 * Uses XMLHttpRequest to load JSON files   
 * Tries multiple paths until one succeeds
 * @param {string} langFile - Name of the language file (e.g., 'es-CO.json')
 * @return {Promise<Object>} - Returns a promise that resolves to the JSON data
 * */
export async function loadLanguageDataXHR(langFile) {
    if (!isBrowser) return null;
    
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const paths = [langFile, `./${langFile}`, `./assets/${langFile}`, `/assets/${langFile}`];
        
        let currentPathIndex = 0;
        
        function tryNextPath() {
            if (currentPathIndex >= paths.length) {
                console.log('❌ All XHR paths failed');
                resolve(null);
                return;
            }
            
            const path = paths[currentPathIndex];
            console.log(`🔍 Trying XHR: ${path}`);
            
            xhr.open('GET', path, true);
            xhr.setRequestHeader('Accept', 'application/json');
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        //console.log(`✅ XHR successful: ${path}`);
                        resolve(data);
                    } catch (parseError) {
                        //console.log(`❌ JSON parse error for ${path}`);
                        currentPathIndex++;
                        tryNextPath();
                    }
                } else {
                    //console.log(`❌ XHR HTTP ${xhr.status} for: ${path}`);
                    currentPathIndex++;
                    tryNextPath();
                }
            };
            
            xhr.onerror = function() {
                //console.log(`❌ XHR network error for: ${path}`);
                currentPathIndex++;
                tryNextPath();
            };
            
            xhr.send();
        }
        
        tryNextPath();
    });
}

/** * SOLUTION 4: Node.js File System (for server-side)
 * Uses Node.js fs module to read JSON files from disk
 * Tries multiple paths until one succeeds
 * @param {string} langFile - Name of the language file (e.g., 'es-CO.json')
 * @return {Promise<Object>} - Returns a promise that resolves to the JSON data
 * */
export async function loadLanguageDataNode(langFile) {
    if (!isNode) return null;
    
    try {
        const { readFileSync, existsSync } = await import('fs');
        const { join, dirname } = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        
        const possiblePaths = [
            join(__dirname, langFile),
            join(__dirname, 'assets', langFile),
            join(__dirname, 'lang', langFile),
            join(__dirname, '..', 'assets', langFile),
            join(process.cwd(), langFile),
            join(process.cwd(), 'assets', langFile),
            join(process.cwd(), 'lang', langFile),
        ];
        
        for (const filePath of possiblePaths) {
            if (existsSync(filePath)) {
                //console.log(`✅ [Node.js] Found: ${filePath}`);
                return JSON.parse(readFileSync(filePath, 'utf8'));
            }
            //console.log(`❌ [Node.js] Not found: ${filePath}`);
        }
        
        //console.log('❌ [Node.js] File not found in any location');
        
    } catch (error) {
        console.error('❌ [Node.js] Error:', error);
    }
    
    return null;
}

/** * Main function to get a message
* Attempts to load the language file and return the corresponding message
* If the message is not found, returns the original key
* @param {string} messageKey - Message key to get
* @param {string|null} lang - Language code (optional, if not provided, use the current one)
* @return {Promise<string>} - Translated message or the original key if not found
* */
export async function getMessage(messageKey, lang = null) {
    try {
        const selectedLang = lang || getLanguage();
        const langFile = getLanguageFile(selectedLang);
        
        //console.log(`🌐 Loading "${messageKey}" for: ${selectedLang}`);
        
        let messages = null;
        
        if (isBrowser) {
            // Intentar métodos en orden de preferencia
            console.log('🔄 Browser environment - trying all methods...');
            
            // Método 1: Dynamic Import (más moderno)
            messages = await loadLanguageDataDynamicImport(selectedLang);
            
            // Método 2: Fetch (más compatible)
            if (!messages) {
                //console.log('🔄 Dynamic import failed, trying fetch...');
                messages = await loadLanguageDataFetch(langFile);
            }
            
            // Método 3: XMLHttpRequest (fallback)
            if (!messages) {
                //console.log('🔄 Fetch failed, trying XHR...');
                messages = await loadLanguageDataXHR(langFile);
            }
            
        } else if (isNode) {
            // Node.js
            //console.log('🔄 Node.js environment...');
            messages = await loadLanguageDataNode(langFile);
        }
        
        if (!messages) {
            // console.error(`❌ Could not load language data for: ${selectedLang}`);
            // console.log(`🔧 TROUBLESHOOTING:`);
            // console.log(`   1. Verify ${langFile} exists in your project`);
            // console.log(`   2. Check file is in same folder as this module`);
            // console.log(`   3. If using a bundler, ensure JSON files are copied to output`);
            // console.log(`   4. Check browser console for CORS errors`);
            // console.log(`   5. Ensure you're serving from HTTP server (not file://)`);
            return messageKey;
        }
        
        const result = messages[messageKey] || messageKey;
        //console.log(`✅ "${messageKey}" → "${result}"`);
        return result;
        
    } catch (error) {
        //console.error('❌ Error in getMessage:', error);
        return messageKey;
    }
}

/** * Function to get multiple messages
* If a string is passed, getMessage is called
* If an array is passed, all messages are fetched
* @param {string|Array<string>} messageKeys - Key or array of keys of the
* messages to fetch
* @param {string|null} lang - Language code (optional, if not provided, the current one is used)
* @return {Promise<Object>} - Object with the keys and their messages
* */
export async function getMessages(messageKeys, lang = null) {
    if (typeof messageKeys === 'string') {
        return await getMessage(messageKeys, lang);
    }
    
    const result = {};
    for (const key of messageKeys) {
        result[key] = await getMessage(key, lang);
    }
    return result;
}

/** * Function to clear the language cache
* Deletes all cached language data  
* Useful for debugging or when language files change
* */
export function clearLanguageCache() {
    Object.keys(languageCache).forEach(key => delete languageCache[key]);
    console.log('🗑️ Cache cleared');
}

/** * Function to diagnose the environment
 * Logs the current environment, URL, and selected language
 * Also checks if fetch and XMLHttpRequest are available
  * @return {Promise<void>} - Returns a promise that resolves when the diagnosis is complete
 * */
export async function diagnoseEnvironment() {
    console.log('🔍 ENVIRONMENT DIAGNOSIS:');
    console.log('Environment:', isNode ? 'Node.js' : isBrowser ? 'Browser' : 'Unknown');
    console.log('Current URL:', isBrowser ? window.location.href : 'N/A');
    console.log('Selected Language:', getLanguage());
    
    if (isBrowser) {
        console.log('Fetch available:', typeof fetch !== 'undefined');
        console.log('XMLHttpRequest available:', typeof XMLHttpRequest !== 'undefined');
        console.log('Protocol:', window.location.protocol);
    }
    
    // Intentar cargar un archivo de prueba
    await getMessage('test', 'es-CO');
}

// Export the language module
// This allows importing the functions in other modules 
// Example: import language from './language_module.mjs';
// or import { getMessage } from './language_module.mjs';
// and using them like: language.getMessage('hello', 'es-CO');
// or getMessage('hello', 'es-CO');
// Exporting the language module
// This allows importing the functions in other modules 
const language = {
    getLanguage,
    getMessage,
    getMessages,
    clearLanguageCache,
    diagnoseEnvironment
};

export default language;
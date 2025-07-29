/**
 * language.js
 * Soluciones para cargar archivos JSON con problemas de CORS
 * REQUIERE archivos JSON externos
 */

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isBrowser = typeof window !== 'undefined';
const languageCache = {};

export function getLanguage() {
    if (isBrowser && window.localStorage) {
        return localStorage.getItem('selectedAppLanguage') || 'en-US';
    }
    return 'en-US';
}

export function getLanguageFile(lang) {
    const map = {
        'es-CO': 'es-CO.json',
        'pt-BR': 'pt-BR.json', 
        'en-US': 'en-US.json',
    };
    return map[lang] || map['en-US'];
}

/**
 * SOLUCIÓN 1: Dynamic Import de JSON (ES2022+)
 * Los navegadores modernos soportan import de JSON
 */
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

/**
 * SOLUCIÓN 2: Fetch con diferentes estrategias de ruta
 */
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

/**
 * SOLUCIÓN 3: XMLHttpRequest (fallback para navegadores antiguos)
 */
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

/**
 * SOLUCIÓN 4: Node.js (funciona siempre)
 */
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

/**
 * FUNCIÓN PRINCIPAL: Intenta todos los métodos en orden
 */
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

/**
 * Versión para múltiples mensajes
 */
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

/**
 * Función para limpiar caché
 */
export function clearLanguageCache() {
    Object.keys(languageCache).forEach(key => delete languageCache[key]);
    console.log('🗑️ Cache cleared');
}

/**
 * Función de diagnóstico
 */
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

// Exportación por defecto
const language = {
    getLanguage,
    getMessage,
    getMessages,
    clearLanguageCache,
    diagnoseEnvironment
};

export default language;
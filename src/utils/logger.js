/**
 * Structured logger for the main process.
 * Adds timestamps, module tags, and log levels for easier debugging.
 *
 * Usage:
 *   const log = require('./utils/logger')('ModuleName');
 *   log.info('Session started');
 *   log.error('Failed to connect', error.message);
 *   log.warn('Key exhausted, falling back');
 *   log.debug('Audio chunk processed', { size: 4096 });
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

// Set via environment: LOG_LEVEL=debug npm start
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'debug'] || 0;

function timestamp() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
}

function createLogger(module) {
    const tag = module ? `[${module}]` : '';

    return {
        debug(...args) {
            if (currentLevel <= LOG_LEVELS.debug) {
                console.log(`${timestamp()} DEBUG ${tag}`, ...args);
            }
        },
        info(...args) {
            if (currentLevel <= LOG_LEVELS.info) {
                console.log(`${timestamp()}  INFO ${tag}`, ...args);
            }
        },
        warn(...args) {
            if (currentLevel <= LOG_LEVELS.warn) {
                console.warn(`${timestamp()}  WARN ${tag}`, ...args);
            }
        },
        error(...args) {
            if (currentLevel <= LOG_LEVELS.error) {
                console.error(`${timestamp()} ERROR ${tag}`, ...args);
            }
        },
    };
}

module.exports = createLogger;

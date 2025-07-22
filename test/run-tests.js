#!/usr/bin/env node

/**
 * Simple test runner for custom profile functionality
 * 
 * This is a basic test runner that doesn't require additional dependencies.
 * In a production environment, you might want to use Jest, Mocha, or another testing framework.
 */

console.log('🧪 Running Custom Profile Tests...\n');

// Simple test framework implementation
let testCount = 0;
let passedCount = 0;
let failedCount = 0;
const failures = [];

global.describe = function(name, fn) {
    console.log(`📁 ${name}`);
    fn();
    console.log('');
};

global.test = function(name, fn) {
    testCount++;
    try {
        fn();
        passedCount++;
        console.log(`  ✅ ${name}`);
    } catch (error) {
        failedCount++;
        failures.push({ name, error });
        console.log(`  ❌ ${name}`);
        console.log(`     ${error.message}`);
    }
};

global.expect = function(actual) {
    return {
        toBe: function(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, but got ${actual}`);
            }
        },
        toEqual: function(expected) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
            }
        },
        toBeTruthy: function() {
            if (!actual) {
                throw new Error(`Expected truthy value, but got ${actual}`);
            }
        },
        toBeFalsy: function() {
            if (actual) {
                throw new Error(`Expected falsy value, but got ${actual}`);
            }
        },
        toBeUndefined: function() {
            if (actual !== undefined) {
                throw new Error(`Expected undefined, but got ${actual}`);
            }
        },
        toBeDefined: function() {
            if (actual === undefined) {
                throw new Error(`Expected defined value, but got undefined`);
            }
        },
        toHaveLength: function(expected) {
            if (!actual || actual.length !== expected) {
                throw new Error(`Expected length ${expected}, but got ${actual ? actual.length : 'undefined'}`);
            }
        },
        toContain: function(expected) {
            if (!actual || !actual.includes(expected)) {
                throw new Error(`Expected to contain "${expected}", but got "${actual}"`);
            }
        },
        toMatch: function(regex) {
            if (!actual || !regex.test(actual)) {
                throw new Error(`Expected "${actual}" to match ${regex}`);
            }
        },
        toBeGreaterThan: function(expected) {
            if (actual <= expected) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toBeLessThan: function(expected) {
            if (actual >= expected) {
                throw new Error(`Expected ${actual} to be less than ${expected}`);
            }
        }
    };
};

global.beforeEach = function(fn) {
    // Simple beforeEach implementation
    // In a real test framework, this would run before each test
    fn();
};

// Mock Array.isArray if not available
if (!Array.isArray) {
    Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}

// Run the tests
try {
    require('./custom-profiles.test.js');
} catch (error) {
    console.error('❌ Error loading test file:', error.message);
    process.exit(1);
}

// Print summary
console.log('📊 Test Summary:');
console.log(`   Total: ${testCount}`);
console.log(`   Passed: ${passedCount}`);
console.log(`   Failed: ${failedCount}`);

if (failedCount > 0) {
    console.log('\n💥 Failures:');
    failures.forEach(({ name, error }) => {
        console.log(`   - ${name}: ${error.message}`);
    });
    process.exit(1);
} else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
}

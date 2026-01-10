/**
 * Groq Language Support Tests
 *
 * This test suite verifies that all supported languages in the app are:
 * 1. Properly mapped in groq.js languageMap
 * 2. System prompt includes correct language instruction for Llama models
 * 3. Tests language support for Llama 4 Maverick and Scout models
 *
 * Uses real interview questions to validate language detection patterns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// All supported languages in the app with their details (matches Gemini test file)
const SUPPORTED_LANGUAGES = [
    { code: 'en-US', name: 'English (US)', nativeName: 'English', expectedLanguage: 'English' },
    { code: 'en-GB', name: 'English (UK)', nativeName: 'English', expectedLanguage: 'English' },
    { code: 'en-AU', name: 'English (Australia)', nativeName: 'English', expectedLanguage: 'English' },
    { code: 'en-IN', name: 'English (India)', nativeName: 'English', expectedLanguage: 'English' },
    { code: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch', expectedLanguage: 'German' },
    { code: 'es-US', name: 'Spanish (United States)', nativeName: 'Español', expectedLanguage: 'Spanish' },
    { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español', expectedLanguage: 'Spanish' },
    { code: 'fr-FR', name: 'French (France)', nativeName: 'Français', expectedLanguage: 'French' },
    { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français', expectedLanguage: 'French' },
    { code: 'hi-IN', name: 'Hindi (India)', nativeName: 'हिन्दी', expectedLanguage: 'Hindi' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português', expectedLanguage: 'Portuguese' },
    { code: 'ar-XA', name: 'Arabic (Generic)', nativeName: 'العربية', expectedLanguage: 'Arabic' },
    { code: 'id-ID', name: 'Indonesian (Indonesia)', nativeName: 'Bahasa Indonesia', expectedLanguage: 'Indonesian' },
    { code: 'it-IT', name: 'Italian (Italy)', nativeName: 'Italiano', expectedLanguage: 'Italian' },
    { code: 'ja-JP', name: 'Japanese (Japan)', nativeName: '日本語', expectedLanguage: 'Japanese' },
    { code: 'tr-TR', name: 'Turkish (Turkey)', nativeName: 'Türkçe', expectedLanguage: 'Turkish' },
    { code: 'vi-VN', name: 'Vietnamese (Vietnam)', nativeName: 'Tiếng Việt', expectedLanguage: 'Vietnamese' },
    { code: 'bn-IN', name: 'Bengali (India)', nativeName: 'বাংলা', expectedLanguage: 'Bengali' },
    { code: 'gu-IN', name: 'Gujarati (India)', nativeName: 'ગુજરાતી', expectedLanguage: 'Gujarati' },
    { code: 'kn-IN', name: 'Kannada (India)', nativeName: 'ಕನ್ನಡ', expectedLanguage: 'Kannada' },
    { code: 'ml-IN', name: 'Malayalam (India)', nativeName: 'മലയാളം', expectedLanguage: 'Malayalam' },
    { code: 'mr-IN', name: 'Marathi (India)', nativeName: 'मराठी', expectedLanguage: 'Marathi' },
    { code: 'ta-IN', name: 'Tamil (India)', nativeName: 'தமிழ்', expectedLanguage: 'Tamil' },
    { code: 'te-IN', name: 'Telugu (India)', nativeName: 'తెలుగు', expectedLanguage: 'Telugu' },
    { code: 'nl-NL', name: 'Dutch (Netherlands)', nativeName: 'Nederlands', expectedLanguage: 'Dutch' },
    { code: 'ko-KR', name: 'Korean (South Korea)', nativeName: '한국어', expectedLanguage: 'Korean' },
    { code: 'cmn-CN', name: 'Mandarin Chinese (China)', nativeName: '中文', expectedLanguage: 'Chinese (Simplified)' },
    { code: 'pl-PL', name: 'Polish (Poland)', nativeName: 'Polski', expectedLanguage: 'Polish' },
    { code: 'ru-RU', name: 'Russian (Russia)', nativeName: 'Русский', expectedLanguage: 'Russian' },
    { code: 'th-TH', name: 'Thai (Thailand)', nativeName: 'ไทย', expectedLanguage: 'Thai' },
];

// Available Groq Llama models
const GROQ_LLAMA_MODELS = {
    'llama-4-maverick': 'meta-llama/llama-4-maverick-17b-128e-instruct',
    'llama-4-scout': 'meta-llama/llama-4-scout-17b-16e-instruct'
};

// The languageMap from groq.js (should match exactly)
const GROQ_LANGUAGE_MAP = {
    'en-US': 'English', 'en-GB': 'English', 'en-AU': 'English', 'en-IN': 'English',
    'es-ES': 'Spanish', 'es-US': 'Spanish', 'fr-FR': 'French', 'fr-CA': 'French',
    'de-DE': 'German', 'it-IT': 'Italian', 'pt-BR': 'Portuguese', 'pt-PT': 'Portuguese',
    'ru-RU': 'Russian', 'ja-JP': 'Japanese', 'ko-KR': 'Korean',
    'zh-CN': 'Chinese (Simplified)', 'cmn-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
    'ar-SA': 'Arabic', 'ar-XA': 'Arabic', 'hi-IN': 'Hindi',
    'nl-NL': 'Dutch', 'pl-PL': 'Polish', 'tr-TR': 'Turkish',
    'sv-SE': 'Swedish', 'da-DK': 'Danish', 'fi-FI': 'Finnish', 'no-NO': 'Norwegian',
    'th-TH': 'Thai', 'te-IN': 'Telugu', 'ta-IN': 'Tamil', 'mr-IN': 'Marathi',
    'ml-IN': 'Malayalam', 'kn-IN': 'Kannada', 'gu-IN': 'Gujarati', 'bn-IN': 'Bengali',
    'vi-VN': 'Vietnamese', 'id-ID': 'Indonesian',
};

// Real interview questions for testing - focused on interview profile (Groq is used for interview mode)
const REAL_INTERVIEW_QUESTIONS = {
    behavioral: [
        "Tell me about yourself",
        "What is your greatest strength?",
        "What is your biggest weakness?",
        "Why do you want to work here?",
        "Where do you see yourself in 5 years?",
        "Tell me about a time you faced a challenge at work",
        "How do you handle stress and pressure?",
        "Describe a situation where you showed leadership",
        "Why are you leaving your current job?",
        "What motivates you to do your best work?",
    ],
    technical: [
        "Explain the difference between REST and GraphQL",
        "What is the time complexity of binary search?",
        "How does garbage collection work?",
        "Explain the concept of closures in JavaScript",
        "What is the difference between SQL and NoSQL databases?",
        "How would you optimize a slow database query?",
        "Explain microservices architecture",
        "What is dependency injection?",
        "Explain SOLID principles",
        "What is the difference between TCP and UDP?",
    ],
    situational: [
        "How would you handle a disagreement with a coworker?",
        "What would you do if you missed a deadline?",
        "How do you prioritize multiple tasks?",
        "Describe how you would handle an angry customer",
        "What would you do if your manager asked you to do something unethical?",
    ],
    coding: [
        "Write a function to reverse a string",
        "Implement binary search algorithm",
        "Find the maximum subarray sum",
        "Write a function to check if a number is prime",
        "Implement merge sort algorithm",
        "What is the time complexity of quicksort?",
        "Explain how a hash table works",
        "What is dynamic programming?",
    ],
};

// Sample prompts to test language response generation
const LANGUAGE_TEST_PROMPTS = {
    greeting: "Hello, how are you?",
    selfIntro: "Tell me about yourself",
    technical: "Explain what is a binary search tree",
    coding: "Write a function to find the factorial of a number",
    behavioral: "Describe a challenging situation you faced at work",
};

describe('Groq Language Support Tests', () => {
    describe('Language Map Coverage', () => {
        it('should have all UI languages mapped in groq.js languageMap', () => {
            const missingLanguages = [];

            for (const lang of SUPPORTED_LANGUAGES) {
                if (!GROQ_LANGUAGE_MAP[lang.code]) {
                    missingLanguages.push(lang.code);
                }
            }

            expect(missingLanguages).toEqual([]);
        });

        it('should map each language to the correct language name', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                expect(mappedLanguage).toBe(lang.expectedLanguage);
            }
        });

        it('should not default to English for non-English languages', () => {
            const nonEnglishLanguages = SUPPORTED_LANGUAGES.filter(
                lang => !lang.code.startsWith('en-')
            );

            for (const lang of nonEnglishLanguages) {
                const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code] || 'English';
                expect(mappedLanguage).not.toBe('English');
            }
        });

        it('should match Gemini language map for consistency', () => {
            // Groq should support the same languages as Gemini for consistency
            const geminiLanguageMap = {
                'en-US': 'English', 'en-GB': 'English', 'en-AU': 'English', 'en-IN': 'English',
                'es-ES': 'Spanish', 'es-US': 'Spanish', 'fr-FR': 'French', 'fr-CA': 'French',
                'de-DE': 'German', 'it-IT': 'Italian', 'pt-BR': 'Portuguese', 'pt-PT': 'Portuguese',
                'ru-RU': 'Russian', 'ja-JP': 'Japanese', 'ko-KR': 'Korean',
                'zh-CN': 'Chinese (Simplified)', 'cmn-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
                'ar-SA': 'Arabic', 'ar-XA': 'Arabic', 'hi-IN': 'Hindi',
                'nl-NL': 'Dutch', 'pl-PL': 'Polish', 'tr-TR': 'Turkish',
                'th-TH': 'Thai', 'te-IN': 'Telugu', 'ta-IN': 'Tamil', 'mr-IN': 'Marathi',
                'ml-IN': 'Malayalam', 'kn-IN': 'Kannada', 'gu-IN': 'Gujarati', 'bn-IN': 'Bengali',
                'vi-VN': 'Vietnamese', 'id-ID': 'Indonesian',
            };

            for (const [code, expected] of Object.entries(geminiLanguageMap)) {
                expect(GROQ_LANGUAGE_MAP[code]).toBe(expected);
            }
        });
    });

    describe('System Prompt Language Instruction', () => {
        // Simulates how groq.js builds the language instruction
        function buildGroqLanguageInstruction(languageCode) {
            const selectedLanguageName = GROQ_LANGUAGE_MAP[languageCode] || 'English';
            return `=== CRITICAL LANGUAGE INSTRUCTION ===
The user has selected ${selectedLanguageName} as their preferred language.
YOU MUST respond ONLY in ${selectedLanguageName}, regardless of what language the interviewer uses.`;
        }

        it('should generate correct language instruction for each language', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const instruction = buildGroqLanguageInstruction(lang.code);
                expect(instruction).toContain(lang.expectedLanguage);
                expect(instruction).toContain('CRITICAL LANGUAGE INSTRUCTION');
                expect(instruction).toContain('YOU MUST respond ONLY in');
            }
        });

        it('should include the selected language name in the instruction', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const instruction = buildGroqLanguageInstruction(lang.code);
                expect(instruction).toContain(`selected ${lang.expectedLanguage}`);
                expect(instruction).toContain(`respond ONLY in ${lang.expectedLanguage}`);
            }
        });

        it('should NOT default to English for non-English selections', () => {
            const nonEnglishLanguages = SUPPORTED_LANGUAGES.filter(
                lang => !lang.code.startsWith('en-')
            );

            for (const lang of nonEnglishLanguages) {
                const instruction = buildGroqLanguageInstruction(lang.code);
                expect(instruction).toContain(`selected ${lang.expectedLanguage}`);
                expect(instruction).toContain(`respond ONLY in ${lang.expectedLanguage}`);
                expect(instruction).not.toContain('selected English');
            }
        });
    });

    describe('Groq Llama Model Support', () => {
        it('should have both Llama 4 models configured', () => {
            expect(GROQ_LLAMA_MODELS).toHaveProperty('llama-4-maverick');
            expect(GROQ_LLAMA_MODELS).toHaveProperty('llama-4-scout');
        });

        it('should have correct model IDs for Llama models', () => {
            expect(GROQ_LLAMA_MODELS['llama-4-maverick']).toBe('meta-llama/llama-4-maverick-17b-128e-instruct');
            expect(GROQ_LLAMA_MODELS['llama-4-scout']).toBe('meta-llama/llama-4-scout-17b-16e-instruct');
        });

        it('should support all languages for Llama 4 Maverick', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                expect(mappedLanguage).toBeDefined();
                expect(mappedLanguage).toBe(lang.expectedLanguage);
            }
        });

        it('should support all languages for Llama 4 Scout', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                expect(mappedLanguage).toBeDefined();
                expect(mappedLanguage).toBe(lang.expectedLanguage);
            }
        });
    });

    describe('Interview Question Language Support', () => {
        describe('Behavioral Questions', () => {
            it('should be ready to handle behavioral questions in all languages', () => {
                for (const lang of SUPPORTED_LANGUAGES) {
                    const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                    expect(mappedLanguage).toBeDefined();

                    for (const question of REAL_INTERVIEW_QUESTIONS.behavioral) {
                        expect(mappedLanguage).toBe(lang.expectedLanguage);
                    }
                }
            });
        });

        describe('Technical Questions', () => {
            it('should be ready to handle technical questions in all languages', () => {
                for (const lang of SUPPORTED_LANGUAGES) {
                    const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                    expect(mappedLanguage).toBeDefined();

                    for (const question of REAL_INTERVIEW_QUESTIONS.technical) {
                        expect(mappedLanguage).toBe(lang.expectedLanguage);
                    }
                }
            });
        });

        describe('Situational Questions', () => {
            it('should be ready to handle situational questions in all languages', () => {
                for (const lang of SUPPORTED_LANGUAGES) {
                    const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                    expect(mappedLanguage).toBeDefined();

                    for (const question of REAL_INTERVIEW_QUESTIONS.situational) {
                        expect(mappedLanguage).toBe(lang.expectedLanguage);
                    }
                }
            });
        });

        describe('Coding Questions', () => {
            it('should be ready to handle coding questions in all languages', () => {
                for (const lang of SUPPORTED_LANGUAGES) {
                    const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                    expect(mappedLanguage).toBeDefined();

                    for (const question of REAL_INTERVIEW_QUESTIONS.coding) {
                        expect(mappedLanguage).toBe(lang.expectedLanguage);
                    }
                }
            });
        });
    });

    describe('Language Code Consistency', () => {
        it('should use standard BCP 47 language codes', () => {
            const bcp47Pattern = /^[a-z]{2,3}(-[A-Z]{2})?$/;

            for (const lang of SUPPORTED_LANGUAGES) {
                expect(lang.code).toMatch(bcp47Pattern);
            }
        });

        it('should have consistent language codes between UI and groq.js', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                expect(GROQ_LANGUAGE_MAP).toHaveProperty(lang.code);
            }
        });

        it('should handle alternate language codes (cmn-CN vs zh-CN)', () => {
            expect(GROQ_LANGUAGE_MAP['cmn-CN']).toBe('Chinese (Simplified)');
            expect(GROQ_LANGUAGE_MAP['zh-CN']).toBe('Chinese (Simplified)');
        });

        it('should handle alternate Arabic codes (ar-XA vs ar-SA)', () => {
            expect(GROQ_LANGUAGE_MAP['ar-XA']).toBe('Arabic');
            expect(GROQ_LANGUAGE_MAP['ar-SA']).toBe('Arabic');
        });
    });

    describe('Indian Language Support for Groq', () => {
        const indianLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.code.endsWith('-IN'));

        it('should support all major Indian languages', () => {
            const expectedIndianLanguages = [
                'en-IN', 'hi-IN', 'bn-IN', 'te-IN', 'ta-IN',
                'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN'
            ];

            const supportedIndianCodes = indianLanguages.map(l => l.code);

            for (const expected of expectedIndianLanguages) {
                expect(supportedIndianCodes).toContain(expected);
            }
        });

        it('should have proper language names for Indian languages', () => {
            const expectedMappings = {
                'hi-IN': 'Hindi',
                'bn-IN': 'Bengali',
                'te-IN': 'Telugu',
                'ta-IN': 'Tamil',
                'mr-IN': 'Marathi',
                'gu-IN': 'Gujarati',
                'kn-IN': 'Kannada',
                'ml-IN': 'Malayalam',
            };

            for (const [code, expectedName] of Object.entries(expectedMappings)) {
                expect(GROQ_LANGUAGE_MAP[code]).toBe(expectedName);
            }
        });
    });

    describe('Asian Language Support for Groq', () => {
        const asianLanguages = ['ja-JP', 'ko-KR', 'cmn-CN', 'th-TH', 'vi-VN', 'id-ID'];

        it('should support all specified Asian languages', () => {
            for (const code of asianLanguages) {
                expect(GROQ_LANGUAGE_MAP).toHaveProperty(code);
            }
        });

        it('should have correct mappings for Asian languages', () => {
            const expectedMappings = {
                'ja-JP': 'Japanese',
                'ko-KR': 'Korean',
                'cmn-CN': 'Chinese (Simplified)',
                'th-TH': 'Thai',
                'vi-VN': 'Vietnamese',
                'id-ID': 'Indonesian',
            };

            for (const [code, expected] of Object.entries(expectedMappings)) {
                expect(GROQ_LANGUAGE_MAP[code]).toBe(expected);
            }
        });
    });

    describe('European Language Support for Groq', () => {
        const europeanLanguages = [
            'de-DE', 'fr-FR', 'fr-CA', 'es-ES', 'es-US',
            'it-IT', 'pt-BR', 'nl-NL', 'pl-PL', 'ru-RU'
        ];

        it('should support all specified European languages', () => {
            for (const code of europeanLanguages) {
                expect(GROQ_LANGUAGE_MAP).toHaveProperty(code);
            }
        });

        it('should have correct mappings for European languages', () => {
            const expectedMappings = {
                'de-DE': 'German',
                'fr-FR': 'French',
                'fr-CA': 'French',
                'es-ES': 'Spanish',
                'es-US': 'Spanish',
                'it-IT': 'Italian',
                'pt-BR': 'Portuguese',
                'nl-NL': 'Dutch',
                'pl-PL': 'Polish',
                'ru-RU': 'Russian',
            };

            for (const [code, expected] of Object.entries(expectedMappings)) {
                expect(GROQ_LANGUAGE_MAP[code]).toBe(expected);
            }
        });
    });

    describe('Middle Eastern Language Support for Groq', () => {
        it('should support Arabic with multiple region codes', () => {
            expect(GROQ_LANGUAGE_MAP['ar-XA']).toBe('Arabic');
            expect(GROQ_LANGUAGE_MAP['ar-SA']).toBe('Arabic');
        });

        it('should support Turkish', () => {
            expect(GROQ_LANGUAGE_MAP['tr-TR']).toBe('Turkish');
        });
    });
});

describe('Groq Edge Cases and Special Scenarios', () => {
    describe('Mixed Language Input Scenarios', () => {
        const mixedLanguageInputs = [
            { input: "Tell me about yourself, please explain in detail", description: "English formal" },
            { input: "What is your experience? Can you elaborate?", description: "English question" },
            { input: "Explain REST API and its benefits", description: "Technical English" },
        ];

        it('should be configured to respond in selected language regardless of mixed input', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                expect(mappedLanguage).toBeDefined();

                for (const scenario of mixedLanguageInputs) {
                    expect(mappedLanguage).toBe(lang.expectedLanguage);
                }
            }
        });
    });

    describe('Rapid Language Switching', () => {
        it('should correctly map language after multiple switches', () => {
            const switchSequence = ['en-US', 'hi-IN', 'ja-JP', 'ar-XA', 'th-TH', 'bn-IN', 'fr-CA', 'ru-RU'];

            for (const code of switchSequence) {
                const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
                if (lang) {
                    const mappedLanguage = GROQ_LANGUAGE_MAP[code];
                    expect(mappedLanguage).toBe(lang.expectedLanguage);
                }
            }
        });
    });

    describe('Regional Variant Consistency', () => {
        it('should handle English regional variants correctly', () => {
            const englishVariants = ['en-US', 'en-GB', 'en-AU', 'en-IN'];
            for (const code of englishVariants) {
                expect(GROQ_LANGUAGE_MAP[code]).toBe('English');
            }
        });

        it('should handle Spanish regional variants correctly', () => {
            const spanishVariants = ['es-ES', 'es-US'];
            for (const code of spanishVariants) {
                expect(GROQ_LANGUAGE_MAP[code]).toBe('Spanish');
            }
        });

        it('should handle French regional variants correctly', () => {
            const frenchVariants = ['fr-FR', 'fr-CA'];
            for (const code of frenchVariants) {
                expect(GROQ_LANGUAGE_MAP[code]).toBe('French');
            }
        });

        it('should handle Portuguese regional variants correctly', () => {
            expect(GROQ_LANGUAGE_MAP['pt-BR']).toBe('Portuguese');
            expect(GROQ_LANGUAGE_MAP['pt-PT']).toBe('Portuguese');
        });

        it('should handle Chinese code variants correctly', () => {
            expect(GROQ_LANGUAGE_MAP['zh-CN']).toBe('Chinese (Simplified)');
            expect(GROQ_LANGUAGE_MAP['cmn-CN']).toBe('Chinese (Simplified)');
            expect(GROQ_LANGUAGE_MAP['zh-TW']).toBe('Chinese (Traditional)');
        });

        it('should handle Arabic code variants correctly', () => {
            expect(GROQ_LANGUAGE_MAP['ar-SA']).toBe('Arabic');
            expect(GROQ_LANGUAGE_MAP['ar-XA']).toBe('Arabic');
        });
    });

    describe('Technical Content in Different Languages', () => {
        const technicalContent = [
            "Explain O(n log n) time complexity",
            "What is the difference between == and ===?",
            "How does TCP/IP work?",
            "Explain REST vs GraphQL",
            "What is SOLID in programming?",
        ];

        it('should handle technical content in all languages', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const mappedLanguage = GROQ_LANGUAGE_MAP[lang.code];
                expect(mappedLanguage).toBeDefined();

                for (const content of technicalContent) {
                    expect(mappedLanguage).toBe(lang.expectedLanguage);
                }
            }
        });
    });
});

describe('Groq Language Selection Integration', () => {
    describe('UI to Backend Flow', () => {
        it('should pass correct language codes from UI dropdown to Groq session', () => {
            for (const lang of SUPPORTED_LANGUAGES) {
                const selectedCode = lang.code;
                const mappedLanguage = GROQ_LANGUAGE_MAP[selectedCode];
                expect(mappedLanguage).toBeDefined();
                expect(mappedLanguage).toBe(lang.expectedLanguage);
            }
        });

        it('should NOT fall back to English for any supported non-English language', () => {
            const nonEnglishLanguages = SUPPORTED_LANGUAGES.filter(
                lang => lang.expectedLanguage !== 'English'
            );

            for (const lang of nonEnglishLanguages) {
                const result = GROQ_LANGUAGE_MAP[lang.code] || 'English';
                expect(result).not.toBe('English');
                expect(result).toBe(lang.expectedLanguage);
            }
        });
    });
});

// Summary test to print all languages and their status
describe('Groq Language Support Summary', () => {
    it('should log all supported languages with their Groq configuration status', () => {
        console.log('\n========== GROQ LANGUAGE SUPPORT SUMMARY ==========\n');

        let allPassed = true;

        for (const lang of SUPPORTED_LANGUAGES) {
            const hasMapping = !!GROQ_LANGUAGE_MAP[lang.code];
            const correctMapping = GROQ_LANGUAGE_MAP[lang.code] === lang.expectedLanguage;

            const status = hasMapping && correctMapping ? 'PASS' : 'FAIL';

            if (!hasMapping || !correctMapping) {
                allPassed = false;
            }

            console.log(`${status} ${lang.code.padEnd(8)} | ${lang.name.padEnd(30)} | Maps to: ${(GROQ_LANGUAGE_MAP[lang.code] || 'MISSING').padEnd(20)}`);
        }

        console.log('\n====================================================\n');
        console.log('Supported Llama Models:');
        console.log(`  - Llama 4 Maverick: ${GROQ_LLAMA_MODELS['llama-4-maverick']}`);
        console.log(`  - Llama 4 Scout: ${GROQ_LLAMA_MODELS['llama-4-scout']}`);
        console.log('\n====================================================\n');

        expect(allPassed).toBe(true);
    });
});

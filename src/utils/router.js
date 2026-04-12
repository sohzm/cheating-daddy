// Smart Model Router - Route queries based on complexity
// Fast models: Groq/Llama (50-150ms TTFT)
// Complex models: GPT-4/Claude (200-400ms TTFT, better reasoning)

const SIMPLE_KEYWORDS = [
    'what', 'when', 'where', 'who', 'how', 'is', 'are', 'was', 'were',
    'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should',
    'tell', 'explain', 'define', 'describe', 'list', 'name', 'give',
    'hi', 'hello', 'hey', 'thanks', 'thank'
];

const COMPLEX_KEYWORDS = [
    'why', 'because', 'design', 'architecture', 'system', 'optimize',
    'compare', 'difference', 'between', 'tradeoff', 'advantages',
    'disadvantages', 'implement', 'debug', 'fix', 'complex', 'algorithm',
    'code', 'function', 'class', 'api', 'database', 'performance',
    'scalability', 'security', 'authentication', 'authorization'
];

const TECHNICAL_PATTERNS = [
    /\b\d+\s*=\s*\d+/,           // variable assignment
    /\bfunction\s+\w+/,          // function definition
    /\bclass\s+\w+/,             // class definition
    /\bimport\s+from/,            // import statement
    /\bexport\s+(default\s+)?/,  // export statement
    /\bif\s*\(/,                  // if statement
    /\bfor\s*\(/,                 // for loop
    /\bwhile\s*\(/,               // while loop
    /\breturn\s+/,                // return statement
    /\basync\s+/,                 // async keyword
    /\bawait\s+/,                 // await keyword
    /\binterface\s+/,             // interface (TypeScript)
    /\btype\s+\w+\s*=/,           // type alias
    /\bconsole\.(log|error)/,     // console methods
    /\bJSON\.(stringify|parse)/,  // JSON methods
    /\bArray\.(map|filter|reduce)/, // array methods
    /\bPromise/,                  // Promise
    /=>\s*{/,                     // arrow function
    /\(\s*\)\s*=>/,              // arrow function shorthand
    /\btry\s*{/,                  // try block
    /\bcatch\s*\(/,               // catch block
    /\bswitch\s*\(/,              // switch statement
    /\bcase\s+/,                  // case statement
];

function analyzeQueryComplexity(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    let simpleScore = 0;
    let complexScore = 0;
    
    // Check for simple keywords
    for (const word of words) {
        if (SIMPLE_KEYWORDS.includes(word)) {
            simpleScore += 1;
        }
    }
    
    // Check for complex keywords
    for (const word of words) {
        if (COMPLEX_KEYWORDS.includes(word)) {
            complexScore += 2;
        }
    }
    
    // Check for technical patterns (indicates coding question)
    for (const pattern of TECHNICAL_PATTERNS) {
        if (pattern.test(text)) {
            complexScore += 3;
        }
    }
    
    // Check question length - longer questions tend to be more complex
    const wordCount = words.length;
    if (wordCount < 10) {
        simpleScore += 1;
    } else if (wordCount > 25) {
        complexScore += 2;
    }
    
    // Check for multiple question marks (multiple sub-questions)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 1) {
        complexScore += questionCount;
    }
    
    console.log('[Router] Complexity analysis:', { text: text.substring(0, 30) + '...', simpleScore, complexScore });
    
    return { simpleScore, complexScore };
}

function shouldUseFastModel(text) {
    const { simpleScore, complexScore } = analyzeQueryComplexity(text);
    
    // Use fast model if simple score > complex score or complex score is low
    const useFast = simpleScore > complexScore || complexScore < 3;
    
    console.log('[Router] Using fast model:', useFast, '(simple:', simpleScore, 'complex:', complexScore, ')');
    return useFast;
}

module.exports = {
    analyzeQueryComplexity,
    shouldUseFastModel,
    SIMPLE_KEYWORDS,
    COMPLEX_KEYWORDS,
    TECHNICAL_PATTERNS
};
const cheerio = require('cheerio');
const similarity = require('string-similarity');
const fs = require('fs');

// make a list in the Oxford comma style (eg "a, b, c, and d")
// Examples with conjunction "and":
// ["a"] -> "a"
// ["a", "b"] -> "a and b"
// ["a", "b", "c"] -> "a, b, and c"
const list = (arr, conjunction, ifempty) => {
    let l = arr.length;
    if (!l) return ifempty;
    if (l < 2) return arr[0];
    if (l < 3) return arr.join(` ${conjunction} `);
    arr = arr.slice();
    arr[l - 1] = `${conjunction} ${arr[l - 1]}`;
    return arr.join(", ");
}

// "a, b, c, and 5 others"
const abbrList = (arr, conjunction, ifempty, max) => {
    let arr2 = arr;

    if (arr.length - max > 1) {
        arr2 = arr.slice(0, max);
        arr2.push(`${arr.length - max} others`);
    }

    return list(arr2, conjunction, ifempty);
}

// Shuffle an array
const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Returns text from html
const clean = html => cheerio.load(html).text();

// Determines whether utterance means "yes" or "no"
// Returns true or false
const isYes = utterance => {
    const yesValues = [
        'yes', 'sure', 'yes please', 'of course', 'continue', 'go ahead',
        'do it', 'ok', 'sounds good', 'alright', 'certainly', 'definitely',
        'absolutely', 'indeed', 'fine', 'obviously', 'yea', 'yeah', 'uh huh',
        'you bet', 'okie dokie', 'okay', 'totally', 'yes sir', 'by all means',
        'ye', 'shore', 'totes', 'yup', 'yep', 'please', 'carry on', 'proceed'
    ];
    const noValues = [
        'no', 'not', 'nevermind', 'don\'t', 'nope', 'nah', 'i\'m good', 'it\'s okay',
        'that\'s fine', 'stop', 'cancel', 'exit', 'quit', 'dismiss', 'halt', 'disengage',
        'negative', 'negatory', 'nevermind', 'scratch'
    ];

    utterance = utterance.toLowerCase().replace('-', ' ').replace(',', '');
    
    for (const no of noValues) {
        if(utterance === no || utterance.includes(no)) {
            return false;
        }
    }

    for(const yes of yesValues) {
        if(utterance === yes || utterance.includes(yes) || similarity.compareTwoStrings(utterance, yes) > 0.7){
            return true;
        }
    }

    return false;
}

// override an existing .env value
const setEnv = (name, value) => {
    let envText = fs.readFileSync('.env', 'utf-8');
    let currentValue = process.env[name];
    let newEnv = envText.replace(`${name}=${currentValue}`, `${name}=${value}`);

    fs.writeFileSync('.env', newEnv);

    process.env[name] = value;
}

module.exports = { list, shuffle, clean, isYes, setEnv, abbrList }
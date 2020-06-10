const cheerio = require('cheerio');

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

module.exports = { list, shuffle, clean }
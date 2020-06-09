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

module.exports = { list }
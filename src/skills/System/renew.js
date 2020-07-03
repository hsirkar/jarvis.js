const { log, isYes } = require('../../util');
const similarity = require('string-similarity');
const fs = require('fs');
const path = require('path');

module.exports = (res, resolve, ask) => {
    const products = ['Photoshop', 'Illustrator', 'Premiere Pro'];

    let target = res.utterance.toLowerCase();
    ['renew', 'trial', 'reset', 'new', 'the', 'my'].forEach(c => target = target.replace(c, '').trim());

    var matches = similarity.findBestMatch(target, products.map(p => p.toLowerCase()));

    if (matches.bestMatch.rating < 0.7) {
        resolve(`No product named ${target} found. You can choose from ${list(products, 'and', '')}`);
        return;
    }

    var index = matches.bestMatchIndex;
    log(`Target product: ${products[index]} (${matches.bestMatch.rating})`);

    ask(`Should I renew ${products[index]}?`, answer => {
        if (isYes(answer)) {
            const variable = products[index].replace('Pro', '').trim().toUpperCase();
            const filePath = process.env[variable];

            if (filePath) {
                const xml = fs.readFileSync(path.join(filePath, 'application.xml'));
                const oldTsn = require('cheerio').load(xml, { xmlMode: true })('Data[key=TrialSerialNumber]').text();
                const newTsn = BigInt(oldTsn) + 1n;

                log(`Changing TSN from ${oldTsn} to ${newTsn}...`);

                const newXml = xml.toString().replace(oldTsn, newTsn);

                fs.writeFileSync(path.join(filePath, 'application.xml'), newXml);
                resolve('Successfully completed');
            } else {
                resolve(`Path to ${products[index]} not set`);
            }

        } else {
            resolve('OK, cancelled');
        }
    });
}
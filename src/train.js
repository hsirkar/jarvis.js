const fs = require('fs');

module.exports = async function trainnlp(nlp) {
    if (fs.existsSync('./model.nlp')) {
        nlp.load('./model.nlp');
        return;
    }
    await nlp.addCorpus('./src/corpus.json');

    const hrstart = process.hrtime();
    await nlp.train();
    const hrend = process.hrtime(hrstart);
    console.info('Trained (hr): %ds %dms', hrend[0], hrend[1] / 1000000);

    nlp.save();
};
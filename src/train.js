const fs = require('fs');

module.exports = async function trainnlp(nlp, skills) {
    // Load previously trained model
    if (fs.existsSync('./cache/model.nlp')) {
        nlp.load('./cache/model.nlp');
        return;
    }

    // Combine individual corpuses into one large master corpus object
    data = [];
    skills.forEach(skill => {
        if(!fs.existsSync(`./skills/${skill.name}.json`))
            return [];

        corpus = fs.readFileSync(`./skills/${skill.name}.json`);
        arr = JSON.parse(corpus);
        data = data.concat(arr);
    });

    // Save master corpus object into disk cache
    if(!fs.existsSync('./cache'))
        fs.mkdirSync('./cache');

    fs.writeFileSync('./cache/corpus.json', JSON.stringify({
        name: 'corpus',
        locale: 'en-US',
        data: data }));

    // Load from disk cache
    await nlp.addCorpus('./cache/corpus.json');

    // Train and save
    const hrstart = process.hrtime();
    await nlp.train();
    const hrend = process.hrtime(hrstart);
    console.info('Trained (hr): %ds %dms', hrend[0], hrend[1] / 1000000);

    nlp.save('./cache/model.nlp', true);
};
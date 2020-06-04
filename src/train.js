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
        if(!fs.existsSync(`./corpus/${skill.name}.json`))
            return [];

        corpus = fs.readFileSync(`./corpus/${skill.name}.json`);
        arr = JSON.parse(corpus);
        data = data.concat(arr);
    });

    // Add data to NLP
    data.forEach(item => {
        item.utterances && item.utterances.forEach(utterance => {
            nlp.addDocument('en', utterance, item.intent);
        });
        item.answers && item.answers.forEach(answer => {
            nlp.addAnswer('en', item.intent, answer);
        });
    });

    // Train and save
    const hrstart = process.hrtime();
    await nlp.train();
    const hrend = process.hrtime(hrstart);
    console.info('Trained (hr): %ds %dms', hrend[0], hrend[1] / 1000000);
    console.log('\n');

    nlp.save('./cache/model.nlp', true);
};
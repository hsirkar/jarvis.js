const { NlpManager } = require('node-nlp');
const fs = require('fs');
const skills = require('./skills');
const { log } = require('./util');

const nlp = {
    init: async () => {
        nlp.manager = new NlpManager({
            languages: ['en'],
            nlu: {
                log: message => log(JSON.stringify(message)),
            },
            modelFileName: './cache/model.nlp'
        });

        for(skill of skills){
            skill.addEntities && skill.addEntities(nlp.manager);
        }

        // Load previously trained model
        if (fs.existsSync('./cache/model.nlp')) {
            nlp.manager.load('./cache/model.nlp');
            return;
        }

        // Combine individual corpuses into one large master corpus object
        data = [];
        skills.forEach(skill => {
            if (!fs.existsSync(`./corpus/${skill.name}.json`))
                return [];

            corpus = fs.readFileSync(`./corpus/${skill.name}.json`);
            arr = JSON.parse(corpus);
            data = data.concat(arr);
        });

        // Add data to NLP
        data.forEach(item => {
            item.utterances && item.utterances.forEach(utterance => {
                nlp.manager.addDocument('en', utterance, item.intent);
            });
            item.answers && item.answers.forEach(answer => {
                nlp.manager.addAnswer('en', item.intent, answer);
            });
        });

        // Train and save
        const hrstart = process.hrtime();
        await nlp.manager.train();
        const hrend = process.hrtime(hrstart);
        log(`Trained (hr): ${hrend[0]}s ${hrend[1] / 1000000}ms`);

        nlp.manager.save('./cache/model.nlp', true);
    }
}

module.exports = nlp;
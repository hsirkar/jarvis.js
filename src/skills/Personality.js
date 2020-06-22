const { randomElements } = require('../util');

const Personality = {
    name: 'Personality',
    init: () => {},
    doesHandleIntent: intentName => {
        for(let domain of ['user', 'agent', 'greetings', 'appraisal', 'dialog', 'misc'])
            if(intentName.startsWith(domain))
                return true;

        return false;
    },
    handleIntent: res => new Promise(resolve => {
        if(res.intent.includes('sample'))
            resolve(`Here are some things you can say: ${randomElements(res.answers.map(a => a.answer), 4).join('; ')}`)
        else
            resolve(res.answer.replace('%utterance%', res.utterance));
    })
};

module.exports = Personality;
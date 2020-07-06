const { randomElements, log } = require('../util');
const corpus = require('../corpus/Personality.json');

const Personality = {
    name: 'Personality',
    init: () => {},
    doesHandleIntent: intentName => {
        for(let domain of ['user', 'agent', 'greetings', 'appraisal', 'dialog', 'misc'])
            if(intentName.startsWith(domain))
                return true;

        return false;
    },
    handleIntent: async res => {
        if(res.intent.includes('sample')) {
            let answers = corpus.find(elem => elem.intent === res.intent).answers;
            let random = randomElements(answers, 4);
            return ({
                text: `Here are some things you can say: ${random.join('; ')}`,
                listTitle: 'Here are some things you can say:',
                list: random.map(r => ({ displayText: r }))
            });
        }

        return res.answer.replace('%utterance%', res.utterance);
    }
};

module.exports = Personality;
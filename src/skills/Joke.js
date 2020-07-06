const { isYes, log } = require('../util');

const Joke = {
    name: 'Joke',
    init: params => Object.assign(this, params),
    doesHandleIntent: intentName => intentName.startsWith('joke'),
    handleIntent: async res => {
        if(res.intent.includes('dirty')) {
            let answer = await this.ask(['Are you sure?', 'You sure about that?', 'Do you really want me to?']);
            if(isYes(answer))
                return res.answer;
            else
                return ['Alright', 'OK'];
        }
        return res.answer;
    },
};

module.exports = Joke;
const { isYes, log } = require('../util');

const Joke = {
    name: 'Joke',
    init: params => Object.assign(this, params),
    doesHandleIntent: intentName => intentName.startsWith('joke'),
    handleIntent: res => new Promise(resolve => {
        if(res.intent.includes('dirty')) {
            this.ask(['Are you sure?', 'You sure about that?', 'Do you really want me to?'], answer => {
                if(isYes(answer))
                    resolve(res.answer);
                else
                    resolve(['Alright', 'OK']);
            });
            return;
        }
        resolve(res.answer);
    })
};

module.exports = Joke;
const { isYes } = require('../src/util');

const Joke = {
    name: 'Joke',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;
    },
    doesHandleIntent: intentName => intentName.startsWith('joke'),
    handleIntent: res => new Promise(resolve => {
        const { ask } = this;
        if(res.intent.includes('dirty')) {
            ask(['Are you sure?', 'You sure about that?', 'Do you really want me to?'], answer => {
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
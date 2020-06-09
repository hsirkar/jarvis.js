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
            ask(['Are you sure?', 'You sure about that?', 'Do you really want me to?'], input => {
                resolve(res.answer);
            });
            return;
        }
        resolve(res.answer);
    })
};

module.exports = Joke;
const Joke = {
    name: 'Joke',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;
    },
    doesHandleIntent: intentName => intentName.startsWith('joke'),
    handleIntent: res => {
        const { respond, ask } = this;
        if(res.intent.includes('dirty')) {
            ask(['Are you sure?', 'You sure about that?', 'Do you really want me to?'], input => {
                respond(res.answer);
            });
            return;
        }
        respond(res.answer);
    }
};

module.exports = Joke;
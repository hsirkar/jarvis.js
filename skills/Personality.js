const Personality = {
    name: 'Personality',
    init: (log, respond, ask) => {
        this.log = log;
        this.respond = respond;
        this.ask = ask;
    },
    doesHandleIntent: intentName => {
        for(let domain of ['user', 'agent', 'greetings', 'appraisal', 'dialog'])
            if(intentName.startsWith(domain))
                return true;

        return false;
    },
    handleIntent: res => {
        this.ask('are you sure?', input => {
            this.respond(res.answer);
        });
    }
};

module.exports = Personality;
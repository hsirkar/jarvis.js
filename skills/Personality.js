const Personality = {
    name: 'Personality',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;
    },
    doesHandleIntent: intentName => {
        for(let domain of ['user', 'agent', 'greetings', 'appraisal', 'dialog'])
            if(intentName.startsWith(domain))
                return true;

        return false;
    },
    handleIntent: res => {
        this.respond(res.answer);
    }
};

module.exports = Personality;
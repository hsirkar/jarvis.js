const Personality = {
    name: 'Personality',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;
    },
    doesHandleIntent: intentName => {
        for(let domain of ['user', 'agent', 'greetings', 'appraisal', 'dialog'])
            if(intentName.startsWith(domain))
                return true;

        return false;
    },
    handleIntent: res => new Promise(resolve => {
        resolve(res.answer);
    })
};

module.exports = Personality;
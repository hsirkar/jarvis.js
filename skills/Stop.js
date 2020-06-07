const Stop = {
    name: 'Stop',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;
    },
    doesHandleIntent: intentName => intentName.startsWith('stop'),
    handleIntent: res => {
        const { respond, ask } = this;
        respond(res.answer);
    }
};

module.exports = Stop;
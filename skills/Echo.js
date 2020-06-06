const Echo = {
    name: 'Echo',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;
    },
    override: res => {
        if(res.utterance.startsWith('echo ')){
            const newRes = { intent: 'echo.echo', score: 1 };
            Object.assign(res, newRes);
            this.log(`Overriden by Echo: ${JSON.stringify(newRes)}`);
        }
    },
    doesHandleIntent: intentName => intentName === 'echo.echo',
    handleIntent: res => {
        this.respond(res.utterance.replace('echo ', ''));
    }
};

module.exports = Echo;
const Echo = {
    name: 'Echo',
    override: (res, log) => {
        if(res.utterance.startsWith('echo ')){
            const newRes = { intent: 'echo.echo', score: 1 };
            Object.assign(res, newRes);
            log(`Overriden by Echo: ${JSON.stringify(newRes)}`);
        }
    },
    doesHandleIntent: intentName => intentName === 'echo.echo',
    handleIntent: (res, respond) => {
        respond(res.utterance.replace('echo ', ''));
    }
};

module.exports = Echo;
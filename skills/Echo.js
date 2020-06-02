const Echo = {
    name: 'Echo',
    willStealIntent: utterance => utterance.startsWith('echo '),
    doesHandleIntent: () => false,
    handleIntent: (res, respond) => {
        respond(res.utterance.replace('echo ', ''));
    }
};

module.exports = Echo;
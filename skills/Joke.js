const Joke = {
    name: 'Joke',
    doesHandleIntent: intentName => intentName.startsWith('joke'),
    handleIntent: (res, respond) => {
        respond(res.answer);
    }
};

module.exports = Joke;
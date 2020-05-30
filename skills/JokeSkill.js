const JokeSkill = {
    name: 'JokeSkill',
    doesHandleIntent: intentName => intentName.startsWith('joke'),
    handleIntent: (res, respond) => {
        respond(res.answer);
    }
};

module.exports = JokeSkill;
const WeatherSkill = {
    name: 'WeatherSkill',
    doesHandleIntent: intentName => intentName.startsWith('weather'),
    handleIntent: (res, respond) => {
        respond(res.answer);
    }
};

module.exports = WeatherSkill;
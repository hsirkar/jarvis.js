const Weather = {
    name: 'Weather',
    doesHandleIntent: intentName => intentName.startsWith('weather'),
    handleIntent: (res, respond) => {
        respond(res.answer);
    }
};

module.exports = Weather;
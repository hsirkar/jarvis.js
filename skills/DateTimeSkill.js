const moment = require('moment');

const DateTimeSkill = {
    name: 'DateTimeSkill',
    doesHandleIntent: intentName => {
        return intentName.startsWith('datetime');
    },
    handleIntent: (res, respond) => {
        const date = moment();
        respond(
            res.answer
                .replace('%time%', date.format('LT'))
                .replace('%date%', date.format('dddd, MMMM Do'))
                .replace('%month%', date.format('MMMM'))
                .replace('%year%', date.format('YYYY'))
        );
    }
};

module.exports = DateTimeSkill;
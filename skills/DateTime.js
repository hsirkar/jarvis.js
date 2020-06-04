const moment = require('moment');

let timers = [];

const DateTime = {
    name: 'DateTime',
    init: log => {
        setInterval(() => {
            for(i = 0; i < timers.length; i++) {
                timers[i]--;

                if(timers[i] === 0) {
                    log(`Time's up!`);
                    timers.splice(i, 1);
                }
            }
        }, 1000);
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('datetime');
    },
    handleIntent: (res, respond, log) => {
        for(intent in ['year', 'timeofday', 'date', 'month']){
            if(res.intent.includes(intent)){
                const date = moment();
                respond(
                    res.answer
                        .replace('%time%', date.format('LT'))
                        .replace('%date%', date.format('dddd, MMMM Do'))
                        .replace('%month%', date.format('MMMM'))
                        .replace('%year%', date.format('YYYY'))
                );
                return;
            }
        }

        if(res.intent === 'datetime.settimer') {
            let timeInterval = res.entities.find(entity => entity.entity === 'duration');
            let seconds = timeInterval.resolution.values[0].value;

            timers.push(seconds);
        
            respond(`Setting a timer for ${moment.duration(seconds, 's').humanize()}`);
        }
    }
};

module.exports = DateTime;
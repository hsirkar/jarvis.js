const moment = require('moment');
const fs = require('fs');
const playSound = require('play-sound')();
const Speaker = require('speaker');

let timers = [];
let speaker;

const DateTime = {
    name: 'DateTime',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;

        setInterval(() => {
            for(i = 0; i < timers.length; i++) {
                timers[i]--;

                if(timers[i] === 0) {
                    log(`Time's up!`);
                    timers.splice(i, 1);

                    let readStream = new fs.createReadStream('./res/ring.raw');
                    speaker = new Speaker({ channels: 2, bitDepth: 16, sampleRate: 48000 });
                    readStream.on('open', () => readStream.pipe(speaker));
                }
            }
        }, 1000);
    },
    override: res => {
        if(res.utterance.includes('stop')) {
            if(speaker && speaker.close)
                speaker.close();
        }
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('datetime');
    },
    handleIntent: res => {
        const { respond } = this;
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
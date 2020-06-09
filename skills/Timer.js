const moment = require('moment');
const fs = require('fs');
const Speaker = require('speaker');
const Spotify = require('./Spotify');

let timers = [];
let speaker;
let callback;

const Timer = {
    name: 'Timer',
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

                    callback = ()=>{};

                    Spotify.spotifyApi.pause()
                        .then(() => {
                            callback = () => Spotify.spotifyApi.play().catch(()=>{});
                        })
                        .catch(()=>{})
                        .finally(() => {
                            let readStream = new fs.createReadStream('./res/ring.raw');
                            speaker = new Speaker({ channels: 2, bitDepth: 16, sampleRate: 48000 });
                            readStream.on('open', () => readStream.pipe(speaker));
                            readStream.on('close', () => callback());
                        });
                }
            }
        }, 1000);
    },
    override: res => {
        if(res.intent === 'system.stop') {
            if(speaker && speaker.close) {
                this.log('Stopping timer alert...');
                speaker.close();
            }
        }
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('timer');
    },
    handleIntent: res => {
        const { respond } = this;

        if(res.intent === 'timer.create') {
            let timeInterval = res.entities.find(entity => entity.entity === 'duration');
            let seconds = timeInterval.resolution.values[0].value;

            timers.push(seconds);
        
            respond(`Setting a timer for ${moment.duration(seconds, 's').humanize()}`);
        }
    }
};

module.exports = Timer;
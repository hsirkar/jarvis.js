const humanizeDuration = require('humanize-duration');
const fs = require('fs');
const Speaker = require('speaker');
const Spotify = require('./Spotify');
const { log } = require('../util');

let timers = [];
let speaker;
let callback;

const Timer = {
    name: 'Timer',
    init: () => {
        setInterval(() => {
            for(i = 0; i < timers.length; i++) {
                timers[i].timeLeft--;

                if(timers[i].timeLeft === 0) {
                    log(`Timer for ${humanizeDuration(timers[i].total*1000)} is up`);
                    timers.splice(i, 1);

                    callback = ()=>{};

                    Spotify.api('pause')
                        .then(() => {
                            callback = () => Spotify.api('play').catch(()=>{});
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
                log('Stopping timer alert...');
                speaker.close();
            }
        }
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('timer');
    },
    handleIntent: res => new Promise(resolve => {
        const secondary = res.intent.split('.')[1];

        if(secondary === 'create') {
            let timeInterval = res.entities.find(entity => entity.entity === 'duration');
            let seconds = timeInterval.resolution.values[0].value;

            timers.push({ total: seconds, timeLeft: seconds });
            log(JSON.stringify(timers));
        
            resolve(`Setting a timer for ${humanizeDuration(seconds*1000)}`);
            return;
        }

        if(secondary === 'stopall') {
            timers = [];
            resolve('Deleted all timers');
            return;
        }

        if(secondary === 'stop') {
            let timerToStop = {};
            let timeInterval = res.entities.find(entity => entity.entity === 'duration');
            
            if(!timeInterval){
                timerToStop = timers[0];
            }else{
                let seconds = timeInterval.resolution.values[0].value;
                timerToStop = timers.find(timer => timer.total === seconds) || timers[0];
            }

            let index = timers.indexOf(timerToStop);
            if(index === -1)
                index = 0;

            timers.splice(timers.indexOf(timerToStop), 1);
            resolve(`Timer for ${humanizeDuration(timerToStop.total*1000)} removed`);
        }
        
        if(secondary === 'list') {
            log(JSON.stringify(timers));
            if(timers.length === 0)
                resolve('You do not have any active timers');
            else
                resolve(
                    timers.map((t, i) => `Timer ${i+1}: ${humanizeDuration(t.total*1000)}`).join('; ')
                );
        }

        if(secondary === 'timeleft'){
            let timerToStop = {};
            let timeInterval = res.entities.find(entity => entity.entity === 'duration');
            
            if(!timeInterval){
                timerToStop = timers[0];
            }else{
                let seconds = timeInterval.resolution.values[0].value;
                timerToStop = timers.find(timer => timer.total === seconds) || timers[0];
            }

            let index = timers.indexOf(timerToStop);
            if(index === -1)
                index = 0;

            resolve(`${humanizeDuration(timers[index].timeLeft*1000)} left on your ${humanizeDuration(timers[index].total*1000).replace(/s$/, '')} timer`);
        }
    })
};

module.exports = Timer;
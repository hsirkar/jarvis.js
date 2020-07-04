const os = require('os');
const dns = require('dns');
const publicIp = require('public-ip');
const tts = require('../../tts');
const moment = require('moment');
const { isYes, setEnv, list, log } = require('../../util');
const similarity = require('string-similarity');
const fs = require('fs');
const axios = require('axios').default;
const renew = require('./renew');
const speedtest = require('./speedtest');
const newskill = require('./newskill');

const System = {
    name: 'System',
    init: params => Object.assign(this, params),
    override: res => {
        if(res.utterance.toLowerCase().startsWith('echo ')){
            res.intent = 'system.echo';
        }
        if(res.utterance.toLowerCase().startsWith('set ') && res.utterance.includes(' to ')) {
            res.intent = 'system.setenv';
        }
        if(res.utterance.toLowerCase().startsWith('renew ')) {
            res.intent = 'system.renew';
        }
        if(res.utterance.toLowerCase().includes('nevermind') || res.utterance.toLowerCase().includes('never mind')) {
            res.intent = 'system.dismiss';
        }
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('system');
    },
    handleIntent: res => new Promise(resolve => {
        const secondary = res.intent.split('.')[1];
        const { ask, say } = this;

        switch (secondary) {
            case 'netcheck':
                dns.lookup('google.com', err => {
                    if (err && err.code == 'ENOTFOUND')
                        resolve('No, you are not connected to the internet')
                    else
                        resolve('Yes, you have an internet connection');
                });
                break;
            case 'localip':
                dns.lookup(os.hostname(), (err, add) => {
                    if (err)
                        resolve('I could not retrieve your local IP address');
                    else
                        resolve(`Your local IP address is ${add}`);
                });
                break;
            case 'publicip':
                publicIp.v4()
                    .then(res => resolve(`Your public IP address is ${res.toString()}`))
                    .catch(() => resolve('There was an error'));
                break;
            case 'location':
                axios.get('http://ip-api.com/json')
                    .then(res => {
                        const { city, regionName, country } = res.data;
                        resolve([
                            `Based on your IP address, your location is ${city}, ${regionName}, ${country}`,
                            `The host location of your IP address is ${city}, ${regionName}, ${country}`
                        ]);
                    })
                    .catch(() => resolve('I could not get your location'));
                break;
            case 'isp':
                axios.get('http://ip-api.com/json')
                    .then(res => {
                        const { isp } = res.data;
                        resolve([
                            `Based on your IP address, ${isp}`,
                            `The host ISP of your IP address is ${isp}`
                        ]);
                    })
                    .catch(() => resolve('I could not get your location'));
                break;
            case 'echo':
                resolve(res.utterance.replace('echo ', ''));
                break;
            case 'dismiss':
                log('Dismissed');
                resolve();
                break;
            case 'stop':
                tts.stop();
                resolve();
                break;
            case 'time':
            case 'today':
            case 'year':
                const date = moment();
                resolve(
                    res.answer
                        .replace('%time%', date.format('LT'))
                        .replace('%date%', date.format('dddd, MMMM Do'))
                        .replace('%month%', date.format('MMMM'))
                        .replace('%year%', date.format('YYYY'))
                );
                break;
            case 'otherdate':
                let dateEntity = res.entities.find(e => e.entity === 'date');

                if(!dateEntity)
                    resolve(`I'm not sure`);
                else
                    resolve(moment(dateEntity.resolution.strValue || dateEntity.resolution.strFutureValue).format('dddd, MMMM Do, YYYY'));
                // resolve(res.answer);
                break;
            case 'uptime':
                resolve('The system has been up for ' + moment.duration(os.uptime()*1000).humanize());
                break;
            case 'freemem':
                resolve('About ' + Math.round(os.freemem()/1000000) + ' MB');
                break;
            case 'restart':
                // Trigger nodemon by touching a watched file
                setTimeout(() => {
                    const time = new Date();
                    try {
                        fs.utimesSync('./src/skills/index.js', time, time);
                    } catch (err) {
                        fs.closeSync(fs.openSync('./src/skills/index.js', 'w'));
                    }
                }, 500);

                resolve('Restarting Jarvis...');
                break;
            case 'retrain':
                ask('Are you sure?', answer => {
                    if (isYes(answer)) {
                        require('child_process').execSync('npm run clear');

                        setTimeout(() => {
                            System.handleIntent({ intent: 'system.restart' }).then(res => resolve(res));
                        }, 500);

                        resolve('Retraining Jarvis...');
                    } else {
                        resolve(['Alright, I will not retrain', 'Retrain canceled']);
                    }
                });
                break;
            case 'setenv':
                const variables = ['ENABLE_TTS', 'DEBUG', 'TTS_ENGINE', 'OPEN_STT_CLIENT', 'ALERT_ON_BOOT'];

                let variable = res.utterance.split(' to ')[0].replace('set', '').trim();
                var matches = similarity.findBestMatch(variable, variables.map(v => v.toLowerCase()));

                if(matches.bestMatch.rating < 0.7) {
                    resolve(`There is no variable named ${variable}. You can choose from ${list(variables, 'and', '')}`);
                    return;
                }

                var index = matches.bestMatchIndex;
                let value = res.utterance.split(' to ')[1].trim();
                
                log(`Target variable: ${variables[index]} (${matches.bestMatch.rating})`);
                log(`Target value: ${value}`);

                ask(`Confirming: Set ${variables[index]} to ${value}?`, answer => {
                    if (isYes(answer)) {
                        setEnv(variables[index], value);
                        System.handleIntent({ intent: 'system.restart' }).then(res => resolve(res));
                    } else {
                        resolve('OK, cancelled');
                    }
                });
                break;
            case 'renew':
                renew(res, resolve, ask);
                break;
            case 'speedtest':
                speedtest(ask, say, resolve);
                break;
            case 'newskill':
                newskill(ask, resolve)
                break;
            default:
                resolve('That feature has not been implemented yet');
                break;
        }
    })
};

module.exports = System;
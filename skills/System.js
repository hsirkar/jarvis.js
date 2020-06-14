const os = require('os');
const dns = require('dns');
const publicIp = require('public-ip');
const tts = require('../src/tts');
const moment = require('moment');
const { isYes, setEnv, list } = require('../src/util');
const similarity = require('string-similarity');

const System = {
    name: 'System',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;
    },
    override: res => {
        if(res.utterance.startsWith('echo ')){
            const newRes = { intent: 'system.echo', score: 1 };
            Object.assign(res, newRes);
            this.log(`Overriden by System: ${JSON.stringify(newRes)}`);
        }
        if(res.utterance.startsWith('set ') && res.utterance.includes(' to ')) {
            const newRes = { intent: 'system.setenv', score: 1 };
            Object.assign(res, newRes);
            this.log(`Overriden by System: ${JSON.stringify(newRes)}`);
        }
    },
    setInit: initJarvis => {
        this.initJarvis = initJarvis;
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('system');
    },
    handleIntent: res => new Promise(resolve => {
        const secondary = res.intent.split('.')[1];
        const { log } = this;

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
            case 'date':
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
            case 'volumeup':
                break;
            case 'volumedown':
                break;
            case 'setvolume':
                break;
            case 'uptime':
                resolve('The system has been up for ' + moment.duration(os.uptime()*1000).humanize());
                break;
            case 'freemem':
                resolve('About ' + Math.round(os.freemem()/1000000) + ' MB');
                break;
            case 'restart':
                setTimeout(() => this.initJarvis(), 1000);
                require('../src/stt/index').io.close();
                require('../src/stt/client').close();
                resolve('Restarting Jarvis...');
                break;
            case 'retrain':
                this.ask('Are you sure?', answer => {
                    if (isYes(answer)) {
                        require('child_process').execSync('npm run clear');

                        setTimeout(() => {
                            System.handleIntent({ intent: 'system.restart' }).then(res => resolve(res));
                        }, 500);

                        resolve('Retraining the natural language processor...');
                    } else {
                        resolve(['Alright, I will not retrain', 'Retrain canceled']);
                    }
                });
                break;
            case 'setenv':
                const variables = ['DEFAULT_CITY', 'ENABLE_TTS', 'DEBUG', 'NODE_ENV', 'TTS_ENGINE', 'OPEN_STT_CLIENT'];

                let variable = res.utterance.split(' to ')[0].replace('set', '').trim();
                let matches = similarity.findBestMatch(variable, variables.map(v => v.toLowerCase()));

                if(matches.bestMatch.rating < 0.7) {
                    resolve(`There is no variable named ${variable}. You can choose from ${list(variables, 'and', '')}`);
                    return;
                }

                let index = matches.bestMatchIndex;
                let value = res.utterance.split(' to ')[1].trim();
                
                log(`Target variable: ${variables[index]} (${matches.bestMatch.rating})`);
                log(`Target value: ${value}`);

                this.ask(`Confirming: Set ${variables[index]} to ${value}?`, answer => {
                    if (isYes(answer)) {
                        setEnv(variables[index], value);
                        System.handleIntent({ intent: 'system.restart' }).then(res => resolve(res));
                    } else {
                        resolve('OK, cancelled');
                    }
                });
                break;
            default:
                resolve('That feature has not been implemented yet');
                break;
        }
    })
};

module.exports = System;
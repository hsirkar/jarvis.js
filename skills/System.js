const os = require('os');
const dns = require('dns');
const publicIp = require('public-ip');
const tts = require('../src/tts');
const moment = require('moment');

const System = {
    name: 'System',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;
    },
    override: res => {
        if(res.utterance.startsWith('echo ')){
            const newRes = { intent: 'system.echo', score: 1 };
            Object.assign(res, newRes);
            this.log(`Overriden by System: ${JSON.stringify(newRes)}`);
        }
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('system');
    },
    handleIntent: res => {
        const secondary = res.intent.split('.')[1];
        const { respond, log, ask } = this;

        switch (secondary) {
            case 'netcheck':
                dns.lookup('google.com', err => {
                    if (err && err.code == 'ENOTFOUND')
                        respond('No, you are not connected to the internet')
                    else
                        respond('Yes, you have an internet connection');
                });
                break;
            case 'localip':
                dns.lookup(os.hostname(), (err, add) => {
                    if (err)
                        respond('I could not retrieve your local IP address');
                    else
                        respond(`Your local IP address is ${add}`);
                });
                break;
            case 'publicip':
                publicIp.v4()
                    .then(res => respond(`Your public IP address is ${res.toString()}`))
                    .catch(() => respond('There was an error'));
                break;
            case 'echo':
                respond(res.utterance.replace('echo ', ''));
                break;
            case 'dismiss':
                log('Dismissed');
                respond();
                break;
            case 'stop':
                tts.stop();
                respond();
                break;
            case 'time':
            case 'date':
            case 'year':
                const date = moment();
                respond(
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
                respond('The system has been up for ' + moment.duration(os.uptime()*1000).humanize());
                break;
            case 'freemem':
                respond('About ' + Math.round(os.freemem()/1000000) + ' MB');
                break;

            default:
                respond('That feature has not been implemented yet');
                break;
        }
    }
};

module.exports = System;
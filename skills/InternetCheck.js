const dns = require('dns');
const os = require('os');
const publicIp = require('public-ip');

const InternetCheck = {
    name: 'InternetCheck',
    doesHandleIntent: intentName => {
        return intentName.startsWith('netcheck');
    },
    handleIntent: (res, respond) => {
        const secondary = res.intent.split('.')[1];

        switch (secondary) {
            case 'general':
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
            default:
                respond('I do not understand');
                break;
        }
    }
};

module.exports = InternetCheck;
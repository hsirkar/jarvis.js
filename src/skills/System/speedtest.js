const speedtest = require('speedtest-net');
const { isYes, log } = require('../../util')

module.exports = (ask, say, resolve) => {
    ask(['Are you sure? This will take a minute', 'You sure about this? It will take some time'], answer => {
        if (isYes(answer)) {
            say('Starting speed test...');
            const progress = event => {
                if(event.type === 'testStart' && event.server) {
                    say(`Connected to ${event.server.name} in ${event.server.location}`);
                }
                if(event.type === 'ping' && event.ping && event.ping.progress === 1) {
                    const ping = Math.round(event.ping.latency);
                    setTimeout(() => say(`Ping is ${ping} ms`), 1500);
                }
                if(event.type === 'download' && event.download && event.download.progress === 1) {
                    const down = (event.download.bandwidth / 125000).toFixed(1);
                    say(`Download speed is ${down} Mb/s`);
                }
                if(event.type === 'upload' && event.upload && event.upload.progress === 1) {
                    const up = (event.upload.bandwidth / 125000).toFixed(1);
                    say(`Upload speed is ${up} Mb/s`);
                }
            }
            speedtest({ acceptLicense: true, progress: progress })
                .then(res => {
                    log(JSON.stringify(res, null, 2));
                    setTimeout(() => resolve(`Speedtest complete`), 500);
                });
        } else {
            resolve('OK, cancelled');
        }
    });
};
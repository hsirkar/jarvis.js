const { log, removeStopwords, isYes } = require('../util');
const axios = require('axios').default;
const ts = require('torrent-search-api');
const WT = require('webtorrent');
const moment = require('moment');

let client; // webtorrent client
let server; // torrent server

function prettyBytes(num) {
    var exponent, unit, neg = num < 0, units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    if (neg) num = -num
    if (num < 1) return (neg ? '-' : '') + num + ' B'
    exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
    num = Number((num / Math.pow(1000, exponent)).toFixed(2))
    unit = units[exponent]
    return (neg ? '-' : '') + num + ' ' + unit
}

const Movies = {
    name: 'Movies',
    init: params => {
        Object.assign(this, params);
        ts.enableProvider('1337x');

        client = new WT();
    },
    override: res => {
        if(res.utterance.toLowerCase().startsWith('download ')){
            const newRes = { intent: 'movies.download', score: 1 };
            Object.assign(res, newRes);
            log(`Overriden by System: ${JSON.stringify(newRes)}`);
        }
    },
    doesHandleIntent: intentName => intentName.startsWith('movies'),
    handleIntent: res => new Promise(resolve => {
        if(res.intent === 'movies.download') {
            let keywords = removeStopwords(res.utterance, ['search', 'for', 'download', 'movie', 'film']);
            (async () => {
                try {
                    // Check for VPN
                    let ip = await axios.get('http://ip-api.com/json');

                    if(ip.data.regionName === 'Maryland' || ip.data.isp === 'Comcast Cable Communications'){
                        resolve(`You're not connected to a VPN`);
                        return;
                    }

                    // Search for keywords
                    this.say('Searching...');
                    log('Searching for "' + keywords + '"...');

                    const searchRes = await ts.search(keywords, undefined, 5);
                    for(let item of searchRes) {
                        let magnet = await ts.getMagnet(item);
                        Object.assign(item, { magnet });
                    }

                    if(searchRes.length === 0) {
                        resolve('No results found');
                        return;
                    }
                    
                    // Show results
                    this.ask({
                        text: 'Are you sure?',
                        listTitle: `Search results for "${keywords}":`,
                        list: searchRes.map((t,i) => ({
                            displayText: `${i+1}. ${t.title}`,
                            subtitle: `Seeds: ${t.seeds} / Peers: ${t.peers} / Size: ${t.size}`,
                            subtitle2: 'from ' + t.provider,
                            url: t.magnet
                        })),
                    }, answer => {
                        if(!isYes(answer)) {
                            resolve('OK, cancelled');
                            return;
                        }

                        let { magnet } = searchRes[0];

                        // let magnet = `magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent`;

                        // Queue the torrent
                        client.on('error', err => {
                            log('Error: ' + err);
                            resolve('Error');
                        });

                        client.add(magnet, { path: 'D:/Downloads/Movies/' }, torrent => {
                            let videoFile = torrent.files.find(file => file.name.endsWith('.mp4'));
                            let ref = Math.random().toString(36).substring(7);

                            resolve({
                                text: 'Starting download...',
                                displayText: torrent.name,
                                subtitle: 'Starting download...',
                                video: 'http://localhost:8081/' + torrent.files.indexOf(videoFile),
                                link: 'http://localhost:8081/' + torrent.files.indexOf(videoFile),
                                ref
                            });

                            log('starting download...');

                            // Update progress
                            setInterval(() => {
                                if(torrent.done) return;
                                this.update({
                                    subtitle: `${prettyBytes(torrent.downloaded)} of ${prettyBytes(torrent.length)} – ${moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()} remaining`,
                                    ref
                                });
                                log('Download progress: ' + torrent.progress);
                            }, 1000);

                            torrent.on('done', () => {
                                setTimeout(() => {
                                    this.update({
                                        displayText: torrent.name,
                                        subtitle: `Downloaded / Size: ${prettyBytes(torrent.length)}`,
                                        url: torrent.magnet,
                                        video: 'http://localhost:8081/' + torrent.files.indexOf(videoFile),
                                        ref
                                    });
                                    log('Finished downloading');
                                }, 1000);
                            });

                            torrent.on('error', err => {
                                setTimeout(() => {
                                    this.update({
                                        displayText: 'Error',
                                        subtitle: err,
                                        ref
                                    });
                                    log('Torrent error: ' + err);
                                }, 1000);
                            });

                            if(server && server.close) {
                                server.close();
                            }

                            setTimeout(() => {
                                server = torrent.createServer();
                                server.listen(8081);
                            }, 1000);
                            
                        });

                    });
                } catch (err) {
                    resolve('There was an error');
                    log(err);
                }
            })();

            return;
        }
        resolve(`I'm not sure`);
    })
};

module.exports = Movies;
const { log, removeStopwords, isYes } = require('../util');
const axios = require('axios').default;
const ts = require('torrent-search-api');
const WebTorrent = require('webtorrent');
const moment = require('moment');
const getPort = require('get-port');
const open = require('open');

let client; // webtorrent client
let intervals = [];
let refs = [];
let servers = [];
let sockets = [];

function prettyBytes(num) {
    var exponent, unit, neg = num < 0, units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    if (neg) num = -num
    if (num < 1) return (neg ? '-' : '') + num + ' B'
    exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
    num = Number((num / Math.pow(1000, exponent)).toFixed(2))
    unit = units[exponent]
    return (neg ? '-' : '') + num + ' ' + unit
}

const sintel = `magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent`;

const Movies = {
    name: 'Movies',
    init: params => {
        Object.assign(this, params);
        ts.enableProvider('1337x');
        ts.enableProvider('ThePirateBay');
        client = new WebTorrent();
    },
    override: res => {
        if(res.utterance.toLowerCase().startsWith('download ')){
            Object.assign(res, { intent: 'movies.download', overriden: true });
        }
        if(res.intent === 'system.stop') {
            log('Stopping all downloads...');
            if(client.torrents.length) {
                client.torrents.forEach(torrent => torrent.destroy());
                intervals.forEach(interval => clearInterval(interval));
                servers.forEach(server => server.close && server.close());
                sockets.forEach(socket => socket.destroy && socket.destroy());
                refs.forEach(ref => this.update({
                    subtitle: 'All downloads stopped',
                    video: ' ',
                    ref
                }));
                refs = intervals = servers = sockets = [];
                log('All torrents removed');
            }
        }
    },
    doesHandleIntent: intentName => intentName.startsWith('movies'),
    handleIntent: async res => {
        if(res.intent === 'movies.download') {
            try {
                // Check for VPN
                let ip = await axios.get('http://ip-api.com/json');

                if(ip.data.regionName === 'Maryland' || ip.data.isp === 'Comcast Cable Communications'){
                    return `You're not connected to a VPN`;
                }

                // Search for keywords
                this.say('Searching...');

                let keywords = removeStopwords(res.utterance, ['search', 'for', 'download', 'movie', 'film']);
                log('Searching for "' + keywords + '"...');

                const searchRes = await ts.search(keywords, undefined, 5);
                
                // Get magnet links
                for(let item of searchRes) {
                    let magnet = await ts.getMagnet(item);
                    Object.assign(item, { magnet });
                }

                log(JSON.stringify(searchRes,null,2));

                if(searchRes.length === 0) {
                    return 'No results found';
                }

                // Show results
                let answer = await this.ask({
                    text: 'Are you sure?',
                    listTitle: `Search results for "${keywords}":`,
                    list: searchRes.map((t,i) => ({
                        displayText: `${i+1}. ${t.title}`,
                        subtitle: `Uploaded: ${ moment(t.time).isValid() ? moment(t.time).format('l') : t.time }\nSeeds: ${t.seeds} / Peers: ${t.peers} / Size: ${t.size}`,
                        subtitle2: 'from ' + t.provider,
                        url: t.magnet
                    })),
                });
                
                if(!isYes(answer)) {
                    return 'OK, cancelled';
                }

                let { magnet } = searchRes[0];
                // let magnet = sintel;
                let port = await getPort({ port: getPort.makeRange(3007, 3400) });

                // Queue the torrent
                client.on('error', err => {
                    log('Error: ' + err);
                    return 'Error';
                });

                client.add(magnet, { path: 'D:/Downloads/Movies/' }, torrent => {
                    log('Starting download...');
                    
                    // Create server to serve files as they're being downloaded
                    const server = torrent.createServer();
                    server.on('connection', socket => sockets.push(socket));
                    servers.push(server);
                    server.listen(port);
                    
                    // Update with torrent/server info
                    const mp4Index = torrent.files.findIndex(file => file.name.endsWith('.mp4'));
                    this.update({
                        displayText: torrent.name,
                        video: mp4Index > -1 && `http://localhost:${port}/${mp4Index}`,
                        ref
                    });

                    // Open in VLC if MKV
                    const mkvIndex = torrent.files.findIndex(file => file.name.endsWith('.mkv'));
                    mkvIndex > -1 && open(`http://localhost:${port}/${mkvIndex}`, { app: 'vlc' });

                    // Update progress every second
                    let updateProgress = setInterval(() => {
                        if(torrent.done) return;
                        this.update({
                            subtitle: `${prettyBytes(torrent.downloaded)} of ${prettyBytes(torrent.length)} – ↓ ${prettyBytes(torrent.downloadSpeed)}/s / ↑ ${prettyBytes(torrent.uploadSpeed)}/s – ${moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()} remaining`,
                            ref
                        });
                        log('Download progress: ' + torrent.progress);
                    }, 1000);

                    intervals.push(updateProgress);

                    // Update when finished
                    torrent.on('done', () => {
                        setTimeout(() => {
                            this.update({
                                subtitle: `Downloaded / Size: ${prettyBytes(torrent.length)}`,
                                ref
                            });
                            clearInterval(updateProgress);
                            log('Finished downloading');
                        }, 1000);
                    });

                    // Update when error
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
                });

                // resolve the intent
                const ref = Math.random().toString(36).substring(7);
                refs.push(ref);

                return ({
                    text: 'Starting download...',
                    displayText: searchRes[0].title,
                    subtitle: 'Starting download...',
                    url: `http://localhost:${port}`,
                    ref
                });

            } catch (err) {
                log(err);
                return 'There was an error';
            }
        }
        return `I'm not sure`;
    }
};

module.exports = Movies;
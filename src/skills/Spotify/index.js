const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios').default;
const open = require('open');
const moment = require('moment');
const { log, list } = require('../../util');
const cheerio = require('cheerio');
const lyrics = require('lyric-fetcher');

let spotifyApi;
let axiosInstance;
let deviceId;
let lastRefreshed;

function getDesc(track) {
    return `${track.name} by ${list(track.artists.map(a => a.name), 'and', 'No Artist')}`;
}

const Spotify = {
    name: 'Spotify',
    init: () => {
        spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: 'https://example.com/callback',
            accessToken: process.env.SPOTIFY_ACCESS_TOKEN,
            refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
        });
        axiosInstance = axios.create({
            baseURL: 'https://api.spotify.com',
            headers: {
                'Authorization': 'Bearer ' + spotifyApi.getAccessToken(),
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Dnt': '1',
                'Referer': 'https://www.google.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0'
            }
        });

        deviceId = process.env.SPOTIFY_DEVICE_ID;
        lastRefreshed = undefined;

        Object.assign(Spotify, { spotifyApi, axiosInstance });
    },
    override: res => {
        if(res.utterance.toLowerCase().startsWith('play')){
            const newRes = { intent: res.utterance.includes('news') ? 'spotify.news' : 'spotify.play', score: 1 };
            Object.assign(res, newRes);
            log(`Overriden by Spotify: ${JSON.stringify(newRes)}`);
            return;
        }

        if (res.intent === 'system.stop') {
            Spotify.api('pause')
                .then(() => {
                    log('Spotify paused');
                })
                .catch(err => log(err));
        }
    },
    refreshToken: callback => {
        if(lastRefreshed && moment().diff(lastRefreshed, 'minutes') < 30) {
            log('Access token was refreshed less than 30 minutes ago, skipping refresh');
            return;
        }

        lastRefreshed = moment();

        log('Refreshing access token...');
        spotifyApi.refreshAccessToken()
            .then(data => {
                log('New access token: ' + data.body['access_token']);
    
                const newAT = data.body['access_token'];
                const oldAT = spotifyApi.getAccessToken();
    
                log('Setting new access token...');
                spotifyApi.setAccessToken(newAT);
    
                axiosInstance = axios.create({
                    baseURL: 'https://api.spotify.com',
                    headers: {
                        'Authorization': 'Bearer ' + spotifyApi.getAccessToken(),
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Connection': 'keep-alive',
                        'Dnt': '1',
                        'Referer': 'https://www.google.com',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0'
                    }
                });
                
                Object.assign(Spotify, { spotifyApi, axiosInstance });
    
                log('Saving it to env...');
                let env = require('fs').readFileSync('.env', 'utf-8');
                env = env.replace(oldAT, newAT);
                require('fs').writeFileSync('.env', env);
    
                log('Rehanding the intent');
                callback();
            })
            .catch(err => log(err));
    },
    doesHandleIntent: intentName => intentName.startsWith('spotify'),
    handleIntent: res => new Promise(resolve => {
        (async() => {
            try {
                if(res.intent === 'spotify.play'){
                    const query = res.utterance.toLowerCase().replace('play ', '').replace(' on spotify', '').replace(' by ', ' ').replace(' and ', ' ');
                    log(`Searching for "${query}"...`);

                    let searchRes = await spotifyApi.searchTracks(query, { limit: 3, country: 'US' });
                    let tracks = searchRes.body.tracks.items;
                    log('Search results: ' + tracks.map(track => getDesc(track)).join('; ') );

                    if(tracks.length === 0){
                        resolve(`No results found for ${query}`);
                        return;
                    }

                    // Add track to queue, skip to next track
                    await axiosInstance.post(`/v1/me/player/queue?uri=${tracks[0].uri}&device_id=${deviceId}`);
                    await axiosInstance.post(`/v1/me/player/next?device_id=${deviceId}`);

                    // new SpotifyWebApi().search().then(res => res.body.tracks.items[0].ur)

                    resolve({
                        text: `Now playing ${getDesc(tracks[0])}`,
                        displayText: tracks[0].name,
                        image: tracks[0].album.images[0].url,
                        subtitle: tracks[0].artists.map(a => a.name).join(', ')+'\n'+tracks[0].album.name
                    });
                    return;
                }

                if(res.intent === 'spotify.pause'){
                    await spotifyApi.pause();
                    log('Spotify paused');
                    resolve();
                    return;
                }
        
                if (res.intent === 'spotify.resume') {
                    await spotifyApi.play();
                    log('Spotify resumed');
                    resolve();
                    return;
                }
                
                if (res.intent === 'spotify.next') {
                    await spotifyApi.skipToNext();
                    log('Spotify skipped to next');
                    resolve();
                    return;
                }
                
                if (res.intent === 'spotify.previous') {
                    await spotifyApi.skipToPrevious();
                    log('Spotify back to previous');
                    resolve();
                    return;
                }

                if (res.intent === 'spotify.replay') {
                    await spotifyApi.seek(0);
                    log('Spotify replaying');
                    resolve();
                    return;
                }
                        
                if (res.intent === 'spotify.current' || res.intent === 'spotify.lyrics') {
                    let apiRes = await spotifyApi.getMyCurrentPlayingTrack();
                    let track = apiRes.body.item;

                    if(apiRes && apiRes.body && track && track.name && track.artists)
                        if(res.intent.includes('current')) {
                            resolve({
                                text: getDesc(track),
                                displayText: track.name,
                                image: track.album.images[0].url,
                                subtitle: track.artists.map(a => a.name).join(', ')+'\n'+track.album.name
                            });
                        }
                        else {
                            lyrics({
                                artist: track.artists[0].name,
                                song: track.name
                            }, (err, data) => {
                                if(err) {
                                    log(err);
                                    resolve('Error');
                                } else {
                                    log(data);
                                    resolve({
                                        displayText: data.toString(),
                                        subtitle: getDesc(track)
                                    });
                                }
                            });
                            // (async () => {
                            //     try {
                            //         let url = `https://www.google.com/search?q=${getDesc(track)} lyrics`;
                            //         google = await axiosInstance.get(url);
                            //         const $ = cheerio.load(google.data);

                            //         require('fs').writeFileSync('./cache/google-search-result.html', google.data);

                            //         const spans = $('[data-lyricid]').find('span').toArray();
                            //         const lyrics = spans.map(span => cheerio.load(span).text()).join('\n');
                            //         resolve({ displayText: lyrics, source: 'LyricFind', url });
                            //     } catch (err) {
                            //         log(err);
                            //         resolve('Error');
                            //     }
                            // })();
                        }
                    else
                        resolve(`I'm not sure`);
                    return;
                }

                if(res.intent === 'spotify.news') {
                    let spotifyRes = await axiosInstance.get(`/v1/shows/2AoYk2xxbBfVjagnt4mwuV`);
                    let episodes = spotifyRes.data.episodes.items;
                    
                    // Add track to queue, skip to next track
                    await axiosInstance.post(`/v1/me/player/queue?uri=${episodes[0].uri}`);
                    await axiosInstance.post(`/v1/me/player/next`);
                    resolve(`Playing ${spotifyRes.data.name}`);
                    return;
                }

            } catch (err) {
                if(res.utterance.includes('stop')) {
                    resolve();
                    return;
                }

                log(err.statusCode);
                log(err);
    
                if(err.statusCode && err.statusCode === 401) {
                    Spotify.refreshToken(() => Spotify.handleIntent(res).then(res => resolve(res)));
                    return;
                }
            
                if (err && err.response && err.response.data && err.response.data.error && err.response.data.error.reason && err.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
                    resolve('There are no active devices to play on');
                    return;
                }
            
                resolve('Error, I could not process your request');
            }
        })();
    }),
    // Use functions from SpotifyWebApi with error handling for expired access token
    api: (functionName, ...args) => new Promise(resolve => {
        spotifyApi[functionName](...args)
            .then(() => resolve())
            .catch(err => {
                if (err.statusCode && err.statusCode === 401)
                    Spotify.refreshToken(() => Spotify.api(functionName, args).then(() => resolve()));
                
                resolve();
            })
            .finally(() => resolve());
    })
};

module.exports = Spotify;
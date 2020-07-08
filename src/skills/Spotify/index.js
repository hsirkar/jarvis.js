const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios').default;
const moment = require('moment');
const { log, list, removeStopwords } = require('../../util');
const similar = require('string-similarity');
const { isUndefined } = require('util');

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
        if(res.utterance.toLowerCase().startsWith('play ')){
            Object.assign(res, { intent: res.utterance.includes('news') ? 'spotify.news' : 'spotify.play', overriden: true });
        }

        if (res.intent === 'system.stop') {
            Spotify.api('pause')
                .then(() => {
                    log('Spotify paused');
                })
                .catch(err => log(err));
        }
    },
    refreshToken: () => new Promise(resolve => {
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
                resolve();
            })
            .catch(err => log(err));
    }),
    doesHandleIntent: intentName => intentName.startsWith('spotify'),
    handleIntent: async res => {
        try {
            if(res.intent === 'spotify.play'){
                const query = removeStopwords(res.utterance, ['play', 'on spotify', 'by', 'and', 'playlist', 'my']).toLowerCase();
                const searchRes = await spotifyApi.search(query, ['playlist', 'track'], { limit: 3, country: 'US' });

                const tracks = searchRes.body.tracks.items;
                const playlists = searchRes.body.playlists.items;

                if(playlists.length && (res.utterance.includes('playlist') || !tracks.length)) {
                    await axiosInstance.put(`/v1/me/player/play?device_id=${deviceId}`, { context_uri: playlists[0].uri });
                    return `Now playing "${playlists[0].name}" playlist`;
                }

                if(tracks.length) {
                    await axiosInstance.put(`/v1/me/player/play?device_id=${deviceId}`, {
                        context_uri: tracks[0].album.uri,
                        offset: { uri: tracks[0].uri }
                    });

                    return ({
                        text: `Now playing ${getDesc(tracks[0])}`,
                        displayText: tracks[0].name,
                        image: tracks[0].album.images[0].url,
                        subtitle: tracks[0].artists.map(a => a.name).join(', '),
                        subtitle2: tracks[0].album.name
                    });
                }

                return `No results found for ${query}`;
            }

            if(res.intent === 'spotify.pause'){
                await spotifyApi.pause();
                log('Spotify paused');
                return;
            }
    
            if (res.intent === 'spotify.resume') {
                await spotifyApi.play();
                log('Spotify resumed');
                return;
            }
            
            if (res.intent === 'spotify.next') {
                await spotifyApi.skipToNext();
                log('Spotify skipped to next');
                return;
            }
            
            if (res.intent === 'spotify.previous') {
                await spotifyApi.skipToPrevious();
                log('Spotify back to previous');
                return;
            }

            if (res.intent === 'spotify.replay') {
                await spotifyApi.seek(0);
                log('Spotify replaying');
                return;
            }
                    
            if (res.intent === 'spotify.current' || res.intent === 'spotify.lyrics') {
                let apiRes = await spotifyApi.getMyCurrentPlayingTrack();
                let track = apiRes.body.item;

                if(apiRes && apiRes.body && track && track.name && track.artists)
                    if(res.intent.includes('current')) {
                        return ({
                            text: getDesc(track),
                            displayText: track.name,
                            image: track.album.images[0].url,
                            subtitle: track.artists.map(a => a.name).join(', '),
                            subtitle2: track.album.name
                        });
                    }
                    else {
                        let lyricsRes = await axios.get('https://some-random-api.ml/lyrics/?title=' + encodeURIComponent(track.name+track.artists[0].name));
                        return ({
                            displayText: lyricsRes.data.lyrics,
                            subtitle: getDesc(track)
                        });
                    }
                else
                    return `I'm not sure`;
            }

            if(res.intent === 'spotify.news') {
                let spotifyRes = await axiosInstance.get(`/v1/shows/2AoYk2xxbBfVjagnt4mwuV`);
                let episodes = spotifyRes.data.episodes.items;
                
                // Add track to queue, skip to next track
                await axiosInstance.post(`/v1/me/player/queue?uri=${episodes[0].uri}`);
                await axiosInstance.post(`/v1/me/player/next`);
                return `Playing ${spotifyRes.data.name}`;
            }

        } catch (err) {
            if(res.utterance.includes('stop')) {
                return;
            }

            log(err.statusCode);
            log(err);

            if(err.statusCode && err.statusCode === 401) {
                await Spotify.refreshToken();
                await Spotify.handleIntent(res);
                return;
            }
        
            if (err && err.response && err.response.data && err.response.data.error && err.response.data.error.reason && err.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
                return 'There are no active devices to play on';
            }
        
            return 'Error, I could not process your request';
        }
    },
    // Use functions from SpotifyWebApi with error handling for expired access token
    api: (functionName, ...args) => new Promise(resolve => {
        spotifyApi[functionName](...args)
            .then(() => resolve())
            .catch(err => {
                if (err.statusCode && err.statusCode === 401) {
                    Spotify.refreshToken().then(() => Spotify.api(functionName, args).then(() => resolve()));
                    return;
                }
                resolve();
            });
    })
};

module.exports = Spotify;
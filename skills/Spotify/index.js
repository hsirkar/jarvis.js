const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios').default;
const open = require('open');

let spotifyApi;
let axiosInstance;
let deviceId;

function refreshToken(res, response, log) {
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
                headers: { 'Authorization': 'Bearer ' + spotifyApi.getAccessToken() }
            });
            
            Object.assign(Spotify, { spotifyApi, axiosInstance });

            log('Saving it to env...');
            let env = require('fs').readFileSync('.env', 'utf-8');
            env = env.replace(oldAT, newAT);
            require('fs').writeFileSync('.env', env);

            log('Rehanding the intent');
            Spotify.handleIntent(res, response, log);
        });
}

function getDesc(track) {
    try {
        const name = track.name;
        const artists = track.artists;

        let artistsDesc;

        if (artists.length === 0)
            artistsDesc = '';
        else if (artists.length === 1)
            artistsDesc = artists[0].name;
        else
            artistsDesc = artists.map(a => a.name).slice(0, -1).join(', ') + ' and ' + artists[artists.length - 1].name;

        return `${name} by ${artistsDesc}`;
    } catch {
        return track.name;
    }
}

const Spotify = {
    name: 'Spotify',
    init: (respond, log, ask) => {
        this.respond = respond;
        this.log = log;
        this.ask = ask;
        
        spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: 'https://example.com/callback',
            accessToken: process.env.SPOTIFY_ACCESS_TOKEN,
            refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
        });
        axiosInstance = axios.create({
            baseURL: 'https://api.spotify.com',
            headers: { 'Authorization': 'Bearer ' + spotifyApi.getAccessToken() }
        });

        deviceId = process.env.SPOTIFY_DEVICE_ID;

        Object.assign(Spotify, { spotifyApi, axiosInstance });
    },
    override: res => {
        if(res.utterance.startsWith('play ')){
            const newRes = { intent: res.utterance.includes('news') ? 'spotify.news' : 'spotify.play', score: 1 };
            Object.assign(res, newRes);
            this.log(`Overriden by Spotify: ${JSON.stringify(newRes)}`);
            return;
        }

        if (res.intent === 'system.stop') {
            spotifyApi.pause()
                .then(() => {
                    this.log('Spotify paused');
                })
                .catch(err => this.log(err));
        }
    },
    doesHandleIntent: intentName => intentName.startsWith('spotify'),
    handleIntent: res => {
        const { respond, log } = this;
        (async() => {
            try {
                if(res.intent === 'spotify.play'){
                    const query = res.utterance.replace('play ', '').replace(' on spotify', '').replace('by ', '').replace('and ', '');
                    log(`Searching for "${query}"...`);

                    let searchRes = await spotifyApi.searchTracks(query, { limit: 3, country: 'US' });
                    let tracks = searchRes.body.tracks.items;
                    log('Search results: ' + tracks.map(track => getDesc(track)).join('; ') );

                    if(tracks.length === 0){
                        respond(`No results found for ${query}`);
                        return;
                    }

                    // Add track to queue, skip to next track
                    await axiosInstance.post(`/v1/me/player/queue?uri=${tracks[0].uri}&device_id=${deviceId}`);
                    await axiosInstance.post(`/v1/me/player/next?device_id=${deviceId}`);

                    respond(`Now playing ${getDesc(tracks[0])}`);
                    return;
                }

                if(res.intent === 'spotify.pause'){
                    await spotifyApi.pause();
                    log('Spotify paused');
                    respond();
                    return;
                }
        
                if (res.intent === 'spotify.resume') {
                    await spotifyApi.play();
                    log('Spotify resumed');
                    respond();
                    return;
                }
                
                if (res.intent === 'spotify.next') {
                    await spotifyApi.skipToNext();
                    log('Spotify skipped to next');
                    respond();
                    return;
                }
                
                if (res.intent === 'spotify.previous') {
                    await spotifyApi.skipToPrevious();
                    log('Spotify back to previous');
                    respond();
                    return;
                }

                if (res.intent === 'spotify.replay') {
                    await spotifyApi.seek(0);
                    log('Spotify replaying');
                    respond();
                    return;
                }
                        
                if (res.intent === 'spotify.current' || res.intent === 'spotify.lyrics') {
                    let apiRes = await spotifyApi.getMyCurrentPlayingTrack();
                    let track = apiRes.body.item;

                    if(apiRes && apiRes.body && track && track.name && track.artists)
                        if(res.intent.includes('current'))
                            respond(getDesc(track));
                        else {
                            open(`https://www.google.com/search?q=${getDesc(track)} lyrics`, { app: ['chrome', '--incognito'] });
                            respond();
                        }
                    else
                        respond(`I'm not sure`);
                    return;
                }

                if(res.intent === 'spotify.news') {
                    let spotifyRes = await axiosInstance.get(`/v1/shows/2AoYk2xxbBfVjagnt4mwuV`);
                    let episodes = spotifyRes.data.episodes.items;
                    
                    // Add track to queue, skip to next track
                    await axiosInstance.post(`/v1/me/player/queue?uri=${episodes[0].uri}`);
                    await axiosInstance.post(`/v1/me/player/next`);
                    respond(`Playing ${spotifyRes.data.name}`);
                    return;
                }

            } catch (err) {
                if(res.utterance.includes('stop')) {
                    respond();
                    return;
                }

                log(err, err.stack);
    
                if(!!err.statusCode && err.statusCode === 401) {
                    refreshToken(res, respond, log);
                    return;
                }
            
                if (err && err.response && err.response.data && err.response.data.error && err.response.data.error.reason && err.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
                    respond('There are no active devices to play on');
                    return;
                }
            
                respond('Error, I could not process your request');
            }
        })();
    }
};

module.exports = Spotify;
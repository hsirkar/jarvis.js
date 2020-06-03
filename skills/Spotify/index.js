const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios').default;

let spotifyApi;
let axiosInstance;

function refreshToken(res, response, log) {
    log('Refreshing access token...')
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
            headers: { 'Authorization': 'Bearer ' + spotifyApi.getAccessToken() }
        });
    },
    willStealIntent: utterance => utterance.startsWith('play '),
    doesHandleIntent: intentName => intentName.startsWith('spotify'),
    handleIntent: (res, respond, log) => {
        (async() => {
            try {
                if(res.utterance.startsWith('play ')){
                    const query = res.utterance.replace('play ', '').replace(' on spotify', '').replace('by ', '').replace('and ', '');
                    log(`Searching for "${query}"...`)

                    let searchRes = await spotifyApi.searchTracks(query, { limit: 3, country: 'US' });
                    let tracks = searchRes.body.tracks.items;
                    log('Search results: ' + tracks.map(track => getDesc(track)));

                    if(tracks.length === 0){
                        respond(`No results found for ${query}`);
                        return;
                    }

                    // Add track to queue, skip to next track
                    await axiosInstance.post(`/v1/me/player/queue?uri=${tracks[0].uri}`);
                    await axiosInstance.post(`/v1/me/player/next`);

                    respond(`Now playing ${getDesc(tracks[0])}`);
                    return;
                }

                if(res.intent === 'spotify.pause'){
                    await spotifyApi.pause();
                    respond();
                    return;
                }
        
                if (res.intent === 'spotify.resume') {
                    await spotifyApi.play();
                    respond();
                    return;
                }
                
                if (res.intent === 'spotify.next') {
                    await spotifyApi.skipToNext();
                    respond();
                    return;
                }
                
                if (res.intent === 'spotify.previous') {
                    await spotifyApi.skipToPrevious();
                    respond();
                    return;
                }

                if (res.intent === 'spotify.replay') {
                    await spotifyApi.seek(0);
                    respond();
                    return;
                }
                        
                if (res.intent === 'spotify.current') {
                    let res = await spotifyApi.getMyCurrentPlayingTrack();
                    let track = res.body.item;

                    if(res && res.body && track && track.name && track.artists)
                        respond(getDesc(track));
                    else
                        respond(`I'm not sure`);
                    return;
                }

            } catch (err) {
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
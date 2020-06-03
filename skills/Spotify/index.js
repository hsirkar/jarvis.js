const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios').default;

let spotifyApi;
let axiosInstance;

function handleError(err) {
    if (err && err.response && err.response.data && err.response.data.error && err.response.data.error.reason && err.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
        respond('There are no active devices to play on');
        return;
    }
    if (err.response && err.response.data)
        console.log(err.response.data)
    else
        console.log(err, err.stack);
    respond('There was an error with your request');
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
        // Find and play a song
        if(res.utterance.startsWith('play ')) {
            const query = res.utterance.replace('play ', '').replace(' on spotify', '').replace('by ', '').replace('and ', '');
            (async () => {
                try {
                    // Search for track
                    log(`Searching for "${query}"...`)
                    let res = await spotifyApi.searchTracks(query, { limit: 3, country: 'US' });
                    let tracks = res.body.tracks.items;
                    log('Search results: ' + tracks.map(track => getDesc(track)));

                    if(tracks.length === 0){
                        respond(`No results found for ${query}`);
                        return;
                    }

                    let track = tracks[0];

                    // Add track to queue, skip to next track
                    await axiosInstance.post(`/v1/me/player/queue?uri=${track.uri}`);
                    await axiosInstance.post(`/v1/me/player/next`);

                    respond(`Now playing ${getDesc(track)}`);
                } catch (err) {
                    handleError(err);
                }
            })();
            return;
        }

        if(res.intent === 'spotify.pause'){
            spotifyApi.pause()
                .then(() => respond())
                .catch(err => handleError(err));
            return;
        }

        if (res.intent === 'spotify.resume') {
            spotifyApi.play()
                .then(() => respond())
                .catch(err => handleError(err));
            return;
        }
        
        if (res.intent === 'spotify.next') {
            spotifyApi.skipToNext()
                .then(() => respond())
                .catch(err => handleError(err));
            return;
        }
        
        if (res.intent === 'spotify.previous') {
            spotifyApi.skipToPrevious()
                .then(() => respond())
                .catch(err => handleError(err));
            return;
        }
                
        if (res.intent === 'spotify.current') {
            spotifyApi.getMyCurrentPlayingTrack()
                .then(res => {
                    let track = res.body.item;

                    if(track && track.name && track.artists)
                        respond(getDesc(track));
                    else
                        respond(`I'm not sure`);
                })
                .catch(err => handleError(err));
            return;
        }
        
        if (res.intent === 'spotify.replay') {
            spotifyApi.seek(0)
                .then(() => respond())
                .catch(err => handleError(err));
            return;
        }

        respond('I do not understand');
    }
};

module.exports = Spotify;
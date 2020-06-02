const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios').default;

let spotifyApi;
let axiosInstance;

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
    doesHandleIntent: () => false,
    handleIntent: (res, respond, log) => {
        const query = res.utterance.replace('play ', '').replace(' on spotify', '').replace('by ', '').replace('and ', '');

        (async () => {
            try {
                // Search for track
                log(`Searching for "${query}"...`)
                let res = await spotifyApi.searchTracks(query, { limit: 3, country: 'US' });
                let tracks = res.body.tracks.items;
                log('Search results: ' + tracks.map(track => `${track.name} by ${track.artists[0].name} ${track.artists[1] ? 'and ' + track.artists[1].name : ''}`));
                let track = tracks[0];

                // Add track to queue, skip to next track
                await axiosInstance.post(`/v1/me/player/queue?uri=${track.uri}`);
                await axiosInstance.post(`/v1/me/player/next`);

                respond(`Now playing ${track.name} by ${track.artists[0].name} ${track.artists[1] ? 'and ' + track.artists[1].name : ''}`);
            } catch (err) {
                if(err && err.response && err.response.data && err.response.data.error && err.response.data.error.reason && err.response.data.error.reason === 'NO_ACTIVE_DEVICE') {
                    respond('There are no active devices to play on');
                    return;
                }
                // console.error(err);
                console.error(err);
                respond('There was an error with your request');
            }
        })();
    }
};

module.exports = Spotify;










// const SpotifyWebApi = require('spotify-web-api-node');

// const spotifyApi = new SpotifyWebApi({
//     clientId: process.env.SPOTIFY_CLIENT_ID,
//     clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
//     redirectUri: 'https://example.com/callback',
//     accessToken: process.env.SPOTIFY_ACCESS_TOKEN,
//     refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
// });

// const utterance = 'middle child';
// const query = utterance.replace('play ', '').replace(' on spotify', '').replace('by ', '').replace('and ', '');

// let trackUri = '';

// const instance = axios.create({
//     baseURL: 'https://api.spotify.com',
//     headers: { 'Authorization': 'Bearer ' + spotifyApi.getAccessToken() }
// });

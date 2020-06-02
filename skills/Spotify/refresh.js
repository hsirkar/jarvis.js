const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'https://example.com/callback',
    accessToken: process.env.SPOTIFY_ACCESS_TOKEN,
    refreshToken: process.env.SPOTIFY_REFRESH_TOKEN
});

spotifyApi.refreshAccessToken().then(
    function (data) {
        console.log('The access token has been refreshed!');
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log(data.body['access_token']);
    },
    function (err) {
        console.log('Could not refresh access token', err);
    }
);
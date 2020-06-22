const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: 'https://example.com/callback'
});

console.log(process.env.SPOTIFY_CLIENT_ID);

// Fill out authorization code below after clicking on the url and granting access
const authorizationCode = 'AQBZFOE09Yx3FXZibaw_eMQSomJwH6rSd33yBu0cTWu8vltUtlpC7ram-qFbjfTPHU1KP_uYFBm79MuAPn0iw-IdPBhtvV9rwDf3S1jRDGpp5dcLf8M0SF79mVG-3yQ4fVNGkV93T9KkDsScAEtawxdMgrCn5pzOauMUSGPSORSohquTmJTGNGabb_CGCZ_nHseHADirE77Sy0R9U7HSK5R7s5rl7QglYgcSWuQzBueuMA7LlWHRwfVFEgIMl8NyauVuqg0Fj3LqJWbRv6py29XMDa_isvvcJOJ8atBorjxBBqBaUur_DMvBIar5N1kNMiwhS0S6Q9XQ7kUflExuZ3xT0iV1BDpGkWpsvOO2hkN1pQhV7r9LN1xfeX5wQ8LCpIz7riR3X6xwMJmiMYPh6Zo4vidgjqHxlM7PNmiyIEHMMSN1PvSiM7fnPvLvphjEMP1J4MO-ESpRB3Z-L5KLRDoam97k2dzma_86i0jtwyq_gV7epLutLwspCudYwk3Vmx-qa73Hch9UQZg3J0QuJrMbSTHODL6164HOoI1WVwjg0TlvhJf5yQLOLOiHaKj3m1pD30zK6UekQV6SnG9zdxWuWajduZYn22uRFnwg5lgTAXOE';

if(authorizationCode === '') {
    const authorizeURL = spotifyApi.createAuthorizeURL([
        'user-read-private',
        'user-read-email',
        'user-read-playback-state',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-follow-modify',
        'user-follow-read',
        'user-library-modify',
        'user-library-read',
        'user-read-private',
        'user-top-read',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-read-recently-played'
    ],  'authorized');
    console.log(authorizeURL);
    return;
}

spotifyApi
    .authorizationCodeGrant(authorizationCode)
    .then(data => {
        console.log('Retrieved access token', data.body['access_token']);
        console.log('Retrieved refresh token', data.body['refresh_token']);
    });
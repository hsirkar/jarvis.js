const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const { log } = require('../../util');

require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = './cache/gc-token.json';
const authCode = '4/1QEGsdkXM2cEXgEwRbmhpz9dX-YBqhE2B7I6Yrqvn79gTIGn574LoS8';

function authorize(callback) {
    const oauth = new google.auth.OAuth2(
        process.env.GC_CLIENT_ID,
        process.env.GC_CLIENT_SECRET,
        process.env.GC_CLIENT_REDIRECT_URI,
    );

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oauth, callback);
        oauth.setCredentials(JSON.parse(token));
        callback(oauth);
    });
}

function getAccessToken(oauth, callback) {
    const authUrl = oauth.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    log('Authorize this app by visiting this url:', authUrl);

    oauth.getToken(authCode, (err, token) => {
        if(err) {
            log('Error retrieving access token: ' + err);
            return;
        }

        oauth.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        log('Token stored to' + TOKEN_PATH);

        callback(oauth);
    });
}



// /**
//  * Lists the next 10 events on the user's primary calendar.
//  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
//  */
// function listEvents(auth) {
//     const calendar = google.calendar({ version: 'v3', auth });
//     calendar.events.list({
//         calendarId: 'primary',
//         timeMin: (new Date()).toISOString(),
//         maxResults: 10,
//         singleEvents: true,
//         orderBy: 'startTime',
//     }, (err, res) => {
//         if (err) return console.log('The API returned an error: ' + err);
//         const events = res.data.items;
//         if (events.length) {
//             console.log('Upcoming 10 events:');
//             events.map((event, i) => {
//                 const start = event.start.dateTime || event.start.date;
//                 console.log(`${start} - ${event.summary}`);
//             });
//         } else {
//             console.log('No upcoming events found.');
//         }
//     });
// }

// authorize(listEvents);

module.exports = { authorize };
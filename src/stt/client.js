const express = require('express');
const app = express();
const open = require('open');
const path = require('path');

function init() {
    app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'client.html')));
    app.get('/acknowledge.mp3', (_, res) => res.sendFile(path.resolve('res/acknowledge.mp3')));
    app.listen(8000);

    if(process.env.OPEN_STT_CLIENT === '1')
        open('http://localhost:8000', { app: ['chrome', '--incognito'] });
}

module.exports = { init };
const express = require('express');
const app = express();
const open = require('open');

function init() {
    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/client.html');
    });
    
    app.listen(8000);
    open('http://localhost:8000', { app: ['chrome', '--incognito'] });
}

module.exports = { init };
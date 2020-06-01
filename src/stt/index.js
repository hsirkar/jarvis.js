const io = require('socket.io')();
const open = require('open');

function init(log, spinner, nlp, handleIntent) {
    log('Creating STT server and opening client...');
    
    open(__dirname + '/index.html', { app: ['chrome', '--incognito'] });

    io.on('connection', client => {
        log('Connected to STT client');
        
        client.on('final_transcript', message => {
            log(`Message received from STT client: ${message}`);
            
            spinner.start();
            nlp.process('en', message).then(res => handleIntent(res));
        });

        client.on('disconnect', () => {
            log('Disconnected from STT client');
        });
    });

    io.listen(3000);
}

module.exports = { init };
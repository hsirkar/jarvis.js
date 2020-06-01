const io = require('socket.io')();
const client = require('./client');

function init(log, spinner, nlp, handleIntent) {
    log('Creating STT server and opening client...');

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

    client.init();
}

module.exports = { init, io };
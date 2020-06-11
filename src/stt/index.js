const io = require('socket.io')();
const client = require('./client');

const stt = {
    isQuestion: false,
    callback: ()=>{},
    init: (log, onInputReceived) => {
        log('Creating STT server and opening client...');

        io.on('connection', client => {
            log('Connected to STT client');
            
            client.on('final_transcript', message => {
                log(`Message received from STT client: ${message}`);
                onInputReceived(message, stt.isQuestion, stt.callback);
            });
    
            client.on('disconnect', () => {
                log('Disconnected from STT client');
            });
        });
    
        io.listen(3000);
    
        client.init();
    },
    start: () => {
        io.emit('start');
    },
    stop: () => {
        io.emit('stop');
    }
}

stt.io = io;
module.exports = stt;
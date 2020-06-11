const mic = require('mic');
const Speaker = require('speaker');
const BumbleBee = require('bumblebee-hotword-node');

let micInstance;
let micInputStream;
let bb;
let playback = false;

function init(log, stt) {
    micInstance = mic({
        rate: '16000',
        channels: '1',
        format: 'wav'
    });

    micInputStream = micInstance.getAudioStream();
    micInputStream.on('startComplete', () => log(`Mic input stream started`));
    micInputStream.on('stopComplete', () => log('Mic input stream stopped'));
    micInputStream.on('error', e => log(`Error in mic input stream: ${e}`));

    micInstance.start();

    bb = new BumbleBee();
    bb.addHotword('grasshopper');

    bb.on('hotword', hotword => {
        log(`Hotword detected: ${hotword}, alerting STT client...`);
        stt.start();
    });

    bb.start(micInputStream, 32000);

    if (playback) {
        let speaker = new Speaker({ channels: 1, bitDepth: 16, sampleRate: 32000 });
        micInputStream.pipe(speaker);
    }
}

module.exports = { init };
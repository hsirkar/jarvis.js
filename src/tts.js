const AWS = require('aws-sdk');
const Speaker = require('speaker');
const Stream = require('stream');
const sha1 = require('sha1');
const fs = require('fs');
// const Spotify = require('../skills/Spotify');
const { log } = require('./util');

let ttsEngine;
let polly;
let say;
let callback;
let speaker;

function init(params) {
    Object.assign(this, params);
    ttsEngine = process.env.TTS_ENGINE;

    AWS.config.accessKeyId = process.env.ACCESS_KEY_ID;
    AWS.config.secretAccessKey = process.env.SECRET_ACCESS_KEY;
    AWS.config.region = 'us-east-1';
    polly = new AWS.Polly({ region: 'us-east-1' });

    say = require('say');
}

function stop() {
    if(speaker && speaker.close)
        speaker.close();
}

function speak(text, cb=()=>{}){
    if(!text)
        return;

    text = text.toString();
    callback = cb;

    const { Spotify } = this;

    Spotify.api('setVolume', ['30'])
        .then(() => {
            const old = callback;
            callback = () => {
                Spotify.api('setVolume', ['60']).catch(() => {});
                old();
            };
        })
        .catch(() => {})
        .finally(() => {
            if(ttsEngine === 'polly'){
                speakPolly(text, callback);
            } else {
                speakOffline(text, callback);
            }
        });
}

function speakOffline(text, cb){
    say.speak(text, undefined, 1.2, err => {
        if(err)
            return console.err(err);
        cb();
    });
}

function speakPolly(text, cb){
    const map = {
        'rakrish': 'ra-kreesh',
        'Rakrish': 'Ra-kreesh'
    }

    for(const elem in map){
        text = text.replace(elem, map[elem]);
    }

    // Play from cache
    if(fs.existsSync('cache/polly/' + sha1(text))){
        let readStream = new fs.createReadStream('cache/polly/' + sha1(text));
        speaker = new Speaker({ channels: 1, bitDepth: 16, sampleRate: 16000 });
        readStream.on('open', function(){
            readStream.pipe(speaker);
            speaker.on('close', () => cb());
        });
        return;
    }

    const options = {
        OutputFormat: 'pcm',
        Text: `<speak><prosody rate="110%">${htmlEntities(text)}</prosody></speak>`,
        TextType: 'ssml',
        VoiceId: 'Matthew',
        Engine: 'neural'
    };

    polly.synthesizeSpeech(options, (err, data) => {
        if(err) {
            log(err, err.stack);
            speakOffline(text, callback);
        }
        else if (data){
            if(data.AudioStream instanceof Buffer) {
                let bufferStream = new Stream.PassThrough();
                bufferStream.end(data.AudioStream);

                // Save to cache
                let fileStream = fs.WriteStream('cache/polly/' + sha1(text));
                bufferStream.pipe(fileStream);

                (async() => {
                    speaker = new Speaker({ channels: 1, bitDepth: 16, sampleRate: 16000 });
                    bufferStream.pipe(speaker);
                    speaker.on('close', () => cb());
                })();
                
            }
        } 
    });

}

function getAudioBuffer(text, cb=()=>{}){
    const map = {
        'rakrish': 'ra-kreesh',
        'Rakrish': 'Ra-kreesh'
    }

    for(const elem in map){
        text = text.replace(elem, map[elem]);
    }

    // Play from cache
    if(fs.existsSync('cache/polly/' + sha1(text))){
        log('Getting from cache...');
        return fs.readFileSync('cache/polly/' + sha1(text));
    }

    const options = {
        OutputFormat: 'pcm',
        Text: `<speak><prosody rate="110%">${htmlEntities(text)}</prosody></speak>`,
        TextType: 'ssml',
        VoiceId: 'Matthew',
        Engine: 'neural'
    };

    log('Getting from Polly...');
    polly.synthesizeSpeech(options, (err, data) => {
        if(err)
            console.log(err, err.stack);
        else if (data){
            if(data.AudioStream instanceof Buffer) {
                let fileStream = fs.WriteStream('cache/polly/' + sha1(text));
                // bufferStream.pipe(fileStream);
                fileStream.on('close', () => {
                    let audio = fs.readFileSync('cache/polly/' + sha1(text));
                    return audio;
                });
            }
        } 
    });

}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { init, speak, stop, getAudioBuffer };
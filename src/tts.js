const AWS = require('aws-sdk');
const Speaker = require('speaker');
const Stream = require('stream');
const sha1 = require('sha1');
const fs = require('fs');
const { log } = require('./util');
const axios = require('axios').default;
const lame = require('lame');

const instance = axios.create({
    method: 'get',
    headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Dnt': '1',
        'Referer': 'https://translate.google.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0'
    },
    responseType: 'stream'
});

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

function speak(text, language){
    if(!text)
        return;

    text = text.toString();

    const { Spotify } = this;

    Spotify.api('setVolume', ['30'])
        .then(() => {
            callback = () => {
                Spotify.api('setVolume', ['60']).catch(() => {});
            };
        })
        .catch(() => {})
        .finally(() => {
            if(language && !language.startsWith('en-')) {
                instance(`https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodeURIComponent(text)}`)
                    .then(res => {
                        let decoder = new lame.Decoder();
                        res.data.pipe(decoder);
                        speaker = new Speaker({ channels: 1, bitDepth: 16, sampleRate: 24000 });
                        decoder.pipe(speaker);
                        speaker.on('close', () => callback());
                    })
                    .catch(err => {
                        log(err);
                        callback();
                    });
                return;
            }

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

    for(const elem in map)
        text = text.replace(elem, map[elem]);

    text = text.replace(/(?<=[0-9])'|′|''|′′|″/g, '');

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

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { init, speak, stop };
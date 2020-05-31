const AWS = require('aws-sdk');
const Speaker = require('speaker');
const Stream = require('stream');

let ttsEngine;
let polly;
let say;

function init() {
    ttsEngine = process.env.TTS_ENGINE;

    AWS.config.accessKeyId = process.env.ACCESS_KEY_ID;
    AWS.config.secretAccessKey = process.env.SECRET_ACCESS_KEY;
    AWS.config.region = 'us-east-1';
    polly = new AWS.Polly({ region: 'us-east-1' });

    say = require('say');
}

function speak(text, cb=()=>{}){
    if(ttsEngine === 'polly'){
        speakPolly(text, cb);
    } else {
        speakOffline(text, cb);
    }
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

    const options = {
        OutputFormat: 'pcm',
        Text: `<speak><prosody rate="110%">${htmlEntities(text)}</prosody></speak>`,
        TextType: 'ssml',
        VoiceId: 'Matthew',
        Engine: 'neural'
    };

    polly.synthesizeSpeech(options, (err, data) => {
        if(err)
            console.log(err, err.stack);
        else if (data){
            if(data.AudioStream instanceof Buffer) {
                let bufferStream = new Stream.PassThrough();
                bufferStream.end(data.AudioStream);

                (async() => {
                    let speaker = new Speaker({ channels: 1, bitDepth: 16, sampleRate: 16000 });
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

module.exports = { init, speak };
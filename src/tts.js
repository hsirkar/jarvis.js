const AWS = require('aws-sdk');
const Speaker = require('speaker');
const Stream = require('stream');

let polly;

function init() {
    AWS.config.accessKeyId = process.env.ACCESS_KEY_ID;
    AWS.config.secretAccessKey = process.env.SECRET_ACCESS_KEY;
    AWS.config.region = 'us-east-1';
    polly = new AWS.Polly({ region: 'us-east-1' });
}

function getSpeaker(){
    return new Speaker({ channels: 1, bitDepth: 16, sampleRate: 16000 });
}

const map = {
    'rakrish': 'ra-kreesh',
    'Rakrish': 'Ra-kreesh'
}

function speak(text){
    for(const elem in map){
        text = text.replace(elem, map[elem]);
    }

    const options = { OutputFormat: 'pcm', Text: `<speak><prosody rate="110%">${htmlEntities(text)}</prosody></speak>`, TextType: 'ssml', VoiceId: 'Matthew', Engine: 'neural' }
    polly.synthesizeSpeech(options, (err, data) => {
        if(err)
            console.log(err, err.stack);
        else if (data){
            // console.log(data.AudioStream);
            if(data.AudioStream instanceof Buffer) {
                let bufferStream = new Stream.PassThrough();
                bufferStream.end(data.AudioStream);
                bufferStream.pipe(getSpeaker());
            }
        } 
    });
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { init, speak };
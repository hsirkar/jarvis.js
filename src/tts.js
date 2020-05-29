const AWS = require('aws-sdk');
const Speaker = require('speaker');
const Stream = require('stream');

// TTS Engine
AWS.config.accessKeyId = process.env.ACCESS_KEY_ID;
AWS.config.secretAccessKey = process.env.SECRET_ACCESS_KEY;
AWS.config.region = 'us-east-1';
const polly = new AWS.Polly({ region: 'us-east-1' });

function getSpeaker(){
    return new Speaker({ channels: 1, bitDepth: 16, sampleRate: 16000 });
};

function speak(text){
    const options = { OutputFormat: 'pcm', Text: text, TextType: 'text', VoiceId: 'Matthew', Engine: 'neural' }
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

module.exports = { speak };
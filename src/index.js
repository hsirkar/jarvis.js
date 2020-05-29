const readline = require('readline');
const { NlpManager } = require('node-nlp');
const chalk = require('chalk');
const ora = require('ora');
const AWS = require('aws-sdk');
const Speaker = require('speaker');
const Stream = require('stream');

// Clear console
const blank = '\n'.repeat(process.stdout.rows)
console.log(blank)
readline.cursorTo(process.stdout, 0, 0)
readline.clearScreenDown(process.stdout)

// Load spinner
const spinner = ora('Processing...');
spinner.spinner = {
    'interval': 80,
    'frames': ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
};

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

// NLP Engine
const manager = new NlpManager({ languages: ['en'] });
const trainnlp = require('./train-nlp');

trainnlp(manager).then(() => {
    // Terminal I/O
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Ask the prompt.
    function prompt() {
        rl.question('> ', input => {
            spinner.start();
            manager.process('en', input)
                .then(res => respond(res.answer));
        });
    }

    // Jarvis's final response
    function respond(message) {
        spinner.stop();
        console.log(chalk.cyan('J: ' + message + ''));
        speak(message);
        prompt();
    }

    respond('Jarvis has finished booting up.');
});

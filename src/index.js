// Imports
const readline = require('readline');
const { NlpManager } = require('node-nlp');
const chalk = require('chalk');
const ora = require('ora');

const train = require('./train');
const tts = require('./tts');

// Settings
const enableTTS = false;
const debug = true;

// Clear console
const blank = '\n'.repeat(process.stdout.rows)
console.log(blank)
readline.cursorTo(process.stdout, 0, 0)
readline.clearScreenDown(process.stdout)

// Load spinner
const spinner = ora(chalk.gray('Processing...'));
spinner.spinner = {
    'interval': 80,
    'frames': ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
};

// NLP Engine
const manager = new NlpManager({ languages: ['en'] });
train(manager).then(() => respond('Jarvis has finished booting up.'));

// Terminal I/O
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask the prompt.
function prompt() {
    rl.question('> ', input => {
        spinner.start();

        // Convert utterance to intent using ML
        manager.process('en', input)
            .then(res => {
                // Print out intent details
                debug && log(JSON.stringify({ intent: res.intent, score: res.score }));

                // Process the intent determined by ML
                processIntent(res);
            });
    });
}

// Jarvis's final response
function respond(message) {
    spinner.stop();
    console.log(chalk.cyan('J: ' + message + ''));
    enableTTS && tts.speak(message);
    prompt();
}

// Debug messages
function log(message) {
    isSpinning = spinner.isSpinning;
    isSpinning && spinner.stop();
    console.log(chalk.gray(message));
    isSpinning && spinner.start();
}

function processIntent(res){
    respond("Final answer.")
}
const readline = require('readline');
const { NlpManager } = require('node-nlp');
const chalk = require('chalk');
const ora = require('ora');

const train = require('./train');
const tts = require('./tts');

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
        manager.process('en', input)
            .then(res => respond(res.answer));
    });
}

// Jarvis's final response
function respond(message) {
    spinner.stop();
    console.log(chalk.cyan('J: ' + message + ''));
    tts.speak(message);
    prompt();
}
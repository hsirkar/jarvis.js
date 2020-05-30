// Imports
const readline = require('readline');
const { dockStart } = require('@nlpjs/basic');
const chalk = require('chalk');
const ora = require('ora');
const moment = require('moment');

const train = require('./train');
const tts = require('./tts');

const skills = require('../skills');
const Fallback = require('../skills/Fallback');

// Settings
const enableTTS = true;
const debug = false;

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
let nlp;
(async() => {
    nlp = (await dockStart({ use: ['Basic'] })).get('nlp');
    nlp.addLanguage('en');
    await train(nlp, skills);
    respond('Jarvis has finished booting up');
})();

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
        nlp.process('en', input).then(res => handleIntent(res));
    });
}

// Jarvis's final response
function respond(message) {
    if(!!message){
        if(Array.isArray(message))
            message = message[Math.floor(Math.random() * message.length)];
        message = message.toString();

        spinner.stop();
        log(`Final response: ${message}`);
        console.log(chalk.cyan('J: ' + message + ''));
        enableTTS && tts.speak(message);
    }
    spinner.stop();
    prompt();
}

// Debug messages
function log(message) {
    if(!debug)
        return;

    isSpinning = spinner.isSpinning;
    isSpinning && spinner.stop();
    console.log(chalk.gray(moment().format('MM/DD/YY HH:mm:ss.SS: ') + message));
    isSpinning && spinner.start();
}

// Handle the intent determined by ML
function handleIntent(res){
    // Print out intent details
    log(JSON.stringify({ utterance: res.utterance, intent: res.intent, score: res.score }));

    if(res.utterance.startsWith('echo ')){
        log('Echo command detected, skipping skills');
        respond(res.utterance.replace('echo ', ''));
        return;
    }

    skill = skills.find(skill => skill.doesHandleIntent(res.intent));

    if(skill){
        if(res.score < 0.70){
            log('Match score too low, using Fallback...');
            Fallback.handleIntent(res, respond, log);
            // problem: duckduckgoskill still returns a random answer from original skill/intent
        }else{
            log(`Handing intent through ${skill.name}...`);
            skill.handleIntent(res, respond, log);
        }
    }else{
        log(`No skill found.`)
        respond("Oops, no skill can handle that intent.");
    }
}
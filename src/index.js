// Imports
const readline = require('readline');
const { dockStart } = require('@nlpjs/basic');
const chalk = require('chalk');
const ora = require('ora');
const moment = require('moment');

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
let nlp;
(async() => {
    nlp = (await dockStart({ use: ['Basic'] })).get('nlp');
    nlp.addLanguage('en');
    await train(nlp);
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
    spinner.stop();
    log(`Final response: ${message}`);
    console.log(chalk.cyan('J: ' + message + ''));
    enableTTS && tts.speak(message);
    prompt();
}

// Debug messages
function log(message) {
    isSpinning = spinner.isSpinning;
    isSpinning && spinner.stop();
    console.log(chalk.gray(moment().format('MM/DD/YY HH:mm:ss.SS: ') + message));
    isSpinning && spinner.start();
}

// Handle the intent determined by ML
function handleIntent(res){
    // Print out intent details
    debug && log(JSON.stringify({ utterance: res.utterance, intent: res.intent, score: res.score, answers: res.answers }));

    skill = skills.find(skill => skill.doesHandleIntent(res.intent));

    if(skill){
        debug && log(`Handing intent through ${skill.name}...`);
        skill.handleIntent(res);
    }else{
        debug && log(`No skill found.`)
        respond("Oops, no skill can handle that intent.");
    }
}

// Skills
const PersonalitySkill = {
    name: 'PersonalitySkill',
    doesHandleIntent: intentName => {
        for(let domain of ['user', 'agent', 'greetings', 'appraisal', 'dialog', 'None'])
            if(intentName.startsWith(domain))
                return true;

        return false;
    },
    handleIntent: res => {
        respond(res.answer);
    }
};

const DateTimeSkill = {
    name: 'DateTimeSkill',
    doesHandleIntent: intentName => {
        return intentName.startsWith('datetime');
    },
    handleIntent: res => {
        const date = moment();
        respond(
            res.answer
                .replace('%time%', date.format('LT'))
                .replace('%date%', date.format('dddd, MMMM Do'))
                .replace('%month%', date.format('MMMM'))
                .replace('%year%', date.format('YYYY'))
        );
    }
};

const skills = [ PersonalitySkill, DateTimeSkill ]; //, WolframSkill, DuckDuckGoSkill, WikipediaSkill ];
// Imports
const readline = require('readline');
const { NlpManager } = require('node-nlp');
const chalk = require('chalk');
const ora = require('ora');
const moment = require('moment');

const train = require('./train');
const tts = require('./tts');
const stt = require('./stt');
const hotword = require('./hotword');

const skills = require('../skills');
const Fallback = require('../skills/Fallback');
const Spotify = require('../skills/Spotify');

require('dotenv').config();

// Clear console
const blank = '\n'.repeat(process.stdout.rows);
console.log(blank);
readline.cursorTo(process.stdout, 0, 0);
readline.clearScreenDown(process.stdout);

// Terminal I/O
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Load spinner
const spinner = ora(chalk.gray('Processing...'));
spinner.spinner = {
    'interval': 80,
    'frames': ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
};

// Load skills
skills.forEach(skill => {
    if(!!skill.init)
        skill.init(respond, log, ask);
});
log(`Finished loading skills`);

// Load TTS
tts.init();
log(`Finished loading TTS`);

// Load NLP engine
let nlp;
(async() => {
    nlp = new NlpManager({ languages: ['en'] });
    try {
        await train(nlp, skills, log);
    } catch (err) { console.error(err); }
    log(`Finished loading NLP`);

    // Load STT
    stt.init(log, onInputReceived);
    log(`Finished loading STT`);
    
    // Load wakeword detector
    hotword.init(log, stt);
    log(`Finished loading hotword detector`);

    respond('Finished booting');
})();

// Ask the prompt.
function prompt(isQuestion=false, callback=()=>{}) {
    rl.question('', input => onInputReceived(input, isQuestion, callback));
}

// Process the input (determine if input should be dismissed, used to answer question, or sent to NLP for new intent)
function onInputReceived(input, isQuestion=false, callback=()=>{}) {
    // Dismiss input if dismissal word
    let dismissed = false;

    for (word of ['never mind', 'nevermind', 'quit', 'leave', 'exit']) {
        if (input === word) {
            dismissed = true;
            break;
        }
    }

    if (dismissed) {
        log('Dismissed');
        respond();
        return;
    }

    if(input === 'stop' || input === 'stop talking' || input === 'shut up' || input === 'shush' || input === 'be quiet') {
        log('Shutting up...');
        tts.stop();
    }

    spinner.start();

    // If user's input is reply to a question
    if (isQuestion) {
        log(`User's response: ${input}`);
        callback(input);
        return;
    }

    // Convert utterance to intent using ML
    nlp.process('en', input.toLowerCase())
        .then(res => handleIntent(res))
        .catch(err => {
            log(err, err.stack);
            respond('There was an error with your request');
        });
}

// Jarvis's final response
// isQuestion -> whether the response is a question
// callback -> if isQuestion, then what to do after user answers
function respond(message, isQuestion=false, callback=()=>{}) {
    if(!!message){
        if(Array.isArray(message))
            message = message[Math.floor(Math.random() * message.length)];
        message = message.toString();

        spinner.stop();

        if(isQuestion)
            log(`Asking user question: ${message}`);
        else
            log(`Final response: ${message}`);
            
        console.log(chalk.cyan('J: ' + message + ''));
        process.env.ENABLE_TTS === '1' && tts.speak(message, ()=>{}, Spotify);
    }
    spinner.stop();
    prompt(isQuestion, callback);
}

// Ask user question, send answer to callback function
function ask(question, callback){
    respond(question, true, callback);
}

// Debug messages
function log(message) {
    if(process.env.DEBUG !== '1')
        return;

    isSpinning = spinner.isSpinning;
    isSpinning && spinner.stop();
    console.log(chalk.gray(moment().format('MM/DD/YY HH:mm:ss.SS: ') + message));
    isSpinning && spinner.start();
}

// Handle the intent determined by ML
function handleIntent(res){
    // Print out intent details
    const { classifications, locale, languageGuessed, answers, entities, sourceEntities,
        language, localeIso2, nluAnswer, actions, sentiment, domain, ...rest } = res;

    log(JSON.stringify(rest, null, 2));
        
    // Override NLP result
    skills.forEach(skill => skill.override && skill.override(res));

    // Find proper skill to handle intent
    let matched = skills.find(skill => skill.doesHandleIntent(res.intent));

    if(!matched){
        log(`No skill found to handle that intent`);
        respond('Oops, no skill can handle that intent');
        return;
    }
    
    // Auto fallback if match score less than threshold
    if(res.score < 0.72){
        log(`Match score too low!`);
        matched = Fallback;
    }

    log(`Handling intent through ${matched.name}`);
    matched.handleIntent(res);
}
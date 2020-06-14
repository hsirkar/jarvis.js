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
const Routines = require('../skills/Routines');
const System = require('../skills/System');

const { randomElement } = require('./util');

let spinner;
let rl;
let nlp;

let previous = {};
let current = {};

const init = () => {
    require('dotenv').config();

    // Clear console
    const blank = '\n'.repeat(process.stdout.rows);
    console.log(blank);
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);

    // Terminal I/O
    if(!rl){
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // Load spinner
    spinner = ora(chalk.gray('Processing...'));
    spinner.spinner = {
        'interval': 80,
        'frames': ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
    };

    // Load skills
    skills.forEach(skill => {
        if(!!skill.init)
            skill.init(log, ask);
    });
    Routines.setOnInputReceived(onInputReceived);
    System.setInit(init);
    Fallback.setPrevious(previous);
    log(`Finished loading skills`);

    // Load TTS
    tts.init();
    log(`Finished loading TTS`);

    // Load NLP engine
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

        respond(process.env.ALERT_ON_BOOT === '1' ? 'Finished booting' : '');
    })();
};

init();

// Ask the prompt.
function prompt(isQuestion=false, callback=()=>{}) {
    Object.assign(stt, { isQuestion, callback });

    if(isQuestion)
        stt.start();

    rl.question('', input => onInputReceived(input, isQuestion, callback));
}

// Process the input (determine if input should be dismissed, used to answer question, or sent to NLP for new intent)
function onInputReceived(input, isQuestion=false, callback=()=>{}) {
    spinner.start();

    // If user's input is reply to a question
    if (isQuestion) {
        log(`User's response: ${input}`);
        callback(input);
        stt.stop();
        return;
    }

    // Convert utterance to intent using ML
    nlp.process('en', input.toLowerCase())
        .then(res => {
            current.res = res;

            const { utterance, intent, score, answer } = res;
            log(JSON.stringify({ utterance, intent, score, answer }, null, 2));

            // Override NLP result
            skills.forEach(skill => skill.override && skill.override(res));

            // Find proper skill to handle intent
            let matched = skills.find(skill => skill.doesHandleIntent(res.intent));

            if (!matched) {
                log(`No skill found to handle that intent`);
                return 'Oops, no skill can handle that intent';
            }

            // Auto fallback if match score less than threshold
            if (res.score < 0.735) {
                log(`Match score too low!`);
                matched = Fallback;
            }

            log(`Handling intent through ${matched.name}`);

            const timeout = new Promise(resolve => setTimeout(() => resolve('Request timed out'), 20000));
            return Promise.race([ timeout, matched.handleIntent(res) ]);
        })
        .then(res => {
            respond(res);
            if(callback && typeof callback === 'function') {
                callback();
            }
            previous.res = current.res;
            current.res = null;
        })
        .catch(err => {
            error(err);
            respond('There was an error with your request');
        });
}

// Jarvis's final response
// isQuestion -> whether the response is a question
// callback -> if isQuestion, then what to do after user answers
function respond(message, isQuestion=false, callback=()=>{}) {
    spinner.stop();

    if(message){
        if(Array.isArray(message))
            message = randomElement(message);
        message = message.toString();

        if(isQuestion)
            log(`Asking user question: ${message}`);
        else
            log(`Final response: ${message}`);
            
        console.log(chalk.cyan('J: ' + message + ''));

        if(process.env.ENABLE_TTS === '1') {
            tts.speak(message, () => prompt(isQuestion, callback), Spotify);
            return;
        }
    }

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

// Debug error
function error(message) {
    if(process.env.DEBUG !== '1')
        return;

    isSpinning = spinner.isSpinning;
    isSpinning && spinner.stop();
    console.log(chalk.red(moment().format('MM/DD/YY HH:mm:ss.SS: ') + message));
    isSpinning && spinner.start();
}
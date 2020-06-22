const io = require('socket.io')();
const skills = require('./skills');
const Routines = require('./skills/Routines');
const Fallback = require('./skills/Fallback');
const nlp = require('./nlp');
const tts = require('./tts');
const db = require('./db');
const { log, spinner, randomElement, sanitizeNlpRes } = require('./util');
const { reset } = require('nodemon');

require('dotenv').config();

// Properties
const state = {
    previous: {},
    current: {},
    isQuestion: false,
    onUserAnswered: ()=>{},
    onIntentComplete: ()=>{}
}

// Load everything
async function init() {
    for(skill of skills) {
        skill.init && skill.init({ ask, say });
    }
    log('Skills loaded');
    
    tts.init();
    log('TTS loaded');
    
    db.init();
    log('Database loaded');

    await nlp.init();

    io.on('connection', client => {
        log('Connected to new client');

        client.on('message', message => {
            log('Message received: ' + message);
            io.emit('received');
            onInputReceived(message);
        });
    });
    
    // Start the server
    io.listen(3000);
    log('Now listening on port 3000');
}

init();

function onInputReceived(input) {
    spinner.start();

    // If user's input is reply to a question
    if(state.isQuestion){
        log(`User's answer: ${input}`);
        state.onUserAnswered(input);
        stopListening();
        return;
    }

    // Parse utterance into intent
    nlp.manager.process(input || 'What can you do?')
        .then(res => {
            skills.forEach(skill => skill.override && skill.override(res));
            state.current = sanitizeNlpRes(res);

            let matched = skills.find(s => s.doesHandleIntent(res.intent));
            
            if(!matched) {
                return 'Oops, no skill can handle that intent';
            }
            
            if(res.score < 0.735) {
                log('Match score too low!');
                matched = Fallback;
            }
            
            Object.assign(state.current, { matchedSkill: matched.name });

            log(`Handling intent through ${matched.name}`);

            return matched.handleIntent(res);
        })
        .then(res => {
            if(Array.isArray(res))  
                res = randomElement(res);

            res = res ? res.toString() : '';

            spinner.stop();
            log('Final response: ' + res);

            state.isQuestion = false;
            const obj = {
                text: res,
                type: 'response',
                current: state.current,
                previous: state.previous
            };
            io.send(obj);

            if(state.onIntentComplete)
                state.onIntentComplete(obj);

            state.previous = state.current;
            state.current = null;
        });
}

function ask(question, callback) {
    spinner.stop();
    state.isQuestion = true;
    state.onUserAnswered = callback;
    const obj = {
        text: Array.isArray(question) ? randomElement(question) : question,
        type: 'question',
        current: state.current,
        previous: state.previous
    };
    io.send(obj);
}

function say(message) {
    state.isQuestion = false;
    const obj = {
        text: message,
        type: 'message',
        current: state.current,
        previous: state.previous
    };
    io.send(obj);
}

function startListening() {
    io.emit('startListening');
}

function stopListening() {
    io.emit('stopListening');
}

module.exports = { state, onInputReceived, ask, say, startListening, stopListening };
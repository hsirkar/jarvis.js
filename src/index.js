const io = require('socket.io')();
const skills = require('./skills');
const Routines = require('./skills/Routines');
const Fallback = require('./skills/Fallback');
const Spotify = require('./skills/Spotify');
const nlp = require('./nlp');
const tts = require('./tts');
const db = require('./db');
const { log, spinner, randomElement, sanitizeNlpRes, server } = require('./util');
const { reset } = require('nodemon');

// Properties
const state = {
    previous: {},
    current: {},
    isQuestion: false,
    onUserAnswered: ()=>{},
}

// Load everything
async function init() {
    require('dotenv').config();
    server.io = io;

    for(skill of skills) {
        skill.init && skill.init({ ask, say, onInputReceived, state, restart: init, io, nlp, update });
    }
    log('Skills loaded');
    
    tts.init({ Spotify });
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

        client.on('recognitionStart', () => {
            tts.stop();
            Spotify.api('setVolume', ['30']).catch(()=>{});
        });

        client.on('recognitionEnd', () => Spotify.api('setVolume', ['60']).catch(()=>{}));
    });
    
    // Start the server
    io.listen(3000);
    log('Now listening on port 3000');
}

init();

function onInputReceived(input, onIntentComplete) {
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
            log(JSON.stringify(sanitizeNlpRes(res), null, 2));

            skills.forEach(skill => {
                let { intent: before } = res;
                skill.override && skill.override(res);
                
                if(res.intent !== before) {
                    res.score = 1;
                    log(`Overriden by ${skill.name}: ${res.intent}`);
                }
            });

            state.current = sanitizeNlpRes(res);

            let matched = skills.find(s => s.doesHandleIntent(res.intent));
            
            if(!matched) {
                return 'Oops, no skill can handle that intent';
            }
            
            if(res.score < 0.735) {
                log('Match score too low!');
                matched = Fallback;
            }

            state.current.matchedSkill = matched.name;

            log(`Handling intent through ${matched.name}`);

            return matched.handleIntent(res);
        })
        .then(res => {
            send(res, 'response');

            onIntentComplete && onIntentComplete(res);

            state.previous = state.current;
            state.current = null;
        });
}

function ask(question, onUserAnswered) {
    send(question, 'question');
    state.onUserAnswered = onUserAnswered;
}

function say(message) {
    send(message, 'message');
}

function update(obj) {
    io.emit('update', obj);
}

// Shared function for respond, ask, and say
function send(obj, type) {
    if(type === 'question' || type === 'response')
        spinner.stop();

    if(!obj)
        obj = '';

    if(Array.isArray(obj))
        obj = randomElement(obj);

    if(typeof obj === 'string')
        obj = { text: obj };

    state.isQuestion = type === 'question';

    if(type === 'response') {
        log('Final response: ' + JSON.stringify(obj,null,2));
    }

    const { current, previous } = state;
    Object.assign(obj, { current, previous, type });
    io.send(obj);
    tts.speak(obj.text);
}

function startListening() {
    io.emit('startListening');
}

function stopListening() {
    io.emit('stopListening');
}

module.exports = { state, onInputReceived, ask, say, startListening, stopListening };
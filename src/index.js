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

require('dotenv').config();

// Properties
const state = {
    previous: {},
    current: {},
    isQuestion: false,
    onUserAnswered: ()=>{},
}

// Load everything
async function init() {
    server.io = io;

    for(skill of skills) {
        skill.init && skill.init({ ask, say, onInputReceived });
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

function onInputReceived(input, onIntentComplete=()=>{}) {
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

            state.current.matchedSkill = matched.name;

            log(`Handling intent through ${matched.name}`);

            return matched.handleIntent(res);
        })
        .then(res => {
            spinner.stop();

            if(!res)
                res = '';

            if(Array.isArray(res))
                res = randomElement(res);

            if(typeof res === 'string')
                res = { text: res };

            log('Final response: ' + JSON.stringify(res,null,2));

            state.isQuestion = false;
            const obj = {
                ...res,
                type: 'response',
                current: state.current,
                previous: state.previous
            };
            io.send(obj);
            tts.speak(res.text);

            onIntentComplete instanceof Function && onIntentComplete(obj);

            state.previous = state.current;
            state.current = null;
        });
}

function ask(question, onUserAnswered) {
    spinner.stop();
    state.isQuestion = true;
    state.onUserAnswered = onUserAnswered;
    const obj = {
        text: Array.isArray(question) ? randomElement(question) : question,
        type: 'question',
        current: state.current,
        previous: state.previous
    };
    io.send(obj);
    tts.speak(obj.text);
}

function say(message) {
    state.isQuestion = false;
    const obj = {
        text: Array.isArray(message) ? randomElement(message) : message,
        type: 'message',
        current: state.current,
        previous: state.previous
    };
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
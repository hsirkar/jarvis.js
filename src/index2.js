const brain = require('brain.js');
const chalk = require('chalk');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const nlp = require('compromise');

let net = new brain.recurrent.LSTM();

const config = {
    iterations: 200,
    log: true,
    logPeriod: 25,
    layers: [5]
}

// To-do: add complex situations like parenthesis and stuff
const importVocab = filePath => {
    let actualPath = path.join(__dirname, filePath);
    return fs.readFileSync(actualPath, 'utf8').toString().split('\r\n');
};

const helloVocab = importVocab('../skills/helloVocab');
const goodbyeVocab = importVocab('../skills/goodbyeVocab');
const howAreYouVocab = importVocab('../skills/howAreYouVocab');
const retrainVocab = importVocab('../skills/retrainVocab');

const trainingData = [];

helloVocab.forEach(vocab => trainingData.push({ input: vocab, output: 'helloIntent' }));
goodbyeVocab.forEach(vocab => trainingData.push({ input: vocab, output: 'goodbyeIntent' }));
howAreYouVocab.forEach(vocab => trainingData.push({ input: vocab, output: 'howAreYouIntent' }));
retrainVocab.forEach(vocab => trainingData.push({ input: vocab, output: 'retrainIntent' }));

net.train(trainingData, config);

console.log('\n');

// Terminal I/O
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask the prompt.
function prompt(){
    rl.question("> ", input => calcIntent(input));
}

// Clean the raw input data
function preprocess(input){
    return input.toLowerCase().replace('?', '').replace('-', '').replace('!', '');
}

// Calculate the intent
function calcIntent(input){
    clean = preprocess(nlp(input).normalize({ honorifics: true }).out('text'));

    intent = net.run(clean);

    if (intent === 'helloIntent')
        respond('Hi there!');
    else if (intent === 'howAreYouIntent')
        respond('Good, how are you?');
    else if (intent === 'goodbyeIntent')
        respond('See you later!');
    else if (intent === 'retrainIntent')
        respond('Retraining everything...');
    else
        respond('I\'m not sure I understand');
}
// Jarvis's final response
function respond(message){
    console.log(chalk.cyan('J: ' + message + ''));
    prompt();
}

respond("Jarvis has finished booting up.");
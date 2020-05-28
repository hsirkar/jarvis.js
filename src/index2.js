const brain = require('brain.js');
const chalk = require('chalk');
const readline = require('readline');
const nlp = require('compromise');

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
    return input.toLowerCase().replace('?', '').replace('-', '').replace('!', '').replace('jarvis', '').replace('buddy', '');
}

// Calculate the intent
function calcIntent(input){
    clean = preprocess(nlp(input).normalize({ honorifics: true }).out('text'));
    respond(clean);
}
// Jarvis's final response
function respond(message){
    console.log(chalk.cyan('J: ' + message + ''));
    prompt();
}

respond("Jarvis has finished booting up.");
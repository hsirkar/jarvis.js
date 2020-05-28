// Clear console
const blank = '\n'.repeat(process.stdout.rows)
const readline = require("readline");
console.log(blank)
readline.cursorTo(process.stdout, 0, 0)
readline.clearScreenDown(process.stdout)

// Require chalk module for colors
const chalk = require('chalk');

// Terminal I/O
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask the prompt.
function prompt(){
    rl.question("> ", input => calcIntent(input));
}

// Calculate the intent
const intentParser = require('./intentParser');
const container = new intentParser.IntentContainer('intentCache');

container.addIntent('hello-intent', ['Hi there!', 'Hello.']);
container.addIntent('goodbye-intent', ['See you!', 'Goodbye!']);
container.addIntent('search-intent', ['Search for this thing on Google.']);

container.train();

function calcIntent(input){
    respond(container.calcIntent(input));
}

// Jarvis's final response
function respond(message){
    console.log(chalk.cyan('J: ' + message + ''));
    prompt();
}

respond("Jarvis has finished booting up.");
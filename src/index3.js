const readline = require("readline");
const { NlpManager } = require('node-nlp');
const chalk = require('chalk');

// Clear console
const blank = '\n'.repeat(process.stdout.rows)
console.log(blank)
readline.cursorTo(process.stdout, 0, 0)
readline.clearScreenDown(process.stdout)

// NLP Engine

const manager = new NlpManager({ languages: ['en'] });
const trainnlp = require('./train-nlp');

trainnlp(manager).then(() => {

    // Terminal I/O
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Ask the prompt.
    function prompt() {
        rl.question("> ", input => {
            manager.process('en', input)
                .then(res => respond(res.answer));
        });
    }

    // Jarvis's final response
    function respond(message) {
        console.log(chalk.cyan('J: ' + message + ''));
        prompt();
    }

    respond("Jarvis has finished booting up.");
});

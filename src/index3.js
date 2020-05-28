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

// Adds the utterances and intents for the NLP
manager.addDocument('en', 'goodbye for now', 'greetings.bye');
manager.addDocument('en', 'bye bye take care', 'greetings.bye');
manager.addDocument('en', 'okay see you later', 'greetings.bye');
manager.addDocument('en', 'bye for now', 'greetings.bye');
manager.addDocument('en', 'i must go', 'greetings.bye');
manager.addDocument('en', 'hello', 'greetings.hello');
manager.addDocument('en', 'hi', 'greetings.hello');
manager.addDocument('en', 'howdy', 'greetings.hello');

// Train also the NLG
manager.addAnswer('en', 'greetings.bye', 'Till next time');
manager.addAnswer('en', 'greetings.bye', 'see you soon!');
manager.addAnswer('en', 'greetings.hello', 'Hey there!');
manager.addAnswer('en', 'greetings.hello', 'Greetings!');

manager.train().then(() => {
    manager.save();

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

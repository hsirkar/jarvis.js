const readline = require("readline");

const blank = '\n'.repeat(process.stdout.rows)
console.log(blank)
readline.cursorTo(process.stdout, 0, 0)
readline.clearScreenDown(process.stdout)

const chalk = require('chalk');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask the prompt.
function prompt(){
    rl.question("> ", function(input){
        respond(input);
    });
}

prompt();

function say(message){
    console.log(chalk.cyan('J: ' + message + ''));
}

function sayRand(...items){
    let item = items[Math.floor(Math.random() * items.length)];
    say(item);
}

const ora = require('ora');
const spinner = ora(chalk.cyan('Processing...'));
spinner.spinner = {
    "interval": 100,
    "frames": ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"]
};

// Answer the question/respond to command.
function respond(input){
    spinner.start();

    setTimeout(() => {
        spinner.stop();
        spinner.clear();

        if (input.has('hello', 'hi', 'howdy')) {
            sayRand('Hello sir!', 'Howdy', 'Hello there', 'Hello world', 'Good day!', 'Hey there');
        }
        else if (input.has('how are you', 'how\'s it goin', 'how\'s it hangin', 'how you doin', 'how\'s life')) {
            sayRand('Good', 'I\'m doing well', 'Not too bad', 'Pretty well', 'I\'m fine, thanks');
        }
        else if (input.has('shut up', 'shut your mouth')) {
            sayRand('Alright, bet', 'Lol ok', 'Will do', 'Haha ok', 'Lmao ard');
        }
        else {
            sayRand('You\'re gonna have to rephrase that', 'I do not understand, sir', 'Sorry, I didn\'t get that');
        }

        
        prompt();

    }, 100);
}

String.prototype.has = function(...arr){
    has = false;
    arr.forEach(element => {
        if(this.toLowerCase().includes(element.toLowerCase())){
            has = true;
        }
    });
    return has;
}
const chalk = require('chalk');
const ora = require('ora');
const moment = require('moment');

const skills = require('./skills');
const Fallback = require('./skills/Fallback');
const Spotify = require('./skills/Spotify');
const Routines = require('./skills/Routines');
const System = require('./skills/System');

const nlp = require('./nlp');
const server = require('./server');
const tts = require('./tts');

require('dovenv').config();

// Properties
let previous = {};
let current = {};

// Clear console
console.log('\n'.repeat(process.stdout.rows));

// Load spinner
const spinner = ora(chalk.gray('Processing...'));
spinner.spinner = {
    'interval': 80,
    'frames': ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
};

// Load all skills
for(skill of skills) {
    if(skill.init)
        skill.init(log, ask, say);
}

// Set skill properties
Routines.setOnInputReceived(onInputReceived);
System.setInit(init);
Fallback.setPrevious(previous);

// Load other stuff
tts.init();
mongoose.init(log, say);
server.init();
nlp.init(skills, log);

// Functions
function log(message) {
    let spin = spinner.isSpinning;
    spin && spinner.stop();
    console.log(chalk.gray(moment().format('MM/DD/YY HH:mm:ss.SS: ') + message));
    spin && spinner.start();
}

function say(message) {
    log(message);
}

module.exports = { spinner, log };
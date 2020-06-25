const fs = require('fs');
const { log } = require('../util');

let routines = [];

let stopped = false;

const next = (commands, index, onInputReceived, resolve) => {
    if(stopped) {
        resolve();
        return;
    }

    this.onInputReceived(commands[index], () => {
        setTimeout(() => {
            if(stopped) {
                resolve();
                return;
            }

            if(index === commands.length - 1)
                resolve();
            else
                next(commands, index+1, onInputReceived, resolve);
        }, 1000);
    });
}

const Routines = {
    name: 'Routines',
    init: params => {
        Object.assign(this, params);
        routines = JSON.parse(fs.readFileSync('./corpus/Routines.json'));
        routines = routines.filter(element => element.intent.includes('.routine.'));
    },
    override: res => {
        if (res.intent === 'system.stop') {
            stopped = true;
        }
    },
    doesHandleIntent: intentName => intentName.startsWith('routines'),
    handleIntent: res => new Promise(resolve => {
        const { onInputReceived } = this;

        stopped = false;

        if(res.intent.includes('.routine.')) {
            
            const routine = routines.find(r => r.intent === res.intent);
            log(routine.commands);

            next(routine.commands, 0, onInputReceived, resolve);

        } else {
            resolve(res.answer);
        }
    })
};

module.exports = Routines;
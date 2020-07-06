const fs = require('fs');
const { log } = require('../util');

let routines = [];

let stopped = false;

const next = (commands, index, onInputReceived) => {
    if(stopped) {
        return;
    }

    this.onInputReceived(commands[index], () => {
        setTimeout(() => {
            if(stopped) {
                return;
            }

            if(index === commands.length - 1)
                return;
            else
                next(commands, index+1, onInputReceived);
        }, 1000);
    });
}

const Routines = {
    name: 'Routines',
    init: params => {
        Object.assign(this, params);
        routines = JSON.parse(fs.readFileSync('./src/corpus/Routines.json'));
        routines = routines.filter(element => element.intent.includes('.routine.'));
    },
    override: res => {
        if (res.intent === 'system.stop') {
            stopped = true;
        }
    },
    doesHandleIntent: intentName => intentName.startsWith('routines'),
    handleIntent: async res => {
        const { onInputReceived } = this;

        stopped = false;

        if(res.intent.includes('.routine.')) {
            
            const routine = routines.find(r => r.intent === res.intent);
            log(routine.commands);

            return await next(routine.commands, 0, onInputReceived);

        } else {
            return res.answer;
        }
    }
};

module.exports = Routines;
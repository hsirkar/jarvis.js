const fs = require('fs');

let routines = [];

const next = (commands, index, onInputReceived, resolve) => {
    onInputReceived(commands[index], false, () => {
        setTimeout(() => {
            if(index === commands.length - 1)
                resolve();
            else
                next(commands, index+1, onInputReceived, resolve);
        }, 1000);
    });
}

const Routines = {
    name: 'Routines',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;

        routines = JSON.parse(fs.readFileSync('./corpus/Routines.json'));
        routines = routines.filter(element => element.intent.includes('.routine.'));
        // log(JSON.stringify(routines, null, 2));
    },
    setOnInputReceived: onInputReceived => {
        this.onInputReceived = onInputReceived;
    },
    doesHandleIntent: intentName => intentName.startsWith('routines'),
    handleIntent: res => new Promise(resolve => {
        const { onInputReceived } = this;

        if(res.intent.includes('.routine.')) {
            
            const routine = routines.find(r => r.intent === res.intent);
            this.log(routine.commands);

            next(routine.commands, 0, onInputReceived, resolve);

        } else {
            resolve(res.answer);
        }
    })
};

module.exports = Routines;
const fs = require('fs');

let routines = [];

const Routines = {
    name: 'Routines',
    init: (respond, log, ask) => {
        this.respond = respond;
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
    handleIntent: res => {
        const { respond, log, onInputReceived } = this;

        if(res.intent.includes('.routine.')) {
            
            const routine = routines.find(r => r.intent === res.intent);
            this.log(routine.commands);

            onInputReceived(routine.commands[0]);

            respond(`You have reached the ${res.intent} routine`);
        } else {
            respond(res.answer);
        }
    }
};

module.exports = Routines;
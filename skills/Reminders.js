const { Reminder } = require('../src/db');
const moment = require('moment');
const humanize = require('humanize-duration');
const { abbrList } = require('../src/util');

const Reminders = {
    name: 'Reminders',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;
    },
    override: res => {
        const keywords = ['create a reminder', 'set a reminder', 'remind me to', 'create a new reminder', 'set a new reminder'];

        keywords.forEach(keyword => {
            if(res.utterance.toLowerCase().includes(keyword.toLowerCase())) {
                const newRes = { intent: 'reminders.create', score: 1 };
                Object.assign(res, newRes);
                this.log(`Overriden by Reminders: ${JSON.stringify(newRes)}`);
            }
        });
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('reminders');
    },
    handleIntent: res => new Promise((resolve, reject) => {
        const secondary = res.intent.split('.')[1];
        switch (secondary) {
            case 'list':
                Reminder.find({})
                    .then(results => {
                        const reminders = results.map(r => `"${r.reminder}" (${moment(r.time).calendar()})`);
                        resolve(`${results.length} upcoming reminders: ${abbrList(reminders, 'and', '', 3)}`)
                    })
                    .catch(err => reject(err));
                break;
            case 'create':
                resolve('Create new reminder');
            
                break;
            default:
                break;
        }
    })
};

module.exports = Reminders;
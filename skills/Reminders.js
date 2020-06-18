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

                // this.log(JSON.stringify(res.entities));

                resolve('');
            
                break;
            default:
                break;
        }




        
    })
};

module.exports = Reminders;
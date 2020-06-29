const { Reminder } = require('../db');
const moment = require('moment');
const humanize = require('humanize-duration');
const { abbrList, log } = require('../util');

const Reminders = {
    name: 'Reminders',
    init: () => {
    },
    override: res => {
        const keywords = ['create a reminder', 'set a reminder', 'remind me to', 'create a new reminder', 'set a new reminder'];

        keywords.forEach(keyword => {
            if(res.utterance.toLowerCase().includes(keyword.toLowerCase())) {
                const newRes = { intent: 'reminders.create', score: 1 };
                Object.assign(res, newRes);
                log(`Overriden by Reminders: ${JSON.stringify(newRes)}`);
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
                        const reminders = results.map(r => `${r.reminder} (${moment(r.time).calendar()})`);
                        resolve({
                            text: `${results.length} upcoming reminders: ${abbrList(reminders, 'and', '', 3)}`,
                            list: results.map(r => ({
                                displayText: r.reminder,
                                subtitle: moment(r.time).calendar()
                            }))
                        });
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
const { Reminder } = require('../db');
const moment = require('moment');
const humanize = require('humanize-duration');
const { abbrList, log } = require('../util');

const Reminders = {
    name: 'Reminders',
    init: params => Object.assign(this, params),
    addEntities: manager => {
        const reminderEntity = manager.nerManager.addNamedEntity('reminder', 'trim');
        reminderEntity.addAfterFirstCondition('en', 'to');
        reminderEntity.addBetweenCondition('en', 'to', 'in %datetime%');
        reminderEntity.addBetweenCondition('en', 'to', 'in %time%');
        reminderEntity.addBetweenCondition('en', 'to', 'at %datetime%');
        reminderEntity.addBetweenCondition('en', 'to', 'at %time%');
        reminderEntity.addBetweenCondition('en', 'to', 'on %datetime%');
        reminderEntity.addBetweenCondition('en', 'to', 'on %time%');
    },
    override: res => {
        const keywords = ['new reminder', 'remind me', 'create a reminder', 'set a reminder', 'create reminder'];
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
                        const reminders = results.map(r => `${r.reminder} (${moment(r.time).format('MMMM Do h:m A')})`);
                        resolve({
                            text: `${results.length} upcoming reminders: ${abbrList(reminders, 'and', '', 3)}`,
                            list: results.map(r => ({
                                displayText: r.reminder,
                                subtitle: moment(r.time).format('LLLL')
                            }))
                        });
                    })
                    .catch(err => reject(err));
                break;
            case 'create':
                let rawDateTime = res.entities.find(e => e.entity === 'datetime') || res.entities.find(e => e.entity === 'time');

                if(!rawDateTime) {
                    resolve('I could not parse a time for the reminder');
                    return;
                }

                let dateTime = moment(
                    rawDateTime.resolution.values.slice(-1)[0].value,
                    rawDateTime.entity === 'time' ? 'H:m' : undefined
                );

                let rawReminder = res.entities.find(e => e.entity === 'reminder');

                if(!rawReminder) {
                    resolve('I could not parse your reminder');
                    return;
                }

                let reminder = rawReminder.sourceText
                    .replace(rawDateTime.sourceText, '')
                    .replace(/\bmy\b/gi, 'your')
                    .replace(/\bmine\b/gi, 'yours')
                    .replace(/\b(in|on|at|after)\b$/gi, '')
                    .trim();

                new Reminder({
                    reminder,
                    time: dateTime.toISOString(),
                    completed: false
                }).save({}, err => {
                    if(err) {
                        log(err);
                        resolve('There was an error');
                        return;
                    }
                    resolve({
                        text: `Reminder ${reminder} set for ${dateTime.format('LT')} on ${dateTime.format('dddd, M/D/YYYY')}`,
                        displayText: `"${reminder}"`,
                        subtitle: 'Reminder set for ' + dateTime.format('LLLL')
                    });
                });

                
                break;
            default:
                break;
        }
    })
};

module.exports = Reminders;
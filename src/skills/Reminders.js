const { Reminder } = require('../db');
const moment = require('moment');
const { abbrList, log, removeStopwords, isYes } = require('../util');
const similarity = require('string-similarity');

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
        const create = ['new reminder', 'remind me', 'create a reminder', 'set a reminder', 'create reminder'];
        create.forEach(keyword => {
            if(res.utterance.toLowerCase().includes(keyword.toLowerCase())) {
                const newRes = { intent: 'reminders.create', score: 1 };
                Object.assign(res, newRes);
                log(`Overriden by Reminders: ${JSON.stringify(newRes)}`);
            }
        });

        const remove = ['delete reminder', 'remove my reminder', 'remove reminder', 'delete my reminder', 'cancel reminder', 'cancel my reminder'];
        remove.forEach(keyword => {
            if(res.utterance.toLowerCase().includes(keyword.toLowerCase())) {
                const newRes = { intent: 'reminders.remove', score: 1 };
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
                    .then(res => {
                        res = res.filter(r => moment(r.time).isSameOrAfter(moment()));

                        const reminders = res.map(r => `${r.reminder}: ${moment(r.time).calendar()} at ${moment(r.time).format('LT')}`);
                        resolve({
                            text: `${res.length} upcoming reminders: ${abbrList(reminders, 'and', '', 3)}`,
                            displayText: `${res.length} upcoming reminders`,
                            list: res.map(r => ({
                                displayText: r.reminder,
                                subtitle: moment(r.time).format('LLLL')
                            })),
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

                if(dateTime.isSameOrBefore(moment())) {
                    resolve('You cannot set a reminder in the past');
                    return;
                }

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
                        text: `Reminder ${reminder} set for ${dateTime.calendar()} at ${dateTime.format('LT')}`,
                        displayText: `"${reminder}"`,
                        subtitle: dateTime.format('LLLL')
                    });
                });
                break;
            case 'remove':
                let { utterance } = res;

                let stopwords = [
                    'delete', 'remove', 'reminder', 'reminders', 'please',
                    'can', 'you', 'will', 'jarvis', 'my', 'the', 'for'
                ];

                let cleaned = removeStopwords(utterance, stopwords);

                Reminder.find({})
                    .then(res => {
                        res = res.filter(r => moment(r.time).isSameOrAfter(moment()));

                        if(res.length === 0) {
                            resolve('You do not have any upcoming reminders');
                            return;
                        }

                        let { bestMatchIndex } = similarity.findBestMatch(cleaned, res.map(r => r.reminder));
                        let { reminder, time } = res[bestMatchIndex];

                        this.ask({
                            text: `Remove reminder ${reminder} for ${moment(time).calendar()} at ${moment(time).format('LT')}?`,
                            displayText: 'Remove reminder "' + reminder + '"?',
                            subtitle: moment(time).format('LLLL')
                        }, answer => {
                            if(isYes(answer)) {
                                Reminder.deleteOne({ reminder: reminder, time: time }, err => {
                                    if(err) {
                                        log(err);
                                        resolve('Error');
                                        return;
                                    } else {
                                        resolve('Reminder removed');
                                    }
                                });
                            } else {
                                resolve('Cancelled');
                            }
                        });
                    });
            default:
                break;
        }
    })
};

module.exports = Reminders;
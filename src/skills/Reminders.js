const { Reminder } = require('../db');
const moment = require('moment');
const { abbrList, log, removeStopwords, isYes } = require('../util');
const similarity = require('string-similarity');
const plur = require('plur');

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
                Object.assign(res, { intent: 'reminders.create', overriden: true });
            }
        });

        const remove = ['delete reminder', 'remove my reminder', 'remove reminder', 'delete my reminder', 'cancel reminder', 'cancel my reminder'];
        remove.forEach(keyword => {
            if(res.utterance.toLowerCase().includes(keyword.toLowerCase())) {
                Object.assign(res, { intent: 'reminders.remove', overriden: true });
            }
        });
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('reminders');
    },
    handleIntent: async res => {
        const secondary = res.intent.split('.')[1];

        if (secondary === 'list') {
            const reminders = await Reminder.find({}).exec();
            const formatted = reminders.map(r => `${r.reminder}: ${moment(r.time).calendar()} at ${moment(r.time).format('LT')}`);

            if(reminders.length) {
                return ({
                    text: `${reminders.length} upcoming ${plur('reminder', reminders.length)}: ${abbrList(formatted, 'and', '', 3)}`,
                    listTitle: `${reminders.length} upcoming ${plur('reminder', reminders.length)}`,
                    list: reminders.map(r => ({
                        displayText: r.reminder,
                        subtitle: moment(r.time).format('LLLL')
                    })),
                });
            }

            return ['No upcoming reminders', 'You do not have any upcoming reminders'];
        }

        if (secondary === 'create') {
            let rawDateTime = res.entities.find(e => e.entity === 'datetime') || res.entities.find(e => e.entity === 'time');

            if(!rawDateTime)
                return 'I could not parse a time for the reminder';

            let dateTime = moment(
                rawDateTime.resolution.values.slice(-1)[0].value,
                rawDateTime.entity === 'time' ? 'H:m' : undefined
            );

            if(dateTime.isSameOrBefore(moment()))
                return 'You cannot set a reminder in the past';

            let rawReminder = res.entities.find(e => e.entity === 'reminder');

            if(!rawReminder)
                return 'I could not parse your reminder';

            let reminder = rawReminder.sourceText
                .replace(rawDateTime.sourceText, '')
                .replace(/\bmy\b/gi, 'your')
                .replace(/\bmine\b/gi, 'yours')
                .replace(/\b(in|on|at|after)\b$/gi, '')
                .trim();

            await new Reminder({ reminder, time: dateTime.toISOString(), completed: false }).save();
            return ({
                text: `Reminder ${reminder} set for ${dateTime.calendar()} at ${dateTime.format('LT')}`,
                displayText: `"${reminder}"`,
                subtitle: dateTime.format('LLLL')
            });
        }

        if (secondary === 'remove') {
            let cleaned = removeStopwords(res.utterance,
                ['delete', 'remove', 'reminder', 'reminders', 'please',
                    'can', 'you', 'will', 'jarvis', 'my', 'the', 'for']);

            let reminders = await Reminder.find({}).exec();
            reminders = reminders.filter(r => moment(r.time).isSameOrAfter(moment()));

            if(reminders.length === 0)
                return 'You do not have any upcoming reminders';

            let { bestMatchIndex } = similarity.findBestMatch(cleaned, reminders.map(r => r.reminder));
            let { reminder, time } = reminders[bestMatchIndex];

            const answer = await this.ask({
                text: `Remove reminder ${reminder} for ${moment(time).calendar()} at ${moment(time).format('LT')}?`,
                displayText: 'Remove reminder "' + reminder + '"?',
                subtitle: moment(time).format('LLLL')
            });
            
            if(isYes(answer)) {
                await Reminder.deleteOne({ reminder, time });
                return 'Reminder removed';
            }
            
            return 'Cancelled';
        }
    }
};

module.exports = Reminders;
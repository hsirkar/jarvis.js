const { google } = require('googleapis');
const { authorize } = require('./authorize');
const { log, abbrList } = require('../../util');
const _moment = require('moment');

/*

Do I have anything next Monday?             NLP good
What's on my calendar tomorrow?             NLP good
What's on my schedule next week?            NLP good
What events do I have next month?           NLP good
Do I have anything today?                   NLP good
What do I have the following Monday?        NLP bad
Monday before Christmas                     NLP bad
Labor day                                   NLP returns 2019 and 2020
Do I have anythong on my calendar 

*/

// Correct false UTC timezone
const moment = (date=Date()) => _moment(date.toJSON().replace('T00:00:00.000Z', ''));

const sanitizeEvent = event => {
    const { summary,htmlLink,king,etag,status,created,updated,creator,recurringEventId,
        originalStartTime,organizer,iCalUID,start,end,sequence,reminders,...rest } = event;
    return {
        displayText: summary,
        url: htmlLink,
        subtitle: 'From ' + [
            _moment(start.date || start.dateTime).calendar(),
            _moment(end.date || end.dateTime).calendar()
        ].join(' to '),
        // start: start.date || start.dateTime,
        // end: end.date || end.dateTime,
        ...rest
    };
}

const Calendar = {
    name: 'Calendar',
    init: params => {
        Object.assign(this,params);
        authorize(auth => {
            this.calendar = google.calendar({ version: 'v3', auth });
        });
        _moment.updateLocale('en', {
            calendar : {
                lastDay : '[yesterday]',
                sameDay : '[today]',
                nextDay : '[tomorrow]',
                lastWeek : '[last] dddd',
                nextWeek : '[next] dddd',
                sameElse : 'L'
            }
        });
    },
    doesHandleIntent: intentName => intentName.startsWith('calendar'),
    handleIntent: nlpRes => new Promise(resolve => {
        (async()=>{
            try {
                let { entities, intent } = nlpRes;

                let extractedDate = entities.find(e => e.entity === 'date');
                let extractedRange = entities.find(e => e.entity === 'daterange');

                let resolvedDate = extractedDate && moment(extractedDate.resolution.date || extractedDate.resolution.futureDate);
                let resolvedStart = extractedRange && moment(extractedRange.resolution.start);
                let resolvedEnd = extractedRange && moment(extractedRange.resolution.end);

                if(intent === 'calendar.list') {
                    if (resolvedDate || (resolvedStart && resolvedEnd)) {
                        const results = await this.calendar.events.list({
                            calendarId: 'primary',
                            timeMin: (resolvedStart || resolvedDate).toISOString(),
                            timeMax: (resolvedEnd || resolvedDate.endOf('day')).toISOString(),
                            maxResults: 10,
                            singleEvents: true,
                            orderBy: 'startTime',
                        });
                        const events = results.data.items;
                        log(JSON.stringify(events,null,2));
                        if (events.length) {
                            resolve({
                                text: `${events.length} item${events.length === 1 ? '' : 's'}: ${abbrList(events.map(e => e.summary), 'and', 'None', 4)}`,
                                list: events.map(event => sanitizeEvent(event))
                            });
                        } else {
                            resolve('You do not have anything scheduled');
                        }

                    } else {
                        resolve([
                            'I was unable to parse the date',
                            'You did not provide a valid date'
                        ]);
                    }
                }
                resolve(`I'm not sure`);
                return;
            } catch (e) {
                log(e);
                resolve('There was an error');
            }


        })();
    })
};

module.exports = Calendar;
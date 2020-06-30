const { google } = require('googleapis');
const { authorize } = require('./authorize');
const { log, abbrList } = require('../../util');
const _moment = require('moment');

// Correct false UTC timezone
const moment = (date=Date()) => _moment(date.toJSON().replace('T00:00:00.000Z', ''));


const getFormattedRange = (start, end, isDateTime, isCalendarEvent) => {
    start = _moment(start);
    end = _moment(end);

    let dateFormat = 'ddd[,] MMM D';
    let dateTimeFormat = 'ddd[,] MMM D h:mm A';
    let currentYear = _moment().year();

    if(start.year() !== currentYear && end.year() !== currentYear) {
        dateFormat = 'ddd[,] MMM D[,] YYYY';
        dateTimeFormat = 'ddd[,] MMM D[,] YYYY h:mm A';
    }

    if(isDateTime) {
        if(start.format(dateFormat) === end.format(dateFormat)) {
            return start.format(dateFormat) + ' ' + start.format('LT') + ' – ' + end.format('LT');    
        }

        return start.format(dateTimeFormat) + ' – ' + end.format(dateTimeFormat);
    } else {

        if(isCalendarEvent)
            end = end.subtract(1, 'day');

        if(start.format(dateFormat) === end.format(dateFormat)) {
            return start.format(dateFormat);
        }

        return start.format(dateFormat) + ' – ' + end.format(dateFormat);
    }
}

const sanitizeEvent = event => {
    const { summary,htmlLink,king,etag,status,created,updated,creator,recurringEventId,
        originalStartTime,organizer,iCalUID,start,end,sequence,reminders,...rest } = event;

    console.log(event);
    
    return {
        displayText: summary,
        url: htmlLink,
        subtitle: getFormattedRange(
            start.date || start.dateTime,
            end.date || end.dateTime,
            start.dateTime, true),
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
                                list: events.map(event => sanitizeEvent(event)),
                                displayText: 'Overview: ' + getFormattedRange(
                                    resolvedStart || resolvedDate,
                                    resolvedEnd || resolvedDate,
                                    false, false),
                            });
                        } else {
                            resolve({
                                text: 'You do not have anything scheduled',
                                subtitle: getFormattedRange(
                                    resolvedStart || resolvedDate,
                                    resolvedEnd || resolvedDate,
                                    false, false),
                            });
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
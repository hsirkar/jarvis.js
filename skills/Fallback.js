const axios = require('axios').default;
const cheerio = require('cheerio');
const { abbrList } = require('../src/util');
const similarity = require('string-similarity');
require('dotenv').config();

let instance;

// Takes in an array and returns answer
const getAnswer = arr => {
    const answers = arr.map(e => {
        let text = cheerio.load(e).text();

        if (/[A-Za-z]\d{4}$/.test(text))
            text = text.replace(/\d{4}$/, match => ` (${match})`);

        return text.replace(' · ', ' ').replace('·', '');
    });
    return abbrList(answers, 'and', '', 4);
}

const Fallback = {
    name: 'Fallback',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;

        instance = axios.create({
            method: 'get',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Dnt': '1',
                'Referer': 'https://www.google.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0'
            }
        });
    },
    setPrevious: previous => this.previous = previous,
    doesHandleIntent: intentName => intentName === 'None' || intentName.startsWith('fallback'),
    handleIntent: res => new Promise(resolve => {
        const { log } = this;
        let { utterance } = res;

        if(res.intent === 'fallback.force') {
            if(this.previous) {
                utterance = this.previous.res.utterance;
            }else{
                resolve(`I'm not sure`);
                return;
            }
        }

        (async () => {
            // First query DDG
            log(`Searching DuckDuckGo...`);
            
            try {
                ddg = await instance.get(`https://api.duckduckgo.com/?q=${utterance}&format=json&pretty=1`);

                if (ddg && ddg.status === 200 && ddg.data && ddg.data.AbstractText && ddg.data.AbstractSource) {
                    answer = cheerio.load(`<div>${ddg.data.AbstractText}</div>`)('div').text();
                    arr = answer.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
                    resolve(`According to ${ddg.data.AbstractSource}, ${arr[0]} ${arr[1] || ''}`);
                    return;
                }
            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Then query Google
            log(`Searching Google...`);

            try {
                google = await instance.get(`https://www.google.com/search?q=${utterance}`);
                let $ = cheerio.load(google.data);

                let answer = "";

                // Lyrics
                const lyrics = $('[data-lyricid]').find('span:not(:has(*))').toArray().map(s => cheerio.load(s).text());

                if(Array.isArray(lyrics) && lyrics.length) {
                    const index = similarity.findBestMatch(utterance, lyrics).bestMatchIndex;
                    if(lyrics[index+1]) {

                        answer = lyrics[index+1].trim();

                        if(answer.length < 32 && lyrics[index+2] && lyrics[index+2].trim() !== '…' && lyrics[index+2].trim() !== '\u2026'){
                            answer += ' / ' + lyrics[index+2].trim();
                        }

                        for(swear of ["bitch","shit","fuck","nigger","nigga","shit","dick","cum","pussy","shit","retard","fag","whore","hoe"]) {
                            answer = answer.replace(new RegExp('\\w*' + swear + '\\w*', 'gi'), '[...]');
                        }
                    }
                }

                if(answer) {
                    resolve(answer);
                    return;
                }

                // List (type 1)
                const arr1 = $('[role=list]').children().toArray();

                if(arr1.length > 0) {
                    answer = getAnswer(arr1);
                }

                // List (type 2)
                const arr2 = $('.rl_item').toArray();

                if(arr2.length > 0) {
                    answer = getAnswer(arr2);
                }
                
                // Basic info
                const basic = $('#center_col').find('[role=heading][data-attrid]').children().first().text();

                if(basic) {
                    answer = basic;
                }

                if(answer) {
                    if(answer.length < 70)
                        resolve([`According to Google, ${answer}`, `${answer}, according to Google`]);
                    else
                        resolve(answer);
                    return;
                }

            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Query WolframAlpha
            log(`Searching WolframAlpha...`);

            try {
                wolfram = await instance.get(`https://api.wolframalpha.com/v1/spoken?i=${res.utterance}&appid=${process.env.WOLFRAM_APP_ID}`);

                if (wolfram && wolfram.status === 200 && wolfram.data) {
                    resolve(wolfram.data);
                    return;
                }
            } catch (err) { log(err, err.stack) }

            log(`No results found`);

            // Finally query Answers.com
            log(`Searching Answers.com...`);

            try {
                const answers = await instance.get(`https://www.answers.com/search?q=${res.utterance}`);

                if (answers && answers.status === 200 && answers.data) {                    
                    answer = cheerio.load(answers.data)('head > meta[name=description]').attr('content');

                    if(answer && answer !== 'Answers is the place to go to get the answers you need and to ask the questions you want') {
                        resolve(answer.trim());
                        return;
                    }
                }
            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Admit defeat
            resolve([
                'Sorry, I don\'t understand',
                'You\'ll have to rephrase that',
                'I do not understand'
            ]);
        })();
    })
}

module.exports = Fallback;
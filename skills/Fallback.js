const axios = require('axios').default;
const cheerio = require('cheerio');
const { abbrList } = require('../src/util');
require('dotenv').config();

let instance;

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
    doesHandleIntent: intentName => intentName === 'None',
    handleIntent: res => new Promise(resolve => {
        const { log } = this;
        const { utterance } = res;

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
                const $ = cheerio.load(google.data);

                let answer;

                // Basic info
                const basic = $('#center_col').find('[role=heading][data-attrid]').children().first().text();

                if(basic) {
                    answer = basic;
                }

                // List (type 1)
                const arr1 = $('[role=list]').children().toArray();

                if(arr1.length > 0) {
                    const answers = arr1.map(e => cheerio.load(e).text());
                    answer = abbrList(answers, 'and', '', 4);
                }

                // List (type 2)
                const arr2 = $('.rl_item').toArray();

                if(arr2.length > 0) {
                    const answers = arr2.map(e => cheerio.load(e).text());
                    answer = abbrList(answers, 'and', '', 4);
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
            
            // Finally query WolframAlpha
            log(`Searching WolframAlpha...`);

            try {
                wolfram = await instance.get(`https://api.wolframalpha.com/v1/spoken?i=${res.utterance}&appid=${process.env.WOLFRAM_APP_ID}`);

                if (wolfram && wolfram.status === 200 && wolfram.data) {
                    resolve(wolfram.data);
                    return;
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
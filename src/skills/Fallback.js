const axios = require('axios').default;
const cheerio = require('cheerio');
const { log, abbrList, clean, firstTwoSentences } = require('../util');
const similarity = require('string-similarity');
const scraper = require('se-scraper');
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
    init: params => {
        Object.assign(this, params);
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
        let { utterance } = res;

        if(res.intent === 'fallback.force') {
            if(this.state.previous) {
                utterance = this.state.previous.utterance;
            }else{
                resolve(`I'm not sure`);
                return;
            }
        }

        (async () => {
            let answer = "";

            // First query DDG
            log(`Searching DuckDuckGo...`);
            
            try {
                ddg = await instance.get(`https://api.duckduckgo.com/?q=${utterance}&format=json&pretty=1`);
                const { AbstractText, Answer, Definition, AbstractSource, Image, AbstractURL, DefinitionURL } = ddg.data;

                if(AbstractText || Answer || Definition) {
                    resolve({
                        text: firstTwoSentences(AbstractText || Answer || Definition),
                        display: answer,
                        source: AbstractSource,
                        url: AbstractURL || DefinitionURL,
                        image: Image
                    });
                    return;
                }

            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Then query Google
            log(`Searching Google...`);

            try {
                let url = encodeURI(`https://www.google.com/search?q=${utterance}`);
                google = await instance.get(url);
                let $ = cheerio.load(google.data);

                await require('fs').writeFileSync('./cache/google-search-result.html', google.data);

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
                    resolve({ text: answer, display: lyrics.join('\n'), source: 'LyricFind', url });
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
                    resolve({ text: answer, source: 'Google', url: url });
                    return;
                }

            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Query WolframAlpha
            log(`Searching WolframAlpha...`);

            try {
                wolfram = await instance.get(`https://api.wolframalpha.com/v1/spoken?i=${res.utterance}&appid=${process.env.WOLFRAM_APP_ID}`);

                if (wolfram && wolfram.status === 200 && wolfram.data) {
                    resolve({
                        text: wolfram.data,
                        source: 'Wolfram Alpha',
                        url: `https://api.wolframalpha.com/v1/simple?i=${res.utterance}&appid=${process.env.WOLFRAM_APP_ID}`
                    });
                    return;
                }
            } catch (err) { log(err, err.stack) }

            log(`No results found`);

            // Return search results from DuckDuckGo
            try {
                const search = await scraper.scrape({ debug_level: 0 }, { block_assets: true, search_engine: 'duckduckgo', keywords: [res.utterance], num_pages: 1 });
                const results = await search.results[res.utterance]['1'].results;

                console.dir(results);

                if(results) {
                    resolve({
                        text: `Here's what I found on the web`,
                        list: results.slice(0, 4).map(r => ({
                            displayText: r.title,
                            subtitle: r.snippet.split(' ').slice(0, 30).join(' '),
                            subtitle2: r.visible_link,
                            url: r.link
                        })),
                        source: 'DuckDuckGo Web Search',
                        url: 'https://www.duckduckgo.com/?q=' + encodeURIComponent(res.utterance)
                    });
                    return;
                }
            } catch (err) { log(err, err.stack) }

            log(`Admitting defeat`);
        
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
const axios = require('axios').default;
const cheerio = require('cheerio');

require('dotenv').config();

const instance = axios.create({
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

const FallbackSkill = {
    name: 'FallbackSkill',
    doesHandleIntent: intentName => intentName === 'None',
    handleIntent: (res, respond, log) => {
        const { utterance } = res;

        (async () => {
            // First query DDG
            log(`Searching DuckDuckGo...`);
            
            try {
                ddg = await instance.get(`https://api.duckduckgo.com/?q=${utterance}&format=json&pretty=1`);

                if (ddg && ddg.status === 200 && ddg.data && ddg.data.AbstractText && ddg.data.AbstractSource) {
                    answer = cheerio.load(`<div>${ddg.data.AbstractText}</div>`)('div').text();
                    arr = answer.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
                    respond(`According to ${ddg.data.AbstractSource}, ${arr[0]} ${arr[1] || ''}`);
                    return;
                }
            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Then query Google
            log(`Searching Google...`);

            try {
                google = await instance.get(`https://www.google.com/search?q=${utterance}`);

                if (google && google.status === 200 && google.data && cheerio.load(google.data)('#center_col').find("[role='heading'][data-attrid]").children().first().text()) {
                    answer = cheerio.load(google.data)('#center_col').find("[role='heading'][data-attrid]").children().first().text();
                    respond(answer + (answer.length < 70 ? ', according to Google' : ''));
                    return;
                }
            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Finally query WolframAlpha
            log(`Searching WolframAlpha...`);

            try {
                wolfram = await instance.get(`https://api.wolframalpha.com/v1/spoken?i=${res.utterance}&appid=${process.env.WOLFRAM_APP_ID}`);

                if (wolfram && wolfram.status === 200 && wolfram.data) {
                    respond(wolfram.data);
                    return;
                }
            } catch (err) { log(err, err.stack) }

            log(`No results found`);
            
            // Admit defeat
            respond('I do not understand');
        })();
    }
}

module.exports = FallbackSkill;
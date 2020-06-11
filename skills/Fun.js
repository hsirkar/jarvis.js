const axios = require('axios').default;
const similarity = require('string-similarity');
const { list, shuffle, clean, isYes } = require('../src/util');

let instance;

const Fun = {
    name: 'Fun',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;
        
        instance = axios.create({
            method: 'get',
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Dnt': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0'
            }
        });
    },
    doesHandleIntent: intentName => intentName.startsWith('fun'),
    handleIntent: res => new Promise(resolve => {

        const secondary = res.intent.split('.')[1];

        switch (secondary) {
            case 'qod':
                instance.get('https://quotes.rest/qod')
                    .then(res => {
                        const quote = res.data.contents.quotes[0];
                        resolve(`Today's quote is... ${quote.quote} by ${quote.author}`);
                    })
                    .catch(() => resolve('Failed to get quote of the day'));
                break;
            case 'catfact':
                instance.get('https://cat-fact.herokuapp.com/facts/random')
                    .then(res => {
                        resolve(res.data.text);
                    })
                    .catch(() => resolve('Failed to get a random cat fact'))
                break;
            case 'trivia':
                instance.get('https://opentdb.com/api.php?amount=10')
                    .then(res => {
                        const item = res.data.results[0];

                        const correct = clean(item.correct_answer);
                        const incorrect = item.incorrect_answers.map(a => clean(a));
                        const all = incorrect.slice(0).concat(correct);

                        let points = 10;
                        if(item.difficulty === 'easy')
                            points = 5;
                        else if(item.difficulty === 'hard')
                            points = 15;

                        this.ask(`The category is ${clean(item.category)}. For ${points} points, ${clean(item.question)} Is it: ${list(shuffle(all), 'or', 'None')}`,
                            answer => {
                                const score = similarity.compareTwoStrings(answer.toLowerCase(), correct.toLowerCase());
                                this.log(`Similarity to answer: ${score}`);

                                if (score > 0.75)
                                    resolve(`That's right, the answer is ${correct}`);
                                else
                                    resolve(`That's incorrect, the correct answer is ${correct}`);
                            });
                        // resolve(res.results[0].)
                    })
                    .catch(() => resolve('Failed getting trivia question'));
                break;
            case 'insult':
                this.ask(['Do you want me to insult you?', 'Are you sure?', 'Should I insult you?'], answer => {
                    if(isYes(answer))
                        instance.get('https://evilinsult.com/generate_insult.php?lang=en&type=json')
                            .then(res => {
                                resolve(res.data.insult);
                            })
                            .catch(() => resolve(res.answer))
                    else
                        resolve(['Okay', 'Alright', 'Fine']);
                });
                break;
            default:
                resolve(`I'm not sure`);
                break;
        }
    })
};

module.exports = Fun;
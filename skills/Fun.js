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
                    .catch(() => resolve('Failed to get a random cat fact'));
                break;
            case 'fact':
                instance.get('https://uselessfacts.jsph.pl/random.json?language=en')
                    .then(res => {
                        resolve([
                            `Did you know that ${res.data.text}`, `Fun fact: ${res.data.text}`, res.data.text
                        ]);
                    })
                    .catch(() => resolve(res.answer));
                break;
            case 'pickupline':
                instance.get('http://pebble-pickup.herokuapp.com/tweets/random')
                    .then(res => {
                        resolve(res.data.tweet);
                    })
                    .catch(() => resolve(res.answer));
                break;
            case 'trumpquote':
                instance.get('https://api.tronalddump.io/random/quote')
                    .then(res => {
                        resolve(`"${res.data.value}"`);
                    })
                    .catch(() => resolve(`Failed to get Donald Trump quote`));
                break;
            case 'corporatebs':
                instance.get('https://corporatebs-generator.sameerkumar.website/')
                    .then(res => {
                        resolve(res.data.phrase);
                    })
                    .catch(() => resolve(`Failed to get corporate BS`));
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

                        let question = `The category is ${clean(item.category)}. For ${points} points, ${clean(item.question)} `;
                        
                        if(item.type === 'multiple')
                            question += `Is it: ${list(shuffle(all), 'or', 'None')}`;
                        else
                            question += `True or False?`;

                        this.ask(question,
                            answer => {
                                const score = similarity.compareTwoStrings(answer.toLowerCase(), correct.toLowerCase());
                                this.log(`Similarity to answer: ${score}`);

                                if (score > 0.70)
                                    resolve([`That's right, the answer is ${correct}`, `Correct, it is ${correct}`, `Yep, you got it. The answer is ${correct}`]);
                                else
                                    resolve([`That's incorrect, the correct answer is ${correct}`, `Oof, that's not correct. The right answer is ${correct}`]);
                            });
                        // resolve(res.results[0].)
                    })
                    .catch(() => resolve('Failed getting trivia question'));
                break;
            case 'insult':
                this.ask(['Do you want me to insult you?', 'Are you sure?', 'Should I insult you?', 'Do you want me to roast you?'], answer => {
                    if(isYes(answer))
                        instance.get('https://evilinsult.com/generate_insult.php?lang=en&type=json')
                            .then(res => {
                                resolve(clean(res.data.insult));
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
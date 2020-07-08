const axios = require('axios').default;
const similarity = require('string-similarity');
const { list, shuffle, clean, isYes, log } = require('../util');

let instance;

const Fun = {
    name: 'Fun',
    init: params => {
        Object.assign(this, params);
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
    handleIntent: async res => {
        const secondary = res.intent.split('.')[1];

        if(secondary === 'qod') {
            const res = await instance.get('https://quotes.rest/qod');
            const quote = res.data.contents.quotes[0];
            return `Today's quote is: "${quote.quote}" by ${quote.author}`;
        }
        
        if (secondary === 'catfact') {
            const res = await instance.get('https://cat-fact.herokuapp.com/facts/random');
            return res.data.text;
        }
    
        if (secondary === 'fact') {
            const res = await instance.get('https://uselessfacts.jsph.pl/random.json?language=en');
            return [`Did you know that ${res.data.text}`, `Fun fact: ${res.data.text}`, res.data.text];
        }
        
        if (secondary === 'pickupline') {
            try {
                const res = await instance.get('http://pebble-pickup.herokuapp.com/tweets/random');
                return res.data.tweet;
            } catch (e) {
                return res.answer;
            }
        }
        
        if (secondary === 'trumpquote') {
            const res = await instance.get('https://api.tronalddump.io/random/quote');
            return `"${res.data.value}"`;
        }
        
        if (secondary === 'corporatebs') {
            const res = await instance.get('https://corporatebs-generator.sameerkumar.website/');
            return res.data.phrase;
        }
        
        if (secondary === 'bored') {
            const res = await instance.get('https://www.boredapi.com/api/activity/');
            return res.data.activity;
        }
        
        if (secondary === 'advice') {
            const res = await instance.get('https://api.adviceslip.com/advice');
            return res.data.slip.advice;
        }
        
        if (secondary === 'trivia') {
            const res = await instance.get('https://opentdb.com/api.php?amount=10');
            
            const item = res.data.results[0];
            const correct = clean(item.correct_answer);
            const incorrect = item.incorrect_answers.map(a => clean(a));
            const all = incorrect.slice(0).concat(correct);

            let points = 10;
            if(item.difficulty === 'easy')
                points = 5;
            else if(item.difficulty === 'hard')
                points = 15;

            let question = `${clean(item.category)}. For ${points} points, ${clean(item.question)} `;
            
            if(item.type === 'multiple')
                question += `Is it: ${list(shuffle(all), 'or', 'None')}?`;
            else
                question += `True or False?`;

            const answer = await this.ask(question);

            const score = similarity.compareTwoStrings(answer.toLowerCase(), correct.toLowerCase());
            log(`Similarity to answer: ${score}`);

            if (score > 0.70)
                return [`That's right, the answer is ${correct}`, `Correct, it is ${correct}`, `Yep, you got it. The answer is ${correct}`];
            else
                return [`That's incorrect, the correct answer is ${correct}`, `0 points. The right answer is ${correct}`];
        }
        
        if (secondary === 'insult') {
            const answer = await this.ask(['Do you want me to insult you?', 'Are you sure?', 'Should I insult you?', 'Do you want me to roast you?']);
            if(isYes(answer)) {
                try {
                    const res = await instance.get('https://evilinsult.com/generate_insult.php?lang=en&type=json');
                    return clean(res.data.insult);
                } catch (e) {
                    return res.answer;
                }
            }
            return ['Okay', 'Alright', 'Fine'];
        }
    }
};

module.exports = Fun;
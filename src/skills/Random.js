const axios = require('axios').default;
const similarity = require('string-similarity');
const { Book } = require('../db');
const { log } = require('../util');

let instance;

const round = (num, toPlace) => Math.round((num + Number.EPSILON) * Math.pow(10, toPlace)) / Math.pow(10, toPlace);

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const Random = {
    name: 'Random',
    init: () => {
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
    doesHandleIntent: intentName => intentName.startsWith('random'),
    handleIntent: async res => {
        const secondary = res.intent.split('.')[1];

        if (secondary === 'number') {
            let min = 1;
            let max = 100;
            
            let numbers = res.entities.filter(entity => entity.entity === 'number');
            if(numbers.length === 2){
                min = numbers[0].resolution.value;
                max = numbers[1].resolution.value;
            }
            
            return getRandomIntInclusive(min, max).toString();
        }

        if (secondary === 'coinflip') {
            return Math.random() >= 0.5 ? 'Heads' : 'Tails';
        }

        if (secondary === 'die') {
            let min = 1;
            let max = 6;

            let numbers = res.entities.filter(entity => entity.entity === 'number');
            if (numbers.length === 1) {
                max = numbers[0].resolution.value;
            }

            return getRandomIntInclusive(min, max).toString();
        }
        
        if (secondary === 'person') {
            const res = await instance.get('https://randomuser.me/api/?nat=us');
            const person = res.data.results[0];

            log(JSON.stringify(person, null, 2));
            
            const { name, dob, gender, picture } = person;
            return ({
                text: `${name.first} ${name.last}, ${gender}, ${dob.age}`,
                image: picture.large,
                extras: person
            });
        }

        if (secondary === 'book') {
            const count = await Book.countDocuments();
            const random = Math.floor(Math.random() * count);
            const book = await Book.findOne().skip(random).exec();
            log(book);
            return book.title;
        }
    }
};

module.exports = Random;
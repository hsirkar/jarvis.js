const axios = require('axios').default;
const similarity = require('string-similarity');
const { list, shuffle, clean, isYes } = require('../src/util');

let instance;

const round = (num, toPlace) => Math.round((num + Number.EPSILON) * Math.pow(10, toPlace)) / Math.pow(10, toPlace);

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const Random = {
    name: 'Random',
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
    doesHandleIntent: intentName => intentName.startsWith('random'),
    handleIntent: res => new Promise(resolve => {
        const secondary = res.intent.split('.')[1];
        let min, max, numbers, randomNumber;

        switch (secondary) {
            case 'number':
                min = 1;
                max = 100;
                
                numbers = res.entities.filter(entity => entity.entity === 'number');
                if(numbers.length === 2){
                    min = numbers[0].resolution.value;
                    max = numbers[1].resolution.value;
                }
                
                resolve(getRandomIntInclusive(min, max));
                break;
            case 'coinflip':
                resolve(Math.random() >= 0.5 ? 'Heads' : 'Tails');
                break;
            case 'die':
                min = 1;
                max = 6;

                numbers = res.entities.filter(entity => entity.entity === 'number');
                if (numbers.length === 1) {
                    max = numbers[0].resolution.value;
                }

                resolve(getRandomIntInclusive(min, max));
                break;
            default:
                resolve(`I'm not sure`);
                break;
        }
    })
};

module.exports = Random;
const gis = require('g-i-s');
const { log, removeStopwords, shuffle } = require('../util')
const axios = require('axios').default;
const moment = require('moment');
const fs = require('fs');
const cheerio = require('cheerio');
const names = require('../../cache/names.json');

const Show = {
    name: 'Show',
    init: params => Object.assign(this, params),
    addEntities: manager => {
        const reminderEntity = manager.nerManager.addNamedEntity('imageQuery', 'trim');
        reminderEntity.addAfterFirstCondition('en', 'show');
    },
    override: res => {
        const show = ['show me', 'image', 'picture', 'look like'];
        show.forEach(keyword => {
            if(res.utterance.toLowerCase().includes(keyword.toLowerCase())) {
                res.intent = 'show.imagesearch';
            }
        });
    },
    doesHandleIntent: intentName => intentName.startsWith('show.imagesearch'),
    handleIntent: res => new Promise(resolve => {
        if(res.intent === 'show.imagesearch') {
            let { utterance } = res;

            utterance = removeStopwords(utterance, [
                'show me', 'pictures', 'picture', 'images', 'image', 'photos', 'photo', 'of', 'and', 'what does', 'what do', 'look like'
            ])
            .replace('dank memes', 'r/dankmemes');

            // Get from Reddit
            let subreddit = utterance.match(/\br\/[a-zA-Z0-9-_]*\b/);
            if(subreddit) {
                axios.get('https://www.reddit.com/' + subreddit + '.json')
                    .then(res => {
                        const list = res.data.data.children
                            .filter(post => post.data.url.match(/(.png|.jpg|.gif|.gifv|.jpeg)$/i))
                            .map(post => ({
                                image: post.data.url,
                                displayText: post.data.title,
                                url: 'https://www.reddit.com' + post.data.permalink
                            }));
                        resolve({
                            text: 'Here you are',
                            listTitle: 'Images results for "' + utterance + '"',
                            list: list.slice(0,15),
                            isGallery: true,
                            source: subreddit
                        });
                    })
                    .catch(err => {
                        resolve('There was an error');
                        log(err);
                    });

                return;
            }

            // Get from static image server
            let selectedName;
            let username;

            Object.keys(names).forEach(name => {
                if(utterance.toLowerCase().includes(name.toLowerCase())) {
                    selectedName = name;
                    username = names[name];
                }
            });

            if (selectedName && username) {
                const list = [];
                axios.get('http://localhost:8080/' + username + '/')
                    .then(res => {
                        const $ = cheerio.load(res.data);
                        $('td.display-name a').toArray().forEach(item => {
                            const url = 'http://localhost:8080/' + username + '/' + cheerio.load(item).text();
                            list.push({ image: url });
                        });
                    })
                    .then(() => {
                        resolve({
                            text: 'Here you are',
                            listTitle: 'Images of ' + selectedName + ' (' + username + ')',
                            list: shuffle(list).slice(0, 20),
                            isGallery: true,
                            source: 'Your PC'
                        });
                        return;
                    });
                return;
            }

            // Get from Google Images
            gis(utterance, (err, res) => {
                if(err){
                    resolve('There was an error');
                    log(err);
                    return;
                }
                resolve({
                    text: 'Here you are',
                    listTitle: 'Images results for "' + utterance + '"',
                    list: res.slice(0, 15).map(r => ({ image: r.url })),
                    isGallery: true,
                    source: 'Google Images'
                });
            });
        } else {
            resolve(`I'm not sure`);
        }
    })
};

module.exports = Show;
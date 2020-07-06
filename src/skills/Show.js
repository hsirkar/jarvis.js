const GIS = require('g-i-s');
const gis = require('util').promisify(GIS);
const { removeStopwords, shuffle, clean, log, sanitizeNlpRes } = require('../util')
const axios = require('axios').default;
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
                Object.assign(res, { intent: 'show.imagesearch', overriden: true });
            }
        });
    },
    doesHandleIntent: intentName => intentName.startsWith('show.imagesearch'),
    handleIntent: async nlpRes => {
        if(nlpRes.intent === 'show.imagesearch') {
            let utterance = removeStopwords(nlpRes.utterance, [
                'show me', 'pictures', 'picture', 'images', 'image', 'photos', 'photo', 'of', 'and', 'what does', 'what do', 'look like'
            ])
            .replace('dank memes', 'r/dankmemes');

            // Get from Reddit
            let subreddit = utterance.match(/\br\/[a-zA-Z0-9-_]*\b/);
            if(subreddit) {
                const res = await axios.get(`https://www.reddit.com/${subreddit}.json`);
                const list = res.data.data.children
                    .filter(post => post.data.url.match(/(.png|.jpg|.gif|.gifv|.jpeg)$/i))
                    .map(post => ({
                        image: post.data.url,
                        displayText: post.data.title,
                        url: 'https://www.reddit.com' + post.data.permalink
                    }));
                return ({
                    text: 'Here you are',
                    listTitle: 'Image results for "' + utterance + '"',
                    list: list.slice(0, 15),
                    isGallery: true,
                    source: subreddit
                });
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
                const res = await axios.get(`http://localhost:8080/${username}/`);

                const $ = cheerio.load(res.data);
                $('td.display-name a').toArray().forEach(item => {
                    list.push({ image: `http://localhost:8080/${username}/${clean(item)}` });
                });

                return ({
                    text: 'Here you are',
                    listTitle: `Images of ${selectedName} (${username})`,
                    list: shuffle(list).slice(0, 20),
                    isGallery: true,
                    source: 'Your PC'
                });
            }

            // Get from Google Images
            const res = await gis(utterance);
            return ({
                text: 'Here you are',
                listTitle: 'Image results for "' + utterance + '"',
                list: res.slice(0, 15).map(r => ({ image: r.url })),
                isGallery: true,
                source: 'Google Images'
            });
        } else {
            return `I'm not sure`;
        }
    }
};

module.exports = Show;
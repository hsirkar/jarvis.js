const Echo = {
    name: 'Echo',
    willStealIntent: utterance => utterance.startsWith('play '),
    doesHandleIntent: () => false,
    handleIntent: (res, respond) => {
        respond('You have triggered the Spotify skill, which is still a WIP');
    }
};

module.exports = Echo;
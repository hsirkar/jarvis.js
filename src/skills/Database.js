const Database = {
    name: 'Database',
    init: () => {},
    doesHandleIntent: intentName => {
        return intentName.startsWith('db');
    },
    handleIntent: res => new Promise(resolve => {
        resolve(res.answer);
    })
};

module.exports = Database;
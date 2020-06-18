const Database = {
    name: 'Database',
    init: (log, ask) => {
        this.log = log;
        this.ask = ask;
    },
    doesHandleIntent: intentName => {
        return intentName.startsWith('db');
    },
    handleIntent: res => new Promise(resolve => {
        resolve(res.answer);
    })
};

module.exports = Database;
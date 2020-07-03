const { log } = require('../util');

const Template = {
    name: 'Template',
    init: params => Object.assign(this, params),
    doesHandleIntent: intentName => intentName.startsWith('template'),
    handleIntent: res => new Promise(resolve => {
        log('Hello world!');
        resolve(res.answer);
    })
};

module.exports = Template;
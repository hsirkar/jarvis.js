const { log, removeStopwords } = require('../../util');
const translate = require('@vitalets/google-translate-api');
const languages = require('./languages.json');

const isoToEnglish = iso => {
    return languages.find(i => i.alpha2 === iso).English.split('; ')[0];
}

const Translate = {
    name: 'Translate',
    init: params => Object.assign(this, params),
    addEntities: manager => {
        nlpManager = manager;
        languages.forEach(lang => {
            manager.nerManager.addNamedEntityText('language', lang.alpha2, ['en'], lang.English.split('; '));

            const translateQueryEntity = manager.nerManager.addNamedEntity('translateQuery', 'trim');
            translateQueryEntity.addBetweenCondition('en', 'translate', 'to');
            translateQueryEntity.addBetweenCondition('en', 'say', 'in');
            translateQueryEntity.addBetweenCondition('en', 'is', 'in');
            translateQueryEntity.addBetweenCondition('en', 'write', 'in');
        });
    },
    doesHandleIntent: intentName => intentName.startsWith('translate'),
    handleIntent: async res => {
        if(res.intent !== 'translate.query')
            return;

        let language = res.entities.find(e => e.entity === 'language');

        if(!language) {
            let answer = await this.ask('What language should I translate to?');
            let newRes = await this.nlp.manager.process(answer);
            language = newRes.entities.find(e => e.entity === 'language');

            if(!language)
                return `I could not parse a language`;
        }

        let query = res.entities.find(e => e.entity === 'translateQuery');

        if(!query) {
            let answer = await this.ask('What should I translate?');
            query = answer;

            if(!query)
                return `I could not parse a query`;
        }

        let translation = await translate(query.sourceText, { to: language.option });

        return ({
            text: translation.text,
            subtitle: `${isoToEnglish(translation.from.language.iso)} → ${isoToEnglish(language.option)}`,
            subtitle2: `"${query.sourceText}"`,
            language: language.option
        });
    }
};

module.exports = Translate;
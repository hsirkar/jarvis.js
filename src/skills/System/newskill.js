const { log } = require('../../util');
const fs = require('fs');

module.exports = (ask, resolve) => {
    ask('What is the name of the skill?', answer => {
        if(answer.match(/\b(cancel|nevermind|stop|quit|exit)\b/i)) {
            resolve('OK, cancelled');
            return;
        }

        if(answer.match(/[^a-zA-Z]/)) {
            resolve('Invalid name');
            return;
        }

        const name = answer.charAt(0).toUpperCase() + answer.slice(1).toLowerCase();

        log('Creating new skill: ' + name + '...');

        fs.writeFileSync(`./src/corpus/${name}.json`, JSON.stringify([{
            intent: `${name.toLowerCase()}.hello`,
            utterances: [`Invoke ${name.toLowerCase()}`],
            answers: [`You have reached ${name.toLowerCase()}`]
        }], null, 4));

        log('Corpus created')

        let template = fs.readFileSync(__dirname + '/template', 'utf-8')
            .replace(/Template/g, name)
            .replace(/template/g, name.toLowerCase());

        fs.writeFileSync(`./src/skills/${name}.js`, template);
        
        log('JS file created');

        let index = fs.readFileSync('./src/skills/index.js', 'utf-8')
            .replace(`];`, `    require('./${name}'), \n];`);

        fs.writeFileSync(`./src/skills/index.js`, index);

        log('src/index.js updated');
        resolve({ text: 'Skill successfully created (make sure to retrain)', subtitle: name });
        return;
    });
}
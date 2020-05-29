const PersonalitySkill = {
    name: 'PersonalitySkill',
    doesHandleIntent: intentName => {
        for(let domain of ['user', 'agent', 'greetings', 'appraisal', 'dialog'])
            if(intentName.startsWith(domain))
                return true;

        return false;
    },
    handleIntent: (res, respond) => {
        respond(res.answer);
    }
};

module.exports = PersonalitySkill;
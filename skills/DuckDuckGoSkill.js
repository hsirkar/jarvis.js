const ddg = require('ddg');
const axios = require('axios').default;

const DuckDuckGoSkill = {
    name: 'DuckDuckGoSkill',
    doesHandleIntent: intentName => {
        return intentName === 'duckduckgo.instant' || intentName === 'None';
    },
    handleIntent: (res, respond) => {

        ddg.query(res.utterance, (err, data) => {
            // Handle unexpected error
            if(err) {
                respond('There was an error, please try again');
                return;
            }

            // DDG didn't find an answer
            if(!data || data == null || data == undefined || !data.Abstract){
                // Todo: Query DDG again with simplified utterance
                // Query WolframAlpha
                axios.get(`https://api.wolframalpha.com/v1/spoken?i=${res.utterance}&appid=${process.env.WOLFRAM_APP_ID}`)
                    .then(response => {
                        if(response.status === 200)
                            respond(response.data);
                        else
                            respond(res.answer);
                    })
                    .catch(err => {
                        respond(res.answer);
                    });


                return;
            }

            // Respond with first two sentences of abstract
            sentenceArray = data.AbstractText.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
            respond(`According to ${data.AbstractSource}, ${sentenceArray[0]} ${!!sentenceArray[1] ? sentenceArray[1] : ''}`)
        });


    }
};

module.exports = DuckDuckGoSkill;
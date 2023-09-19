# Welcome to Jarvis.js

Jarvis.js is an AI assistant + voice UI 

Jarvis.js is a full-stack voice assistant, similar to Siri, Alexa, and Google Assistant, that serves to answer questions and execute various commands. It is written primarily in Node.js and is designed to run on premises. It is powered by the following technologies:

1.	Tensorflow.js ~~Porcupine.js~~: detects wake-word to trigger speech recognition
2.	WebSpeech API (SpeechRecognition interface): converts microphone input into textual utterance
3.	NLP.js: parses textual utterance and retrieves intent, entities, and sentiment-analysis using machine-learning model
4.	Skills: modular components that handle their respective intents, eventually resolving to a final textual response
5.	Amazon Polly: synthesis the respective skill’s textual response into speech, whose audio is piped to the speaker

## Fallback

If the natural language processor determines that a certain utterance doesn’t match any predetermined intents, and no skill “claims” the intent in its override function, the utterance will be passed on to the “Fallback” skill. This skill queries third-party search engines to find a proper response. The engines are proritized in the following order:

1.	DuckDuckGo (Instant Answers API)
2.	Google Search (Results scraped with HTML parser) 
3.	Wolfram|Alpha (Spoken Results API)
4.	~~Answers.com (Results scraped with HTML parser)~~
5.	DuckDuckGo web search results (Parsed with 3rd-party module)

## Why JavaScript/Node.js and not something else, like Python?

1.	Familiarity – I did not want to spend most of my time learning the intricacies behind Python. Modern JavaScript (i.e. ES6) provides many practical and personally-preferred features, like arrow functions, string interpolation, destructuring, modules, promises, etc. that promote rapid development. Additionally, I am very familiar with the React workflow.
2.	Popularity – Node.js and JavaScript has one of the largest programming communities. It has a lot of premade open-source libraries available for integration with any project. 
3.	Platform compatibility – easy setup with Windows, Linux, Android, Mac, etc., works well for front-end development without using third-party implementations and bindings. No need to do complicated platform-dependent setup. Simply install Node, git clone, and npm install and start.
4.	Consistency – Node.js and React for back-end and front-end respectively.

## Hotword detection

Originally, for wake-word detection, I had used a wrapper around Picovoice’s proprietary Porcupine hotword engine, since it is known for speed and accuracy. Besides being closed source, its WebAssembly binding is limited to one of its default keywords, including “grasshopper,” “porcupine,” and “bumblebee,” The other widely used engine, Snowboy, does not work on Windows; neither of these therefore fully suited my needs or preferences.

It took me a very long time to decide how to go about hotword detection; I eventually stumbled upon a demo of Tensorflow.js called “Teachable Machine” which showed off some of the library’s use cases and pretrained models. Upon exploring its “audio project” I figured that I might as well give it a shot for use with Jarvis.js.
The Teachable Machine’s audio project uses TFJS’s speech-commands model, which ships with a small API for use in other Node/browser projects. Here is what I did to develop the model and integrate it into Jarvis.js:

1.	Create a new “audio project” in the Teachable Machine web app
2.	Record 56 audio samples of “background noise” which includes static and other noise, like sighs and coughs as well as a few negative utterances, like reading random text, singing, and humming
3.	Record 28 audio samples of “Jarvis” and “Hey Jarvis”
4.	Train over 70 epochs
5.	Download the zipped file that contains the weights, model specifications, and metadata, and host these files on a static server (as the library requires an http protocol)
6.	Use the speech-commands model’s API to capture an audio stream, and execute a callback (to begin speech recognition) when an audio stream sample is recognized as “Jarvis” above a certain threshold of confidence

The audio project is saved to my Google Drive for fine-tuning and other future modifications. 

## Skill Structure

A "skill" is simply a JavaScript object that has certain properties. By default, each skill is located within its respective directory inside `src/skills`. Skill objects have the following backbone:

```javascript
// src/skills/foo/index.js
export default {
    // the skill's name, useful for debugging (string, required)
    name: 'Foo',
    
    // called when jarvis.js initializes (function, optional)
    init: params => {
        Object.assign(this, params);
        // initialize other things
    },
    
    // called right before NLP trains (function, optional)
    addEntities: manager => {
        const entity = manager.nerManager.addNamedEntity('query');
    },
    
    // manually override NLP results by modifying "res" object (function, optional)
    override: res => {
        if(res.utterance.contains('foo')) {
            const newRes = { intent: 'foo.bar', score: 1 };
            Object.assign(res, newRes);
        }
    },
    
    // is this the right skill to handle this intent? (function, required)
    doesHandleIntent: intent => intent.startsWith('foo'),
    
    // handle the intent and resolve into a final response to be sent to client
    // (function, returns promise, required)
    handleIntent: res => new Promise((resolve, reject) => {
        resolve('hello world');
    })
};
```

Each skill, defined at `index.js` within its directory, may have a sibling `corpus.json` that relates intents to utterances and default answers. Naturally, the corpus should only define intents handled by the skill.

The barebones skill looks like this:

```javascript
export default {
    name: 'Joke',
    doesHandleIntent: intent => intent.startsWith('joke.'),
    handleIntent: res => new Promise(resolve => {
        resolve(res.answer);
    });
}
```

```json
[
    {
        "intent": "joke.random",
        "utterances": [
            "tell me a joke"
        ],
        "answers": [
        	"Why did the bike fall over? It was two tired"
        ]
    }
]
```

To create a new skill (with a corpus) and automatically link it, just ask Jarvis:

> ​		create new skill
>
> Sure thing. What would you like to call it?
>
> ​		joke
>
> Skill "Joke" successfully created. Would you like me to retrain?
>
> ​		yeah go for it
>
> Training complete

**Conventionally, the skill directory and intent identifier are in kebab-case, and the "name" property (and object name) in PascalCase.**

## Promise resolution

Each skill object has a “handleIntent” function, which returns a Promise. When this Promise is resolved, the server will send the result to the client.
The “resolve” function within the Promise can look like any of the following:

```javascript
// Resolve to random answer from NLP corpus (may be undefined)
resolve(res.answer);

// Basic textual response
resolve('This text will be synthesized into speech, and displayed in the UI');

// The above is a quicker way to write:
resolve({ text: 'This text will be synthesized into speech, and displayed in the UI' });

// Final response is randomly selected from string array
resolve(['The time is 11:19 AM', 'It is currently 11:19 AM', '11:19 AM, sir']);

// UI formatting
resolve({
    text: 'Justin Drew Bieber is a Canadian singer, songwriter, and actor',
    url: 'https://en.wikipedia.org/wiki/Justin_Bieber',
    image: 'https://en.wikipedia.org/wiki/Justin_Bieber#/media/File:Justin_Bieber_in_2019_(crop).jpg'
});

// Video
resolve({
    text: 'Now playing Avengers: Endgame',
    video: 'https://localhost:5000/video.mp4'
});

// Speak and display different texts
resolve({
    text: 'Now playing Circles by Post Malone'
    displayText: 'Circles',
    subtitle: 'Post Malone',
    url: 'https://open.spotify.com/track/21jGcNKet2qwijlDFuPiPb',
    image: 'https://i.scdn.co/image/ab67616d0000b2739478c87599550dd73bfa7e02'
});

// UI formatting with lists
resolve({
    text: 'You have 2 reminders: Walk the dog at 3 PM, and Take a shower at 6 PM',
    displayText: 'Reminders:',
    list: [
        {
            displayText: 'Walk the dog',
            subtitle: '3 PM today',
            url: 'reminders://walk-the-dog.reminder'
        },
        {
            displayText: 'Take a shower',
            subtitle: '6 PM tomorrow',
            url: 'reminders://take-a-shower.reminder',
            image: 'https://www.example.com/shower.gif'
        }
    ]
});

// Pass other data
const data = { a: 1, b: 2, c: 3 };
resolve({
	text: 'Hello there',
	...data
});
```

Not providing any argument &ndash; i.e. calling `resolve()` &ndash; will result in the UI displaying a thumbs-up, indicating that the user's intent was successfully handled.
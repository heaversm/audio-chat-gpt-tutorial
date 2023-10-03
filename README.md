# Audio ChatGPT

This is a project designed to be used alongside the [youtube tutorial series here](https://www.youtube.com/playlist?list=PLC_E8ugf8_OyaTl2c4NeYvsNdl4uw-6YC).

This tutorial series will help you create your own audio chatGPT - talk to it, and it will talk back - no openAI premium subscription needed!

## Up and running

### Dependencies

* [nodejs](https://nodejs.org/en/download/)
* Get an openAI API key [here](https://platform.openai.com/signup)
* Set up a google cloud account, service account, and enable text to speech and speech to text APIs (watch [video 1](https://www.youtube.com/watch?v=Au4bCp8dagw&list=PLC_E8ugf8_OyaTl2c4NeYvsNdl4uw-6YC&index=1&ab_channel=MikeHeaversProjects) for instructions)
* [Install Sox](https://www.npmjs.com/package/node-record-lpcm16#dependencies) - see the instructions for your OS
*

### Running

* clone this repo
* paste your OPEN_AI_API_KEY into the .env file: `OPEN_AI_API_KEY=YOUR_KEY_HERE`
* `npm i`
* `npm run start`

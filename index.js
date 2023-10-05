const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const process = require("process");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const recorder = require("node-record-lpcm16");
require("dotenv").config();

//GOOGLE AUTH NEEDED FOR CLOUD SERVERS:
const GoogleAuth = require("google-auth-library/build/src/auth/googleauth");

let speechClient;
let ttsClient; //must be instantiated after gcp auth

const auth = new GoogleAuth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
// console.log("auth", auth);

const speech = require("@google-cloud/speech");
speechClient = new speech.SpeechClient({ auth });
// console.log(speechClient);

// Imports the Google Cloud text to speech library
const textToSpeech = require("@google-cloud/text-to-speech");
ttsClient = new textToSpeech.TextToSpeechClient({ auth });

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const COMPLETIONS_CONFIG = {
  be_brief: false, //when true, the AI will be asked to be as brief as possible in its response
  max_tokens: 150, //max length of response
  temperature: 0.5, //0-1, higher = more creative
};

const SAMPLE_RATE_HERTZ = 16000;
const USE_INTERIM_RESULTS = false; //when true, get a steady stream of audio from the recording. In this case, you'll want the transcript to be set each time, vs. be added to.
const RECOGNIZE_CONFIG = {
  encoding: "LINEAR16", //e.g. LINEAR16, FLAC, OGG_OPUS - https://cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionConfig#AudioEncoding
  sampleRateHertz: SAMPLE_RATE_HERTZ, //HZ - you generally need to sample more than twice the highest frequency of any sound wave you wish to capture digitally
  languageCode: "en-US", //BCP-47 language code - https://cloud.google.com/speech-to-text/docs/languages
  streamingLimit: 290000, //max number of milliseconds to stream audio
};

const RECORD_CONFIG = {
  sampleRateHertz: SAMPLE_RATE_HERTZ,
  threshold: 0,
  // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
  verbose: false,
  recordProgram: "rec", // Try also "arecord" or "sox"
  silence: "10.0", //how long to wait in silence before ending
};

const users = []; //will hold the active users of the service

class User {
  constructor() {
    this.id = uuidv4();
    this.speechFile = null;
    this.streamScript = "";
    this.aiResponse = null;
    this.recording = null;
    this.recognizeStream = null;
  }
}

//TODO: enable more than one user to use the service at a time
let serviceInUse = false; //disables recording when a user is actively transcribing

const port = process.env.PORT || 3333;

const templates = path.join(process.cwd(), "templates");
const publicDir = path.join(process.cwd(), "public");
const responseFileDir = path.join(publicDir, "responseFiles");

app.use(express.static(publicDir));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const getSpeechFilePath = (speechFileName) => {
  return path.join(responseFileDir, `/${speechFileName}.mp3`);
};

const onRecognizeData = (data, user) => {
  console.log("onRecognizeData", data);
  const transcript =
    data.results[0] && data.results[0].alternatives[0]
      ? `${data.results[0].alternatives[0].transcript}\n`
      : "\n\nReached transcription time limit, press Ctrl+C\n";
  if (USE_INTERIM_RESULTS) {
    user.streamScript = transcript;
    // streamScript = transcript;
  } else {
    user.streamScript += transcript;
    // streamScript += transcript;
  }
};

const getUser = (userId) => {
  return users.find((user) => user.id === userId);
};

const recordVoice = (user) => {
  console.log("record voice", user.id);
  if (!user.recording) {
    user.recording = recorder.record(RECORD_CONFIG);

    // Start recording and send the microphone input to the Speech API.
    // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
    user.recording
      .stream()
      .on("error", console.error)
      .pipe(user.recognizeStream);
  } else {
    user.recording.resume();
  }
  console.log("Listening");
};

const stopRecordVoice = (user) => {
  console.log("api stop");
  user.recognizeStream.pause();
};

const initRecognizeStream = (user) => {
  const userRequestConfig = {
    config: RECOGNIZE_CONFIG,
    interimResults: USE_INTERIM_RESULTS,
  };
  user.recognizeStream = speechClient
    .streamingRecognize(userRequestConfig)
    .on("error", console.error)
    .on("data", (data) => {
      onRecognizeData(data, user);
    });
  console.log("recognize stream initialized");
};

app.post("/api/submitTranscription", async (req, res) => {
  const { userId, transcript } = req.body;
  const user = getUser(userId);
  console.log("api submit transcription");
  //create a chat completion
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: !COMPLETIONS_CONFIG.be_brief
          ? transcript
          : `respond to the following query, and be as brief as possible in your response: ${streamScript}`,
      },
    ],
    max_tokens: COMPLETIONS_CONFIG.max_tokens,
    temperature: COMPLETIONS_CONFIG.temperature,
    model: "gpt-3.5-turbo",
  });
  try {
    const aiResponse = completion.choices[0].message.content;
    user.aiResponse = aiResponse;

    res.status(200).json({ message: "success", aiResponse: aiResponse });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: `error, ${error}` });
  }
  //wait for a response
  //return that to the frontend
});

app.get("/api/initUser", (req, res) => {
  const user = new User();
  console.log("user:", user.id);
  users.push(user);
  res.status(200).json({ message: "user initialized", userId: user.id });
});

app.post("/api/getTranscription", (req, res) => {
  const { userId } = req.body;
  const user = getUser(userId);
  if (!user) {
    res.status(500).json({ message: "no user found" });
  } else {
    res.status(200).json({ script: user.streamScript });
  }
});

app.post("/api/generateAIResponseFile", async (req, res) => {
  const { aiResponse, userId } = req.body;
  const user = getUser(userId);
  console.log("api generateResponseFile");
  const speechRequest = {
    input: { text: aiResponse },
    // Select the language and SSML voice gender (optional)
    //https://cloud.google.com/text-to-speech/docs/ssml
    voice: {
      languageCode: "en-US",
      name: "en-US-Studio-M",
      ssmlGender: "MALE",
    },
    // select the type of audio encoding
    audioConfig: { audioEncoding: "MP3" },
  };

  // Performs the text-to-speech request
  const [speechResponse] = await ttsClient.synthesizeSpeech(speechRequest);
  // Write the binary audio content to a local file
  const speechFileName = uuidv4();
  const speechFilePath = getSpeechFilePath(speechFileName);
  // console.log("speechFilePath", speechFilePath);
  user.speechFile = speechFileName;

  try {
    await fsPromises.writeFile(speechFilePath, speechResponse.audioContent, {
      encoding: "binary",
      flag: "w", //write (default)
    });

    //todo: stream is closing without write being ended
    res.status(200).json({ message: "success", speechFile: speechFileName });
  } catch (err) {
    console.error(err);
  }
});

//restarting a stream: https://github.com/GoogleCloudPlatform/nodejs-docs-samples/blob/main/speech/infiniteStreaming.js
const clearRecognizeStream = (user) => {
  if (user.recognizeStream) {
    user.recognizeStream.end();
    user.recognizeStream.removeListener("data", onRecognizeData);
    user.recognizeStream = null;
  }
};

const clearRecording = (user) => {
  if (user.recording) {
    user.recording.stop();
    user.recording = null;
  }
};

app.get("/api/getServiceStatus", (req, res) => {
  console.log("api getServiceStatus: service in use?", serviceInUse);
  res.status(200).json({ serviceInUse: serviceInUse });
});

app.post("/api/recordVoice", (req, res) => {
  const { userId } = req.body;
  const user = getUser(userId);
  console.log("apiRecordVoice");
  //only one user at a time for now
  if (serviceInUse) {
    res.status(500).json({ message: "service in use" });
  } else {
    //serviceInUse = true; //MH TODO: test concurrent users
  }
  //if there's no recognize stream, create one
  if (!user.recognizeStream) {
    initRecognizeStream(user);
  }
  //then record voice
  recordVoice(user);
  //then return a response letting the client know that it's recording
  res.status(200).json({ message: "recording" });
});

app.post("/api/stopRecordVoice", (req, res) => {
  const { userId } = req.body;
  const user = getUser(userId);
  if (!user.recognizeStream) {
    res.status(500).json({ message: "no recognize stream" });
  }
  stopRecordVoice(user);
  res.status(200).json({ message: "recording stopped" });
});

app.post("/api/clearTranscription", (req, res) => {
  const { userId } = req.body;
  const user = getUser(userId);
  user.streamScript = "";
  clearRecognizeStream(user);
  clearRecording(user);
  res.status(200).json({ message: "transcription cleared" });
});

app.post("/api/deleteResponseFile", (req, res) => {
  const { speechFile, userId } = req.body;
  const user = getUser(userId);
  const speechFilePath = getSpeechFilePath(speechFile);
  fs.unlink(speechFilePath, (err) => {
    if (err) {
      res.status(500).json({ message: `error deleting audio, ${err}` });
    } else {
      user.speechFile = null;
      user.aiResponse = null;
      res.status(200).json({ message: "audio file deleted" });
    }
  });
});

app.post("/api/setServiceInUse", (req, res) => {
  const { isInUse } = req.body;
  serviceInUse = isInUse;
  res.status(200).json({ message: `service in use set to ${serviceInUse}` });
});


app.get("/", (req, res) => {
  res.sendFile("index.html", { root: templates });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

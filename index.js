const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const process = require("process");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();

const SAMPLE_RATE_HERTZ = 16000;
const USE_INTERIM_RESULTS = false; //when true, get a steady stream of audio from the recording. In this case, you'll want the transcript to be set each time, vs. be added to.
const RECOGNIZE_CONFIG = {
  encoding: "LINEAR16", //e.g. LINEAR16, FLAC, OGG_OPUS - https://cloud.google.com/speech-to-text/docs/reference/rest/v1/RecognitionConfig#AudioEncoding
  sampleRateHertz: SAMPLE_RATE_HERTZ, //HZ - you generally need to sample more than twice the highest frequency of any sound wave you wish to capture digitally
  languageCode: "en-US", //BCP-47 language code - https://cloud.google.com/speech-to-text/docs/languages
  streamingLimit: 290000, //max number of milliseconds to stream audio
};

let streamScript = ""; //will hold the transcript of the user's request
let recognizeStream; //will hold the google speech to text stream
let recording; //will hold the noderecord instance;

const port = process.env.PORT || 3333;

const templates = path.join(process.cwd(), "templates");
const publicDir = path.join(process.cwd(), "public");

app.use(express.static(publicDir));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const onRecognizeData = (data) => {};

const initRecognizeStream = () => {
  const userRequestConfig = {
    config: RECOGNIZE_CONFIG,
    interimResults: USE_INTERIM_RESULTS,
  };
  recognizeStream = speechClient
    .streamingRecognize(userRequestConfig)
    .on("error", console.error)
    .on("data", onRecognizeData);
  console.log("recognize stream initialized");
};

app.get("/api/recordVoice", (req, res) => {
  console.log("apiRecordVoice");
  //if there's no recognize stream, create one
  initRecognizeStream();
  //then record voice
  //then return a response letting the client know that it's recording
  res.status(200).json({ message: "recording" });
});

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: templates });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

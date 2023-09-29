let transcriptionInterval;
let globalSpeechFile;

const toggleTranscriptionPolling = (active = false) => {
  console.log("toggleTranscriptionPolling", active);
  if (active) {
    transcriptionInterval = setInterval(() => {
      fetch("/api/getTranscription", {
        method: "get",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.script) {
            console.log(data.script);
            document.querySelector(".audio-transcript").innerText = data.script;
          }
        })
        .catch((err) => console.log(err));
    }, 1000);
  } else {
    clearInterval(transcriptionInterval);
  }
};

const handleServerRecord = async () => {
  return new Promise((resolve, reject) => {
    fetch("api/recordVoice", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const handleServerStopRecord = async () => {
  return new Promise((resolve, reject) => {
    fetch("/api/stopRecordVoice", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        resolve(res.json());
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const handleServerSubmitTranscription = () => {
  return new Promise((resolve, reject) => {
    fetch("/api/submitTranscription", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        resolve(data.aiResponse);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const onRecordDown = async () => {
  //TODO:
  //manage the state
  //manage the UI
  //tell the server to access the user's mic and start recording
  handleServerRecord().then(async () => {
    //manage the UI
    //start looking for the latest transcript results
    toggleTranscriptionPolling(true);
  });
  //listen for transcript results from the server
};

const writeAIResponse = (aiResponse) => {
  document.querySelector(".audio-response").innerText = aiResponse;
};

const generateAIResponseFile = () => {
  return new Promise((resolve, reject) => {
    fetch("/api/generateAIResponseFile", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        resolve(data.speechFile);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const playAudioResponse = (speechFile) => {
  const audioPlayer = document.querySelector(".audio-response__player");
  audioPlayer.src = `/responseFiles/${speechFile}.mp3`;

  audioPlayer.addEventListener("ended", () => {
    console.log("audio playback ended");
    handleAudioResponseFinished(speechFile);
  });

  audioPlayer.play();
};

const clearAudioTranscript = () => {
  document.querySelector(".audio-transcript").innerText = "";
};

const clearAudioResponse = () => {
  document.querySelector(".audio-response").innerText = "";
};

const handleServerClearTranscription = () => {
  return new Promise((resolve, reject) => {
    fetch("/api/clearTranscription", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const handleDeleteSpeechFile = (speechFile) => {
  return new Promise((resolve, reject) => {
    fetch("/api/deleteResponseFile", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ speechFile: speechFile }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        globalSpeechFile = null;
        resolve();
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const handleAudioResponseFinished = async (speechFile) => {
  //clear the transcript from the textbox
  clearAudioTranscript();
  //clear audio response from the textbox
  clearAudioResponse();
  //reset the state and UI
  //clear the transcript from the server
  handleServerClearTranscription();
  //delete the speechFile from the server
  handleDeleteSpeechFile(speechFile);
};

const onRecordUp = async () => {
  //TODO:
  //manage the state
  //manage the UI
  //tell the server to stop recording
  toggleTranscriptionPolling(false);
  handleServerStopRecord().then(async () => {
    //tell the server to submit the transcription to chatGPT
    handleServerSubmitTranscription().then(async (aiResponse) => {
      console.log(aiResponse);

      writeAIResponse(aiResponse);
      generateAIResponseFile().then(async (speechFile) => {
        globalSpeechFile = speechFile; //store in global...for now
        try {
          playAudioResponse(speechFile);
          //when play is done, handleAudioResponseFinished will be called
        } catch (error) {
          console.log("error playing audio response", error);
        }
      });
    });
  });
};

const addEventListeners = () => {
  //start recording
  document
    .querySelector(".audio-record__btn")
    .addEventListener("mousedown", onRecordDown);

  //stop recording and submit
  document
    .querySelector(".audio-record__btn")
    .addEventListener("mouseup", onRecordUp);
};

const init = () => {
  addEventListeners();
};

document.addEventListener("DOMContentLoaded", init);

let transcriptionInterval; //holds the interval to check for the latest transcript
let globalSpeechFile; //holds the audio file for the ai's response
let globalTranscript; //holds the transcribed audio from the user's mic
let globalAIResponse; //holds the text response of the LLM to the user's transcript query
let serviceInUse; //when true, hold off on any other recordings
let userId;

const handleInitUser = async () => {
  return new Promise((resolve, reject) => {
    fetch("/api/initUser", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        userId = data.userId;
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const toggleTranscriptionPolling = (active = false) => {
  console.log("toggleTranscriptionPolling", active);
  if (active) {
    transcriptionInterval = setInterval(() => {
      fetch("/api/getTranscription", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.script) {
            if (globalTranscript !== data.script) {
              console.log(data.script);
              globalTranscript = data.script;
              document.querySelector(".audio-transcript").innerText =
                data.script;
            }
          }
        })
        .catch((err) => console.log(err));
    }, 1000);
  } else {
    clearInterval(transcriptionInterval);
  }
};

const getServiceStatus = async () => {
  return new Promise((resolve, reject) => {
    fetch("/api/getServiceStatus", {
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        resolve(data.serviceInUse);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const handleServerRecord = async () => {
  return new Promise((resolve, reject) => {
    fetch("api/recordVoice", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: userId }),
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
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: userId }),
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
  console.log("handleServerSubmitTranscription", globalTranscript, userId);
  return new Promise((resolve, reject) => {
    fetch("/api/submitTranscription", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript: globalTranscript, userId: userId }),
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
  //serviceInUse = await getServiceStatus();
  serviceInUse = false;
  if (serviceInUse) {
    //TODO: implement better system for user notifications
    alert("service in use - please try again in a minute or so");
  } else {
    console.log("down", Date.now());
    handleServerRecord().then(async () => {
      //manage the UI
      //start looking for the latest transcript results
      toggleTranscriptionPolling(true);
    });
    //listen for transcript results from the server
  }
};

const writeAIResponse = (aiResponse) => {
  document.querySelector(".audio-response").innerText = aiResponse;
};

const generateAIResponseFile = () => {
  //generate audio file from ai text based answer
  return new Promise((resolve, reject) => {
    fetch("/api/generateAIResponseFile", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ aiResponse: globalAIResponse, userId: userId }),
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
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: userId }),
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

const handleServerSetInUse = (isInUse = false) => {
  return new Promise((resolve, reject) => {
    fetch("/api/setServiceInUse", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isInUse: isInUse }),
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
      body: JSON.stringify({ speechFile: speechFile, userId: userId }),
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

const handleAudioResponseFinished = async () => {
  //clear the transcript from the textbox
  clearAudioTranscript();
  //clear audio response from the textbox
  clearAudioResponse();
  //reset the state and UI
  //clear the transcript from the server
  handleServerClearTranscription().then(async () => {
    if (globalSpeechFile) {
      await handleDeleteSpeechFile(globalSpeechFile);
      console.log("speech file deleted");
      //await handleServerSetInUse(false);
    }
  });
};

const onRecordUp = async () => {
  //TODO:
  //manage the state
  //manage the UI
  //tell the server to stop recording
  if (serviceInUse) {
    return;
  }
  toggleTranscriptionPolling(false);
  handleServerStopRecord().then(async () => {
    //tell the server to submit the transcription to chatGPT
    handleServerSubmitTranscription().then(async (aiResponse) => {
      globalAIResponse = aiResponse;
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
  const audioPlayer = document.querySelector(".audio-response__player");

  audioPlayer.addEventListener("ended", () => {
    console.log("audio playback ended");
    handleAudioResponseFinished();
  });

  //start recording
  document
    .querySelector(".audio-record__btn")
    .addEventListener("mousedown", onRecordDown);

  //stop recording and submit
  document
    .querySelector(".audio-record__btn")
    .addEventListener("mouseup", onRecordUp);
};

const init = async () => {
  await handleInitUser();
  addEventListeners();
};

document.addEventListener("DOMContentLoaded", init);

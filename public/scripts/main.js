let transcriptionInterval;

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

      //write the response on screen
      //generate an audio file of the response
      //play the audio file
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

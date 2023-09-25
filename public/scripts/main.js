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

const onRecordDown = async () => {
  //TODO:
  //manage the state
  //manage the UI
  //tell the server to access the user's mic and start recording
  //listen for transcript results from the server
  handleServerRecord();
};

const onRecordUp = async () => {
  //TODO:
  //manage the state
  //manage the UI
  //tell the server to stop recording
  //stop looking for new transcript results
  //tell the server to submit the transcription to chatGPT
  //listen for chatGPTs response
  //write the response on screen
  //generate an audio file of the response
  //play the audio file
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

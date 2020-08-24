const ipc = require('electron').ipcRenderer;
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const appVersion = process.env.npm_package_version;

function checkFiles() {
}

// UPDATER CLASS
const updater = {
  start() {
    try {
      appendMessage("Goshijin, let me just check if you can connect to kagescan's server !<br>...", true);
      GET(`https://kagescan.legtux.org/fangame/api/?appVersion=${appVersion}&get=releaseInfo`)
      .catch(function(error) {
        setSideImage("error");
        appendMessage("An error happened !!!");
        console.log(error)
      })
      .then(updater.onceGotTheReleaseFile);
    } catch(err) {
      console.error("AN error occured during the file verification !! Please restart the app.");
      console.error(err);
    }
  },
  async onceGotTheReleaseFile(data) {
    const updates = JSON.parse(data);
    if (updates.error !== "nothing") {
      setSideImage("error");
      appendMessage("An error happened !!!" + updates.error);
      return updates.error;
    }
    const downloadList= await updater.checkFiles(updates.hashList);
    const totalSize = formatBytes(downloadList.totalSize);
    setSideImage("ask");
    appendMessage(`I'm connected ! I'll download the game's full source code and assets, but this will require to fetch ${totalSize} ...`);
    confirmMessage(
      function() { updater.DoDownloadItemList(downloadList); },
      function(){
        setSideImage("sit tongue");
        appendMessage("Goshujin, you should download the full source code and the assets in order to play the game !!", true);
        appendMessage("Please restart the game when you're ready to download. Or maybe you may want to dowload manually ?");
      }
    )
  },
  async checkFiles(hashList) {
    // // TODO: Add security by moving that into ipc renderer/main
    const queue = {
      "code": [],
      "assets": [],
      "musics": [], //  Thoses are large files and takes
      "videos": [], // around the half of the assets's size
      "totalSize": 0
    }
    for (const item of hashList) {
      if (item.length !== 3) {
        continue;
      }

      const [file_name, file_hash, file_size] = item;
      const file_path = path.join(__dirname, file_name);
      const isThisFileNeedToBeDownloaded = false;
      let type_of_edition = "insertion";
      if (fs.existsSync(file_path)) {
        const local_hash = await checksumFile(file_path);
        if (local_hash == file_hash) {
          // Logic is simple: don't download if the file exists and hash is same
          continue;
        } else {
          type_of_edition = "edition";
        }
      }

      let type_of_file = "code";
      if (file_name.includes("assets/")) {
        if (file_name.includes("music/")) {
          type_of_file = "musics";
        } else if (file_name.includes("videos/")) {
          type_of_file = "videos";
        } else {
          type_of_file = "assets";
        }
      }
      queue[type_of_file].push( {url: file_name, editType: type_of_edition});
      queue.totalSize += file_size;
    }
    // TODO: check files to delete in another function
    console.log(queue);
    return queue;
  }
  ,
  DoDownloadItemList(downloadList) {
    alert("downloading item list", downloadList);
  }

}

// HELPERS

function GET(url) {
  return new Promise(function(resolve, reject) {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        resolve(request.responseText);
      } else {
        reject("Could join the server, but the response is not the one expected... Please contact us !!");
      }
    };
    request.onerror = function() {
      reject("Unable to join the server (might due to your connection)");
    };

    request.send();
  });
}

function checksumFile(path) {
  /* Given the file [path], this will return the hash (sha1) of this file. */
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    const stream = fs.createReadStream(path);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => {
      const file_hash = hash.digest('hex');
      resolve(file_hash);
    });
  });
}
function formatBytes(bytes, decimals = 2) {
  // https://stackoverflow.com/a/18650828
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function confirmMessage(callbackOk, callbackNo, btnContentOk="Confirm", btnContentNo="Nope.") {
  const buttonOK = document.createElement("button");
  const buttonNo = document.createElement("button");
  const btnContainer = document.createElement("span");
  const message = document.querySelector("#message>p");
  buttonOK.innerText = btnContentOk;
  buttonOK.onclick = callbackOk;
  buttonNo.innerText = btnContentNo;
  buttonNo.onclick = callbackNo;
  btnContainer.classList.add("btnContainer");
  btnContainer.append(buttonOK,buttonNo);
  message.append(btnContainer);
}

          // setSideImage("error");
          // appendMessage(`The game isn't downloaded.`, true);
function appendMessage(text, reset = false) {
  const span = document.createElement("span");
  const message = document.querySelector("#message>p");
  span.innerHTML = text + "<br>";
  if (reset) {
    message.innerHTML = "";
  }
  message.append(span);
}
function setSideImage(id) {
  const image = {
    "yay": "shime01.png",
    "error": "shime5.png",
    "ask": "shime6.png",
    "sit tongue": "shime29.png"
  };
  document.getElementById("sideImage").src = "launcher_assets/eneSprites/" + image[id];
}

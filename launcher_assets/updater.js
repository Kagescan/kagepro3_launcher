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
    const title_category_being_dl = document.createElement("span");
    const title_file_being_dl = document.createElement("span");
    const general_progress = document.createElement("span");
    const file_progress = document.createElement("span");

    general_progress.innerHTML = `<svg width="80mm" height="14mm" version="1.1" viewBox="0 0 120 21" xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
     <rect x="17.5" y="3" width="100" height="10" fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width=".7"/>
     <rect x="17.3" y="3" width="0" height="10" class="progressBar"/>
     <path transform="matrix(1.218 0 0 1.1743 3 4.8239)" d="m8.3603 5.1835-5.3791 3.2167-5.3783-3.0961 0.0011-6.3197 5.3791-3.0925 5.3783 3.1116z" fill-rule="evenodd" stroke-width=".26458"/>
     <text transform="scale(1 1)" x="67.671822" y="19.335659" fill="#000000" font-family="sans-serif" font-size="5px" stroke-width=".2638" xml:space="preserve">In progress... (<tspan class="percentage"></tspan>%)</text>
     <path d="m65.503 18.033h-51.902l-6.9958-10.657" fill="none" stroke="#000" stroke-width=".7"/>
    </svg>`;
    file_progress.innerHTML = general_progress.innerHTML;
    title_category_being_dl.innerHTML = "Downloading";
    title_file_being_dl.innerHTML = "file";
    general_progress.id = "general_progress";
    file_progress.id = "file_progress";
    title_category_being_dl.id = "categoryDL";
    title_file_being_dl.id = "fileDL";

    const message = document.querySelector("#message>p");
    message.classList.add("downloading");
    message.innerHTML = "";
    message.append(title_category_being_dl, general_progress);
    message.append(title_file_being_dl, file_progress);
    {
      let tick = false;
      function animateEne() {
        if (! message.classList.contains("downloading")) {
          clearInterval(animateEne);
          return;
        }
        tick = !tick;
        setSideImage("waiting "+tick);
      }
      setInterval(animateEne, 1700);
    }

    ipc.on("downloadFinished", (event, options) => {
      message.classList.remove("downloading");
      appendMessage("Downloading finished !!", true);
      setSideImage("yay");
    });
    ipc.send("startDownload", downloadList);

    //window.api.send("startDownload", downloadList);
    // messageContainer.style.flexGrow = null;
  }

}

/*window.api.receive("updateDownloadMessage", (type) => {
  console.log(`Received ${data} from main process`);
});*/
ipc.on("updateDownloadMessage", (event, options) => {
  const {type, content} = options;
  switch (type) {
    case "categoryTitle":
      document.getElementById("categoryDL").innerText = content;
      break;
    case "fileTitle":
      document.getElementById("fileDL").innerText = content;
      break;
    case "categoryProgress":
      document.querySelector("#general_progress svg .percentage").innerHTML = content;
      document.querySelector("#general_progress svg .progressBar").setAttribute("width", content);
      break;
    case "fileProgress":
      document.querySelector("#file_progress svg .percentage").innerHTML = content;
      document.querySelector("#file_progress svg .progressBar").setAttribute("width", content);
      break;
  }
});
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
    "sit tongue": "shime29.png",
    "waiting false": "shime31.png",
    "waiting true": "shime32.png"
  };
  document.getElementById("sideImage").src = "launcher_assets/eneSprites/" + image[id];
}

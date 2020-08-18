const fs = require("fs");

const appVersion = process.env.npm_package_version;

function checkFiles() {
}
const updater = {
  start() {
    try {
      // if (!ene.init()) {
      //   appendMessage("huuuh Goshijin, I cannot appear ! But anyway...");
      // }
      if (fs.existsSync(`${__dirname}/index.html`) !== true) {
        appendMessage("Goshijin, let me just check if you can connect to kagescan's server !<br>...", true);
        GET(`https://kagescan.legtux.org/fangame/api/?appVersion=${appVersion}`)
        .catch(function(error) {
          setSideImage("error");
          appendMessage("An error happened !!!");
          console.log(error)
        })
        .then(function (data) {
            const updates = JSON.parse(data);
            if (updates.error !== "nothing") {
              setSideImage("error");
              appendMessage("An error happened !!!" + updates.error);
            } else {
              setSideImage("ask");
              appendMessage("I'm connected ! I'll download the game's full source code and assets, but this will require to fetch xx Mb...");
              confirmMessage(
                updater.DoDownloadZIP,
                function(){
                  setSideImage("sit tongue");
                  appendMessage("Goshujin, you should download the full source code and the assets in order to play the game !!", true);
                  appendMessage("Please restart the game when you're ready to download. Or maybe you may want to dowload manually ?");
                }
              )
            }
        });

      }
    } catch(err) {
      console.error("AN error occured during the file verification !! Please restart the app.");
      console.error(err);
    }
  },
  DoDownloadZIP() {
    console.log("lolool");
    alert("downloading zip");
  },
  DoDownloadItemList() {
    alert("downloading item list");
  }

}

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

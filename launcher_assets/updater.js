function getVersion() {
  return new Promise(function(resolve, reject) {
    // create the timeout
    let still_didnt_receive_reply = true;
    setTimeout(()=>{
      if (still_didnt_receive_reply) {
        reject("Cannot get the version of the launcher : timeout");
      }
    }, 1000);
    // ask
    window.api.send("getVersion");
    // get reponse
    window.api.receive("getVersion-reply", (data) => {
      still_didnt_receive_reply = false;
      resolve(data);
    });
  });
}
function checkFiles(hashList) {
  return new Promise(function(resolve, reject) {
    // create the timeout
    let still_didnt_receive_reply = true;
    setTimeout(()=>{
      if (still_didnt_receive_reply) {
        reject("File checking failed : timeout");
      }
    }, 15000);
    // ask
    window.api.send("checkFiles", hashList);
    // get reponse
    window.api.receive("checkFiles-reply", (data) => {
      still_didnt_receive_reply = false;
      resolve(data);
    });
  });
}
// UPDATER CLASS
const updater = {
  fetchedHashList: {},
  start() {
    getVersion()
    .then(function(appVersion) {
      document.title = `Retaining's Memories Launcher (version ${appVersion})`;
      document.getElementById("launcher_page_iframe").src = `https://kagescan.fr/fangame/launcher_page/?launcherVersion=${appVersion}`;
      appendMessage("Goshijin, let me just check if you can connect to kagescan's server !<br>...", true);

      GET(`https://kagescan.fr/fangame/api/?appVersion=${appVersion}&get=releaseInfo`)
      .then(
        updater.onceGotTheReleaseFile
      )
      .catch(function(error) {
        setSideImage("error");
        appendMessage("Seems like you can't access to Kagescan... Please restart the app in a private network (don't use your high-school's wifi). You can still force start the game, but I don't recommend it...");
        console.error(error);
      });
    })
    .catch( function(err) {
        setSideImage("error");
        appendMessage("<br>Seems like you can't access to Kagescan or an error might have occured during the file verification... Please restart the app in a private network (ie. don't use your high-school's wifi). You can still force start the game, but I don't recommend it...");
        console.error("An error occured during the file verification !! Please restart the app.");
        console.error(err);
    });
  },
  async onceGotTheReleaseFile(data) {
    const updates = JSON.parse(data);
    if (updates.error !== "nothing") {
      setSideImage("error");
      appendMessage("An error happened !!!" + updates.error);
      return updates.error;
    }

    updater.fetchedHashList = updates.hashList;
    checkFiles(updater.fetchedHashList)
    .then(function(downloadList) {
      if (downloadList.totalSize == 0) {
        show_play_btn();
      } else {
        setSideImage("ask");
        appendMessage(`I'm connected ! I'll download the game's full source code and assets, but this will require to fetch ${downloadList.formatedSize} ...`);
        confirmMessage(
          function() { updater.DoDownloadItemList(downloadList); },
          function(){
            setSideImage("sit tongue");
            appendMessage("Goshujin, you should download the full source code and the assets in order to play the game !!", true);
            appendMessage("Please restart the game when you're ready to download. Or maybe you may want to dowload manually ?");
            appendMessage("You can still <a href='index.html'>force start the game</a> with the current files already downloaded, but I don't recommend it...")
          }
        )
      }
    })
    .catch(function(e) {
      alert(e);
    });
  },

  DoDownloadItemList(downloadList) {
    const title_category_being_dl = document.createElement("span");
    const title_file_being_dl = document.createElement("span");
    const general_progress = document.createElement("span");
    const file_progress = document.createElement("span");

    general_progress.innerHTML = `<svg width="80mm" height="14mm" version="1.1" viewBox="0 0 120 21" xmlns="https://www.w3.org/2000/svg" xmlns:cc="https://creativecommons.org/ns#" xmlns:dc="https://purl.org/dc/elements/1.1/" xmlns:rdf="https://www.w3.org/1999/02/22-rdf-syntax-ns#">
     <rect x="17.5" y="3" width="100" height="10" fill="#133d59" fill-rule="evenodd" stroke="#218791" stroke-width=".7"/>
     <rect x="17.3" y="3" width="0" height="10" class="progressBar" fill="#59bfc8"/>
     <path transform="matrix(1.218 0 0 1.1743 3 4.8239)" d="m8.3603 5.1835-5.3791 3.2167-5.3783-3.0961 0.0011-6.3197 5.3791-3.0925 5.3783 3.1116z" fill-rule="evenodd" stroke-width=".26458" fill="#218791"/>
     <text transform="scale(1 1)" x="67.671822" y="19.335659" fill="#218791" font-family="sans-serif" font-size="5px" stroke-width=".2638" xml:space="preserve">In progress... (<tspan class="percentage"></tspan>%)</text>
     <path d="m65.503 18.033h-51.902l-6.9958-10.657" fill="none" stroke="#218791" stroke-width=".7"/>
    </svg>`;
    file_progress.innerHTML = '<progress max="100" value="0"></progress>';
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

    window.api.send("startDownload", downloadList);

    window.api.receive("downloadFinished", async () => {
      message.classList.remove("downloading");
      appendMessage("Download finished !!", true);
      setSideImage("yay");

      checkFiles(updater.fetchedHashList)
      .then(function(downloadList) {
        if (downloadList.totalSize == 0) {
          show_play_btn();
        } else {
          alert("Error !! The updater couldn't download all the files. \n"+
            "Please ensure you are connected to a stable private network (avoid mac donald's or your high-school's wifi) and restart the game.");
        }
      })
      .catch(function(e) {
        alert(e);
      });
    });
  }
}

window.api.receive("updateDownloadMessage", (options) => {
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
      document.querySelector("#file_progress progress").setAttribute("value", content);
      break;
  }
});

window.api.receive("alert", (content) => {
  alert(content);
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

function show_play_btn() {
  const a = document.createElement("a");
  a.id = "play_btn"
  a.href = "index.html"
  a.style.margin = "auto"
  a.innerHTML = `
    <svg width="100mm" height="50mm" viewBox="0 0 100 50" xmlns="https://www.w3.org/2000/svg">
      <defs>
        <g id="LETS" transform="translate(-3.4095 -40.755)">
          <path fill="#ff227e" stroke-width=".26458" d="m 26.798174,26.082651 h 0.361734 q 0.05684,0.589109 0.227375,0.981849 0.170532,0.392739 0.418578,0.625283 0.253214,0.232543 0.573607,0.330728 0.32556,0.09302 0.687294,0.09302 0.434081,0 0.738971,-0.10852 0.310057,-0.10852 0.506427,-0.299723 0.201537,-0.196369 0.289387,-0.465086 0.09302,-0.273884 0.09302,-0.599445 0,-0.403075 -0.134358,-0.661456 -0.134358,-0.263549 -0.377237,-0.444416 -0.237711,-0.186034 -0.573606,-0.320393 -0.335896,-0.134358 -0.738971,-0.279051 -0.403075,-0.144694 -0.769976,-0.30489 -0.361734,-0.160197 -0.640786,-0.397908 -0.279052,-0.237711 -0.444416,-0.578774 -0.160196,-0.346231 -0.160196,-0.857826 0,-0.480589 0.155028,-0.878497 0.155029,-0.397907 0.459919,-0.676959 0.30489,-0.284219 0.754474,-0.439248 0.454751,-0.155029 1.054196,-0.155029 0.23771,0 0.490924,0.02584 0.253214,0.02067 0.50126,0.06718 0.253214,0.04651 0.496092,0.113687 0.242879,0.06201 0.459919,0.139526 l 0.06201,1.875849 H 30.92711 q -0.04651,-0.558104 -0.206706,-0.909503 -0.160196,-0.351398 -0.392739,-0.547768 -0.227376,-0.201537 -0.511595,-0.273884 -0.279052,-0.07752 -0.573607,-0.07752 -0.392739,0 -0.682127,0.09819 -0.289387,0.09302 -0.480589,0.273885 -0.191202,0.175699 -0.289387,0.43408 -0.09302,0.253214 -0.09302,0.573607 0,0.382404 0.134358,0.635618 0.134358,0.253214 0.377237,0.439248 0.248046,0.180867 0.589109,0.325561 0.346231,0.139526 0.759641,0.294554 0.377237,0.144694 0.738971,0.310058 0.366902,0.160196 0.651121,0.408242 0.289387,0.242879 0.465086,0.604613 0.1757,0.356566 0.1757,0.888832 0,0.516762 -0.180867,0.919837 -0.175699,0.403075 -0.511595,0.676959 -0.330728,0.273885 -0.811318,0.418578 -0.480589,0.144694 -1.085201,0.144694 -0.263549,0 -0.547769,-0.02584 -0.279052,-0.02584 -0.558103,-0.07751 -0.273885,-0.05168 -0.537434,-0.118855 -0.263549,-0.06718 -0.490924,-0.155029 z m -2.3306,-5.260644 q 0.12919,-0.01034 0.258381,-0.0155 0.129191,-0.01034 0.258381,-0.01034 0.129191,0 0.253214,0.01034 0.129191,0.0052 0.263549,0.0155 l -0.361734,2.811189 q -0.07751,0.0155 -0.155029,0.0155 -0.07751,0 -0.155028,-0.0155 z m -7.260516,0 h 6.056459 l 0.124023,2.227247 h -0.361734 q -0.07235,-0.578774 -0.186035,-0.935341 -0.113688,-0.356566 -0.32556,-0.547768 -0.206705,-0.19637 -0.537433,-0.263549 -0.330729,-0.06718 -0.831988,-0.06718 h -0.418578 v 6.681741 h 1.136878 v 0.41341 h -3.281443 v -0.41341 h 1.136878 v -6.681741 h -0.39274 q -0.335896,0 -0.594277,0.02584 -0.258381,0.02584 -0.454751,0.09819 -0.191202,0.07235 -0.330728,0.201537 -0.139526,0.129191 -0.237711,0.330728 -0.09818,0.201538 -0.170532,0.485757 -0.06718,0.28422 -0.118855,0.671792 h -0.361734 z m -5.162459,3.405466 h 0.676959 q 0.346231,0 0.578774,-0.02584 0.232543,-0.02584 0.372069,-0.144694 0.144694,-0.124023 0.21704,-0.377237 0.07235,-0.258381 0.103353,-0.723468 h 0.366901 v 3.059236 h -0.366901 q -0.02584,-0.470255 -0.08785,-0.738971 -0.06201,-0.273884 -0.201537,-0.41341 -0.139526,-0.139526 -0.377237,-0.1757 -0.232543,-0.03617 -0.604612,-0.03617 h -0.676959 v 3.26594 h 1.369421 q 0.403075,0 0.707965,-0.03101 0.30489,-0.03101 0.532265,-0.113687 0.227376,-0.08268 0.387572,-0.232544 0.165364,-0.149861 0.28422,-0.387572 0.118855,-0.23771 0.201537,-0.578774 0.08268,-0.341063 0.155029,-0.80615 h 0.361734 l -0.103353,2.563143 h -5.937603 v -0.41341 h 1.033525 v -6.681741 h -1.033525 v -0.41341 h 5.808412 l 0.103353,2.072218 h -0.361734 q -0.07751,-0.516763 -0.191202,-0.837156 -0.113688,-0.32556 -0.320393,-0.506427 -0.201537,-0.186035 -0.532265,-0.248046 -0.325561,-0.06718 -0.826821,-0.06718 h -1.638137 z m -5.3794998,3.689685 q 0.4030749,0 0.7079649,-0.03101 0.30489,-0.03101 0.5322656,-0.113687 0.2325432,-0.08785 0.3979072,-0.237711 0.1653641,-0.155029 0.2842195,-0.397907 0.1188554,-0.242879 0.2015374,-0.58911 0.08785,-0.351399 0.1550288,-0.831988 H 9.3057565 L 9.1920687,28.330568 H 3.4094944 v -0.41341 H 4.4430197 V 21.235417 H 3.4094944 v -0.41341 h 3.0747379 v 0.41341 H 5.4507069 v 6.681741 z"></path>
        </g>
        <g id="PLAY" transform="translate(-69.158 -30.692)">
          <path fill="#ff227e" stroke-width=".26458" d="m 88.262511,21.089278 h 3.074738 v 0.41341 h -0.950844 l 1.912022,2.992056 1.881016,-2.992056 h -0.976681 v -0.41341 h 2.413282 v 0.41341 h -0.878497 l -2.211744,3.503651 v 3.17809 h 1.136878 v 0.41341 h -3.281443 v -0.41341 h 1.136878 v -3.023061 l -2.340935,-3.65868 h -0.91467 z m -3.922228,7.095151 v 0.41341 h -2.516635 v -0.41341 h 0.98185 l 2.687165,-7.172666 h 0.408243 l 2.521802,7.172666 h 1.02319 v 0.41341 h -3.17809 v -0.41341 h 1.074866 L 86.56753,25.977853 h -2.43912 l -0.821653,2.206576 z m 1.038693,-5.539696 -1.09037,2.914542 h 2.13423 l -1.02319,-2.914542 z m -6.351014,5.539696 q 0.403075,0 0.707965,-0.03101 0.30489,-0.03101 0.532265,-0.113687 0.232544,-0.08785 0.397908,-0.237711 0.165364,-0.155029 0.284219,-0.397907 0.118856,-0.242879 0.201538,-0.58911 0.08785,-0.351399 0.155028,-0.831988 h 0.361734 l -0.113687,2.614819 h -5.782575 v -0.41341 h 1.033526 v -6.681741 h -1.033526 v -0.41341 h 3.074738 v 0.41341 H 77.81357 v 6.681741 z m -7.048643,-7.095151 q 0.857826,0 1.441768,0.155028 0.583942,0.155029 0.940508,0.434081 0.361734,0.273884 0.516763,0.661456 0.160196,0.382405 0.160196,0.842323 0,0.434081 -0.144693,0.847491 -0.144694,0.41341 -0.506428,0.738971 -0.356566,0.32556 -0.961178,0.52193 -0.599445,0.19637 -1.514115,0.19637 h -0.713132 v 2.697501 h 1.085201 v 0.41341 h -3.126414 v -0.41341 h 1.033526 v -6.681741 h -1.033526 v -0.41341 z m -0.780311,3.98424 h 0.635618 q 0.594277,0 0.997352,-0.08785 0.408242,-0.09302 0.651121,-0.310057 0.242878,-0.217041 0.346231,-0.573607 0.10852,-0.361734 0.10852,-0.899167 0,-0.444416 -0.08268,-0.764809 -0.07752,-0.320393 -0.299722,-0.527098 -0.222208,-0.211872 -0.620116,-0.310057 -0.392739,-0.09819 -1.018022,-0.09819 h -0.7183 z"></path>
        </g>
        <path id="triangle" transform="translate(19.59 -22.465)" d="m39.975 10.488-14.897 8.63 1.34e-4 -17.306z" fill="#ff227e" fill-rule="evenodd" stroke-width=".16361"></path>
      </defs>

      <g id="box" transform="translate(-3.5e-8 -.041857)">
        <path id="path843" d="m99.692 39.289-10.824 10.295 10.883 0.16624z" fill="#ff227e"></path>
        <path id="path845" d="m85.116 49.727 14.528-14.007m-99.148-35.224h99.007v49.007h-99.007z" fill="none" stroke="#ff227e"></path>
      </g>

      <circle id="animatedCircle" cx="50" cy="25" fill="none" stroke="#ff227e"></circle>
      <g id="state_defs">
        <g id="state_0" class="">
          <use href="#PLAY" id="use870" transform="matrix(2.2021 0 0 2.2021 20.868 37.963)"></use>
        </g>
        <g id="state_1" class="hide">
          <circle id="plainCircle" cx="50" cy="25" r="8.8577" fill="#ff227e"></circle>
        </g>
        <g id="state_2" class="hide">
          <use href="#triangle" transform="rotate(-90 69.558 7.5584)"></use>
        </g>
        <g id="state_3" class="hide">
          <rect id="square" x="41.335" y="16.335" width="17.33" height="17.33" fill="#ff227e"></rect>
          <use href="#LETS" transform="translate(8.3938 41.178)"></use>
        </g>
        <g id="state_4" class="hide">
          <use href="#triangle" transform="translate(.53991 37)"></use>
          <use href="#LETS" transform="translate(8.3938 41.178)"></use>
          <use href="#PLAY" transform="translate(65.887 30.887)"></use>
        </g>
      </g>
    </svg>`;
  let isPlayingAnimation = false;
  const circle = a.querySelector("#animatedCircle");
  a.addEventListener("mouseover", function() {
    if (isPlayingAnimation) return 1;
    isPlayingAnimation = true;
    circle.setAttribute("class", "big");

    for (let i=1; i<5; i++) {
      setTimeout( function() {
        if (! isPlayingAnimation) return 1;
        if (i > 2) {
          circle.setAttribute("class", "final");
        } else if (i > 3) {
          isPlayingAnimation = false;
        }
        a.querySelector(`#state_${i-1}`).classList.add("hide");
        a.querySelector(`#state_${i}`).classList.remove("hide");
       }, 100 + 100 * i );
    }
  });
  a.addEventListener("mouseleave", function() {
    a.querySelector(`#state_0`).classList.remove("hide");
    isPlayingAnimation = false;
    for (let i=1; i<5; i++) {
      const frame_cl = a.querySelector(`#state_${i}`).classList;
      if (! frame_cl.contains("hide")) {
        frame_cl.add("hide");
        circle.removeAttribute("class", "final");
      }
    }
  });

  // Append the code to the box
  const box = document.getElementById("message");
  box.innerHTML = "";
  box.append(a);
}

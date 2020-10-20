
window.api.receive("devtools-opened", (data) => {
  console.log('%cWAIT !!', 'color: blue; font-size: 50px; padding: 5px; border: 5px solid blue;');
  console.log('%cIf someone told you to copy / paste something here, chances are roughly 11 in 10 that it is a scam.', 'color: black; font-size: 30px;');
  console.log('%cPaste something here could give attackers access to your computer', 'color: red; font-size: 30px;');
  console.log('Unless you understand exactly what you\'re doing, close that window and stay safe.');
  console.log('If you understand exactly what you\'re doing, you should come work with us');
});

document.addEventListener("DOMContentLoaded", function () {
  var isDev = false;
  window.api.receive("sendIsDev-reply", () => {
    isDev = true;
  });
  window.api.send("sendIsDev"); // ask to change the var

  // EVENTS
  document.addEventListener("keydown", function (e) {
    if (isDev && e.which === 123) {
      // dev shortcut; don't work if focused on an iframe
      window.api.send("toggleDevTools");
    }
  });

  const do_hide_intro_video = function() {
    const container = document.getElementById("video_intro_container");
    if (container instanceof Element) {
      container.classList.add("hide");
      setTimeout(function() {
        // double check is needed because between the 700ms, it may have been deleted
        if (container instanceof Element) {
          container.remove();
        }
      }, 700)
    }
  };
  const video_element = document.getElementById("video_intro_elem");
  video_element.addEventListener("ended", do_hide_intro_video);
  video_element.addEventListener("click", do_hide_intro_video);

  // MAIN
  try {
    updater.start();
  } catch (e) {
    alert("An error occured during the initialisation of the launcher.\n You shouldn't see this message !. Please click okay, then take a screenshot and send it to us in order to report the bug. \n");
    alert(`Informations about the error : \n ------- \n${e}`);
  }
});




function startGame() {
  location.href = "index.html";
}

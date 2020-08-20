
document.addEventListener("DOMContentLoaded", function () {
  const {remote} = require('electron');
  // TODO: Remove the use of remote (see below)
  const currentWindow = remote.getCurrentWindow();

  // TODO : same as above, but I should think of a way to get globals using IPC
  //        maybe abusing a bit of the variable scope :
  // > let foo = 0
  // > function bar() { foo = 1 }
  // > console.log(foo) // ---> 0
  // > bar()
  // > console.log(foo) // ---> 1
  const isDev = remote.getGlobal('isDev');

  // EVENTS
  currentWindow.webContents.on("devtools-opened", ()=>{
    // TODO: See todo above. We can just use IPC in this case.
    console.log('%cWAIT !!', 'color: blue; font-size: 50px; padding: 5px; border: 5px solid blue;');
    console.log('%cIf someone told you to copy / paste something here, chances are roughly 11 in 10 that it is a scam.', 'color: black; font-size: 30px;');
    console.log('%cPaste something here could give attackers access to your computer', 'color: red; font-size: 30px;');
    console.log('Unless you understand exactly what you\'re doing, close that window and stay safe.');
    console.log('If you understand exactly what you\'re doing, you should come work with us');
  });
  document.addEventListener("keydown", function (e) {
    console.log(isDev);
    if (isDev) {
      // dev shortcuts
      // maybe should be disabled for releases.
      if (e.which === 123) { //F12
        // TODO : remote problem, same as above
        currentWindow.toggleDevTools()
      } else if (e.which === 116) { //F5
        location.reload();
      }
    }
  });

  // MAIN
  console.log("started");
  setTimeout(updater.start, 1000);
});




function startGame() {
  location.href = "index.html";
}

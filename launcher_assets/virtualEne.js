// const eneGlobalStorage = {
//     pos: {x: 0, y: 0}
// };
const ene = {
  spriteWidth: 128,
  spriteHeight: 128,
  origin: {x: 128/2, y: 128},
  applyOrigin(posx, posy){
    return {
      x: posx - this.origin.x,
      y: posy - this.origin.y
    };
  },
  init() {
   this.img = document.createElement("img");
   const img = this.img;
   img.src = "launcher_assets/eneSprites/shime5.png";
   img.alt = "ENE.EXE";
   img.id = "ene";
   const initialPos = this.applyOrigin(document.body.clientWidth/2, document.body.clientHeight);
   img.style.left = `${initialPos.x}px`;
   img.style.top = `${initialPos.y}px`;
   img.style.bottom = "initial";
   document.getElementById("body").append(img);
   return true;
 },

};

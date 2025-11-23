export const mouse = { x: 0, y: 0, down: 0, type: 1 };

const githubBtn = document.getElementById('githubBtn') as HTMLAnchorElement;
githubBtn.onmousedown = (event) => {
  event.stopPropagation();
};

window.addEventListener('mousedown', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  if (event.button == 0) mouse.down = 1;
  if (event.button == 2) mouse.down = 2;
});

window.addEventListener('mouseup', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  mouse.down = 0;
});

window.addEventListener('mousemove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

window.addEventListener('keydown', (event) => {
  if (event.code.includes('Digit')) {
    const type = parseInt(event.code[5]);
    if (type < 4) mouse.type = type;
  }
});

// window.addEventListener('touchstart', (event) => {

// })

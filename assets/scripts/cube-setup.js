// assets/scripts/cube-setup.js

const colors = { U:'#ffffff', L:'#ffa500', F:'#00ff00', R:'#ff0000', B:'#0000ff', D:'#ffff00' };
const state  = { U:Array(9).fill('U'), L:Array(9).fill('L'), F:Array(9).fill('F'),
                 R:Array(9).fill('R'), B:Array(9).fill('B'), D:Array(9).fill('D') };
const colorLetters = { U:'W', L:'O', F:'G', R:'R', B:'B', D:'Y' };
let selectedColor = 'U';

function setupPalette() {
  const pal = document.querySelector('.palette');
  pal.innerHTML = '';
  for (let [face, hex] of Object.entries(colors)) {
    const btn = document.createElement('button');
    btn.style.background = hex;
    btn.dataset.face = face;
    btn.title = face;
    btn.addEventListener('click', () => {
      selectedColor = face;
      document.querySelectorAll('.palette button')
              .forEach(b => b.classList.toggle('selected', b === btn));
    });
    if (face === selectedColor) btn.classList.add('selected');
    pal.appendChild(btn);
  }
}

function getCell(r, c) {
  if (r<3 && c>=3 && c<6) return ['U', r*3 + (c-3)];
  if (r>=3 && r<6) {
    const rr = r-3;
    if (c<3)  return ['L', rr*3 + c];
    if (c<6)  return ['F', rr*3 + (c-3)];
    if (c<9)  return ['R', rr*3 + (c-6)];
    if (c<12) return ['B', rr*3 + (c-9)];
  }
  if (r>=6 && r<9 && c>=3 && c<6) return ['D', (r-6)*3 + (c-3)];
  return null;
}

function setupGrid() {
  const net = document.querySelector('.cube-net');
  net.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 12; c++) {
      const cell = getCell(r, c);
      const div = document.createElement('div');
      div.className = 'facelet';
      if (cell) {
        const [f, i] = cell;
        div.dataset.face = f;
        div.dataset.idx  = i;
        div.tabIndex = 0;
        setColor(div);
        div.addEventListener('click', () => assignColor(div));
        div.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            assignColor(div);
          }
        });
      } else {
        div.style.visibility = 'hidden';
        div.tabIndex = -1;
      }
      net.appendChild(div);
    }
  }
}

function assignColor(div) {
  const f = div.dataset.face;
  const i = +div.dataset.idx;
  state[f][i] = selectedColor;
  setColor(div);
}

function setColor(div) {
  const f = div.dataset.face;
  const i = +div.dataset.idx;
  div.style.background = colors[state[f][i]];
}

document.addEventListener('DOMContentLoaded', () => {
  setupPalette();
  setupGrid();
  document.getElementById('StringErzeugung').addEventListener('click', () => {
    const cnt = {U:0,L:0,F:0,R:0,B:0,D:0};
    Object.values(state).flat().forEach(c => cnt[c]++);
    if (!Object.values(cnt).every(x => x===9)) {
      alert('Jede Farbe muss genau 9× vorkommen!');
      return;
    }
    let s1 = '', s2 = '';
    ['U','R','F','D','L','B'].forEach(f =>
      state[f].forEach(st => {
        s1 += st;
        s2 += colorLetters[st];
      })
    );
    document.getElementById('result-faces').innerText  = 'Faces: '  + s1;
    document.getElementById('result-colors').innerText = 'Colors: ' + s2;
  });
});
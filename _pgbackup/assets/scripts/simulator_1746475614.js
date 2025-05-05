// simulator.js – vollständige Version mit funktionierender Farbcodierung und 3D-Würfel
document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById('simulator');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
  camera.position.set(5, 5, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const cubeGroup = new THREE.Group();
  scene.add(cubeGroup);

  const colors = {
    U: 0xffffff,
    D: 0xffff00,
    F: 0x00ff00,
    B: 0x0000ff,
    R: 0xff0000,
    L: 0xffa500
  };

  const cubies = [];
  const size = 1, gap = 0.05;

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const mats = [
          new THREE.MeshBasicMaterial({ color: x === 1 ? colors.R : 0x000000 }),
          new THREE.MeshBasicMaterial({ color: x === -1 ? colors.L : 0x000000 }),
          new THREE.MeshBasicMaterial({ color: y === 1 ? colors.U : 0x000000 }),
          new THREE.MeshBasicMaterial({ color: y === -1 ? colors.D : 0x000000 }),
          new THREE.MeshBasicMaterial({ color: z === 1 ? colors.F : 0x000000 }),
          new THREE.MeshBasicMaterial({ color: z === -1 ? colors.B : 0x000000 })
        ];

        const geom = new THREE.BoxGeometry(size, size, size);
        geom.clearGroups();
        for (let i = 0; i < 6; i++) {
          geom.addGroup(i * 6, 6, i);
        }

        const cubie = new THREE.Mesh(geom, mats);
        cubie.position.set(
          x * (size + gap),
          y * (size + gap),
          z * (size + gap)
        );
        cubeGroup.add(cubie);
        cubies.push(cubie);
      }
    }
  }

  const moveMap = {
    R: { axis: new THREE.Vector3(1, 0, 0), dir: -1, slice: c => c.position.x > 0.5 },
    L: { axis: new THREE.Vector3(1, 0, 0), dir: 1, slice: c => c.position.x < -0.5 },
    U: { axis: new THREE.Vector3(0, 1, 0), dir: -1, slice: c => c.position.y > 0.5 },
    D: { axis: new THREE.Vector3(0, 1, 0), dir: 1, slice: c => c.position.y < -0.5 },
    F: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => c.position.z > 0.5 },
    B: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => c.position.z < -0.5 },
    M: { axis: new THREE.Vector3(1, 0, 0), dir: 1, slice: c => Math.abs(c.position.x) < 0.01 },
    E: { axis: new THREE.Vector3(0, 1, 0), dir: 1, slice: c => Math.abs(c.position.y) < 0.01 },
    S: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => Math.abs(c.position.z) < 0.01 },
    x: { axis: new THREE.Vector3(1, 0, 0), dir: -1, whole: true },
    y: { axis: new THREE.Vector3(0, 1, 0), dir: -1, whole: true },
    z: { axis: new THREE.Vector3(0, 0, 1), dir: -1, whole: true }
  };

  function parseAlgorithm(str) {
    return str.trim().split(/\s+/).map(tok => {
      const face = tok[0];
      let count = 1, prime = false;
      if (tok.endsWith('2')) count = 2;
      if (tok.endsWith("'")) prime = true;
      return { face, count, prime };
    });
  }

  function animateMove({ face, count, prime }, onComplete) {
    const move = moveMap[face];
    if (!move) { onComplete(); return; }
    const { axis, dir: baseDir, slice, whole } = move;
    const direction = baseDir * (prime ? -1 : 1);
    const total = Math.PI / 2 * count;
    let rotated = 0;

    if (whole) {
      function stepWhole() {
        const delta = Math.min(0.1, total - rotated);
        cubeGroup.rotateOnAxis(axis, direction * delta);
        rotated += delta;
        if (rotated < total) requestAnimationFrame(stepWhole);
        else onComplete();
      }
      stepWhole();
    } else {
      const sliceCubies = cubies.filter(slice);
      const tempGroup = new THREE.Group();
      scene.add(tempGroup);
      sliceCubies.forEach(c => tempGroup.attach(c));

      function stepSlice() {
        const delta = Math.min(0.1, total - rotated);
        tempGroup.rotateOnAxis(axis, direction * delta);
        rotated += delta;
        if (rotated < total) requestAnimationFrame(stepSlice);
        else {
          sliceCubies.forEach(c => cubeGroup.attach(c));
          scene.remove(tempGroup);
          onComplete();
        }
      }
      stepSlice();
    }
  }

  let animating = false;
  function runSequence(seq) {
    if (!seq.length) { animating = false; return; }
    animating = true;
    animateMove(seq.shift(), () => runSequence(seq));
  }

  document.getElementById('start').addEventListener('click', () => {
    if (animating) return;
    const moves = parseAlgorithm(document.getElementById('algo').value);
    runSequence(moves);
  });

  (function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Farbcodes übernehmen
  const colorMap = {
    W: 0xffffff,
    R: 0xff0000,
    G: 0x00ff00,
    B: 0x0000ff,
    O: 0xffa500,
    Y: 0xffff00
  };

  document.getElementById("applyColorString").addEventListener("click", () => {
    console.log("Farbcode-Schaltfläche wurde geklickt!");
    const str = document.getElementById("colorstring").value.trim().toUpperCase();
    console.log("Eingegebener Farbstring:", str);
    applyColorString(str);
  });

  function applyColorString(str) {
    if (str.length !== 54) {
      alert("Der Farbstring muss genau 54 Zeichen enthalten.");
      return;
    }

    const facelets = {
      U: str.slice(0, 9).split(""),
      R: str.slice(9, 18).split(""),
      F: str.slice(18, 27).split(""),
      D: str.slice(27, 36).split(""),
      L: str.slice(36, 45).split(""),
      B: str.slice(45, 54).split("")
    };

    cubies.forEach(cubie => {
      const pos = cubie.position;
      const mats = cubie.material;
      if (pos.x === 1) mats[0].color.setHex(colorMap[facelets.R.shift()]);
      if (pos.x === -1) mats[1].color.setHex(colorMap[facelets.L.shift()]);
      if (pos.y === 1) mats[2].color.setHex(colorMap[facelets.U.shift()]);
      if (pos.y === -1) mats[3].color.setHex(colorMap[facelets.D.shift()]);
      if (pos.z === 1) mats[4].color.setHex(colorMap[facelets.F.shift()]);
      if (pos.z === -1) mats[5].color.setHex(colorMap[facelets.B.shift()]);
    });

    console.log("✅ Farbcode wurde vollständig angewendet.");
  }
});
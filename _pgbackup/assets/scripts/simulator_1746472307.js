// assets/scripts/simulator.js

// Three.js und OrbitControls vorausgesetzt, also diese Skripte zuerst in der HTML laden:
// <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

(function() {
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

  const colors = { U: 0xffffff, D: 0xffff00, F: 0x00ff00, B: 0x0000ff, R: 0xff0000, L: 0xffa500 };
  const cubies = [];
  const size = 1, gap = 0.05;
  // Erzeuge alle kleinen Würfel
  for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
              const geom = new THREE.BoxGeometry(size, size, size);
              const faces = [
                  ['R', x === 1], ['L', x === -1],
                  ['U', y === 1], ['D', y === -1],
                  ['F', z === 1], ['B', z === -1]
              ];
              const mats = faces.map(([f, cond]) =>
                  new THREE.MeshBasicMaterial({ color: cond ? colors[f] : 0x000000 })
              );
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

  const eps = 0.001;
  const moveMap = {
      // Face-Turns
      R: { axis: new THREE.Vector3(1, 0, 0), dir: -1, slice: c => c.position.x > eps },
      L: { axis: new THREE.Vector3(1, 0, 0), dir:  1, slice: c => c.position.x < -eps },
      U: { axis: new THREE.Vector3(0, 1, 0), dir: -1, slice: c => c.position.y > eps },
      D: { axis: new THREE.Vector3(0, 1, 0), dir:  1, slice: c => c.position.y < -eps },
      F: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => c.position.z > eps },
      B: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => c.position.z < -eps },
      // Mittlere Scheiben
      M: { axis: new THREE.Vector3(1, 0, 0), dir:  1, slice: c => Math.abs(c.position.x) <= eps },
      E: { axis: new THREE.Vector3(0, 1, 0), dir:  1, slice: c => Math.abs(c.position.y) <= eps },
      S: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => Math.abs(c.position.z) <= eps },
      // Ganze Würfel drehen
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
          // ganze Gruppe rotieren
          function stepWhole() {
              const delta = Math.min(0.1, total - rotated);
              cubeGroup.rotateOnAxis(axis, direction * delta);
              rotated += delta;
              if (rotated < total) requestAnimationFrame(stepWhole);
              else onComplete();
          }
          stepWhole();
      } else {
          // Scheibe isolieren
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
})();

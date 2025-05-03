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
  
    const colors = { U: 0xffff00, D: 0xffffff, F: 0x00ff00, B: 0x0000ff, R: 0xff0000, L: 0xffa500 };
    const cubies = [];
    const size = 1, gap = 0.05;
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
            new THREE.MeshLambertMaterial({ color: cond ? colors[f] : 0x000000 })
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
  
    const moveMap = {
      R: { axis: new THREE.Vector3(1, 0, 0), dir: -1 },
      L: { axis: new THREE.Vector3(1, 0, 0), dir: 1 },
      U: { axis: new THREE.Vector3(0, 1, 0), dir: -1 },
      D: { axis: new THREE.Vector3(0, 1, 0), dir: 1 },
      F: { axis: new THREE.Vector3(0, 0, 1), dir: -1 },
      B: { axis: new THREE.Vector3(0, 0, 1), dir: -1 }
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
  
    function getFaceGroup(face) {
      const eps = 0.001;
      return cubies.filter(c => {
        const p = c.position;
        switch (face) {
          case 'R': return p.x > eps;
          case 'L': return p.x < -eps;
          case 'U': return p.y > eps;
          case 'D': return p.y < -eps;
          case 'F': return p.z > eps;
          case 'B': return p.z < -eps;
        }
      });
    }
  
    function animateMove({ face, count, prime }, onComplete) {
      const { axis, dir: baseDir } = moveMap[face];
      const slice = getFaceGroup(face);
      const tempGroup = new THREE.Group();
      scene.add(tempGroup);
      slice.forEach(c => tempGroup.attach(c));
  
      let rotated = 0;
      const total = Math.PI / 2 * count;
      const direction = baseDir * (prime ? -1 : 1);
  
      function step() {
        const delta = Math.min(0.1, total - rotated);
        tempGroup.rotateOnAxis(axis, direction * delta);
        rotated += delta;
        if (rotated < total) {
          requestAnimationFrame(step);
        } else {
          slice.forEach(c => cubeGroup.attach(c));
          scene.remove(tempGroup);
          onComplete();
        }
      }
      step();
    }
  
    let animating = false;
    function runSequence(seq) {
      if (!seq.length) {
        animating = false;
        return;
      }
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
// assets/scripts/algs_01.js
document.addEventListener("DOMContentLoaded", () => {
  // Für jede .simulator-Instanz eine eigenständige Simulation aufsetzen
  document.querySelectorAll(".simulator-wrapper").forEach(wrapper => {
    const container = wrapper.querySelector(".simulator");
    const input     = wrapper.querySelector(".algo");
    const button    = wrapper.querySelector(".start");
    const colors    = container.dataset.colors;
    const algo      = container.dataset.algo;

    // 1) Input-Feld füllen
    input.value = algo;

    // 2) Szene, Kamera, Renderer
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const aspect   = container.clientWidth / container.clientHeight;
    const camera   = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3) Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    // 4) Licht
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // 5) Würfel aufbauen
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    const cubies = [];
    const size = 1, gap = 0.05;
    const faceColors = {
      R: 0xff0000, L: 0xffa500,
      U: 0xffffff, D: 0xffff00,
      F: 0x00ff00, B: 0x0000ff
    };

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const geom = new THREE.BoxGeometry(size, size, size);
          geom.clearGroups();
          for (let i = 0; i < 6; i++) geom.addGroup(i * 6, 6, i);

          const mats = Array(6).fill().map(() =>
            new THREE.MeshBasicMaterial({ color: 0x000000 })
          );
          if (Math.abs(x - 1) < .01) mats[0].color.setHex(faceColors.R);
          if (Math.abs(x + 1) < .01) mats[1].color.setHex(faceColors.L);
          if (Math.abs(y - 1) < .01) mats[2].color.setHex(faceColors.U);
          if (Math.abs(y + 1) < .01) mats[3].color.setHex(faceColors.D);
          if (Math.abs(z - 1) < .01) mats[4].color.setHex(faceColors.F);
          if (Math.abs(z + 1) < .01) mats[5].color.setHex(faceColors.B);

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

    // 6) Parser & Move-Map
    const moveMap = {
      R: { axis: new THREE.Vector3(1, 0, 0), dir: -1, slice: c => c.position.x > 0.5 },
      L: { axis: new THREE.Vector3(1, 0, 0), dir:  1, slice: c => c.position.x < -0.5 },
      U: { axis: new THREE.Vector3(0, 1, 0), dir: -1, slice: c => c.position.y > 0.5 },
      D: { axis: new THREE.Vector3(0, 1, 0), dir:  1, slice: c => c.position.y < -0.5 },
      F: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => c.position.z > 0.5 },
      B: { axis: new THREE.Vector3(0, 0, 1), dir:  1, slice: c => c.position.z < -0.5 },
      M: { axis: new THREE.Vector3(1, 0, 0), dir:  1, slice: c => Math.abs(c.position.x) < 0.01 },
      E: { axis: new THREE.Vector3(0, 1, 0), dir:  1, slice: c => Math.abs(c.position.y) < 0.01 },
      S: { axis: new THREE.Vector3(0, 0, 1), dir: -1, slice: c => Math.abs(c.position.z) < 0.01 },
      x: { axis: new THREE.Vector3(1, 0, 0), dir: -1, whole: true },
      y: { axis: new THREE.Vector3(0, 1, 0), dir: -1, whole: true },
      z: { axis: new THREE.Vector3(0, 0, 1), dir: -1, whole: true }
    };
    function parseAlgorithm(str) {
      return str.trim().split(/\s+/).map(tok => ({
        face: tok[0],
        count: tok.endsWith("2") ? 2 : 1,
        prime: tok.endsWith("'")
      }));
    }

    // 7) Animations-Engine
    function animateMove({face,count,prime}, done) {
      const m = moveMap[face];
      if (!m) { done(); return; }
      const direction = m.dir * (prime ? -1 : 1);
      const total     = Math.PI/2 * count;
      let rotated     = 0;
      const sliceCubies = m.whole ? cubies.slice() : cubies.filter(m.slice);
      const tmpGroup    = new THREE.Group();
      scene.add(tmpGroup);
      sliceCubies.forEach(c=>tmpGroup.attach(c));

      (function step() {
        const delta = Math.min(0.1, total - rotated);
        tmpGroup.rotateOnAxis(m.axis, direction * delta);
        rotated += delta;
        if (rotated < total) requestAnimationFrame(step);
        else {
          sliceCubies.forEach(c=>cubeGroup.attach(c));
          scene.remove(tmpGroup);
          done();
        }
      })();
    }
    let animating = false;
    function runSequence(seq) {
      if (!seq.length) { animating = false; return; }
      animating = true;
      animateMove(seq.shift(), ()=>runSequence(seq));
    }

    // 8) Start-Button-Handler
    button.addEventListener("click", () => {
      if (animating) return;
      runSequence(parseAlgorithm(algo));
    });

    // 9) Render-Loop & Resize
    (function render() {
      requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    })();
    window.addEventListener("resize", () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  });
});
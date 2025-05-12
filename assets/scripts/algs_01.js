// assets/scripts/algs_01.js
// Initialisiert alle .simulator-wrapper Instanzen mit eigenständiger Three.js-Simulation

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".simulator-wrapper").forEach(wrapper => {
    const container = wrapper.querySelector(".simulator");
    const input     = wrapper.querySelector(".algo");
    const startBtn  = wrapper.querySelector(".start");
    const resetBtn  = wrapper.querySelector(".reset");
    const colorStr  = container.dataset.colors.trim();
    const algo      = container.dataset.algo.trim();

    // Zugfolge anzeigen
    input.value = algo;

    // Szene & Kamera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    // Licht
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Würfel aufbauen
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    const cubies = [];
    const size = 1, gap = 0.05;
    const faceColors = { R:0xff0000, L:0xffa500, U:0xffffff, D:0xffff00, F:0x00ff00, B:0x0000ff };
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const geom = new THREE.BoxGeometry(size, size, size);
          geom.clearGroups();
          for (let i = 0; i < 6; i++) geom.addGroup(i*6, 6, i);

          const mats = Array(6).fill().map(() =>
            new THREE.MeshBasicMaterial({ color: 0x000000 })
          );
          if (Math.abs(x-1) < 0.01) mats[0].color.setHex(faceColors.R);
          if (Math.abs(x+1) < 0.01) mats[1].color.setHex(faceColors.L);
          if (Math.abs(y-1) < 0.01) mats[2].color.setHex(faceColors.U);
          if (Math.abs(y+1) < 0.01) mats[3].color.setHex(faceColors.D);
          if (Math.abs(z-1) < 0.01) mats[4].color.setHex(faceColors.F);
          if (Math.abs(z+1) < 0.01) mats[5].color.setHex(faceColors.B);

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

    // Farbstring-Applier
    const colorMap = {
      W:0xffffff, R:0xff0000, G:0x00ff00,
      B:0x0000ff, O:0xffa500, Y:0xffff00,
      X:0x888888  // Placeholder grau
    };
    function applyColorString(str) {
      if (str.length !== 54) return;
      const f = {
        U: str.slice(0,9).split(""),
        R: str.slice(9,18).split(""),
        F: str.slice(18,27).split(""),
        D: str.slice(27,36).split(""),
        L: str.slice(36,45).split(""),
        B: str.slice(45,54).split("")
      };
      const isNear = (a,b) => Math.abs(a-b) < 0.01;
      const sorted = {
        U: cubies.filter(c => isNear(c.position.y, 1.05))
                   .sort((a,b) => a.position.z - b.position.z || a.position.x - b.position.x),
        R: cubies.filter(c => isNear(c.position.x, 1.05))
                   .sort((a,b) => b.position.y - a.position.y || b.position.z - a.position.z),
        F: cubies.filter(c => isNear(c.position.z, 1.05))
                   .sort((a,b) => b.position.y - a.position.y || a.position.x - b.position.x),
        D: cubies.filter(c => isNear(c.position.y, -1.05))
                   .sort((a,b) => b.position.z - a.position.z || a.position.x - b.position.x),
        L: cubies.filter(c => isNear(c.position.x, -1.05))
                   .sort((a,b) => b.position.y - a.position.y || a.position.z - b.position.z),
        B: cubies.filter(c => isNear(c.position.z, -1.05))
                   .sort((a,b) => b.position.y - a.position.y || b.position.x - a.position.x)
      };
      sorted.U.forEach(c => c.material[2].color.setHex(colorMap[f.U.shift()]));
      sorted.R.forEach(c => c.material[0].color.setHex(colorMap[f.R.shift()]));
      sorted.F.forEach(c => c.material[4].color.setHex(colorMap[f.F.shift()]));
      sorted.D.forEach(c => c.material[3].color.setHex(colorMap[f.D.shift()]));
      sorted.L.forEach(c => c.material[1].color.setHex(colorMap[f.L.shift()]));
      sorted.B.forEach(c => c.material[5].color.setHex(colorMap[f.B.shift()]));
    }

    // Anfangszustand anwenden
    applyColorString(colorStr);

    // Ursprungs-Transforms speichern
    const initialTransforms = cubies.map(c => ({
      position: c.position.clone(),
      quaternion: c.quaternion.clone()
    }));

    // Parser & Move-Map
    const moveMap = {
      R: {axis:new THREE.Vector3(1,0,0), dir:-1, slice:c=>c.position.x>0.5},
      L: {axis:new THREE.Vector3(1,0,0), dir: 1, slice:c=>c.position.x<-0.5},
      U: {axis:new THREE.Vector3(0,1,0), dir:-1, slice:c=>c.position.y>0.5},
      D: {axis:new THREE.Vector3(0,1,0), dir: 1, slice:c=>c.position.y<-0.5},
      F: {axis:new THREE.Vector3(0,0,1), dir:-1, slice:c=>c.position.z>0.5},
      B: {axis:new THREE.Vector3(0,0,1), dir: 1, slice:c=>c.position.z<-0.5},
      M: {axis:new THREE.Vector3(1,0,0), dir: 1, slice:c=>Math.abs(c.position.x)<0.01},
      E: {axis:new THREE.Vector3(0,1,0), dir: 1, slice:c=>Math.abs(c.position.y)<0.01},
      S: {axis:new THREE.Vector3(0,0,1), dir:-1, slice:c=>Math.abs(c.position.z)<0.01},
      x: {axis:new THREE.Vector3(1,0,0), dir:-1, whole:true},
      y: {axis:new THREE.Vector3(0,1,0), dir:-1, whole:true},
      z: {axis:new THREE.Vector3(0,0,1), dir:-1, whole:true}
    };
    function parseAlgorithm(str) {
      return str.trim().split(/\s+/).map(tok => ({
        face: tok[0],
        count: tok.endsWith('2') ? 2 : 1,
        prime: tok.endsWith("'")
      }));
    }

    // Animations-Engine
    function animateMove({face, count, prime}, done) {
      const m = moveMap[face]; if(!m){ done(); return; }
      const direction = m.dir * (prime ? -1 : 1);
      const total     = Math.PI/2 * count;
      let   rotated   = 0;
      const sliceCubies = m.whole ? cubies.slice() : cubies.filter(m.slice);
      const tmpGroup    = new THREE.Group(); scene.add(tmpGroup);
      sliceCubies.forEach(c => tmpGroup.attach(c));
      (function step() {
        const delta = Math.min(0.1, total - rotated);
        tmpGroup.rotateOnAxis(m.axis, direction * delta);
        rotated += delta;
        if(rotated < total) requestAnimationFrame(step);
        else {
          sliceCubies.forEach(c => cubeGroup.attach(c));
          scene.remove(tmpGroup);
          done();
        }
      })();
    }
    let animating = false;
    function runSequence(seq) {
      if(!seq.length) { animating = false; return; }
      animating = true;
      animateMove(seq.shift(), () => runSequence(seq));
    }

    // Event-Handler
    startBtn.addEventListener("click", () => {
      if(animating) return;
      runSequence(parseAlgorithm(algo));
    });
    resetBtn.addEventListener("click", () => {
      animating = false;
      cubies.forEach((c, i) => {
        c.position.copy(initialTransforms[i].position);
        c.quaternion.copy(initialTransforms[i].quaternion);
      });
      applyColorString(colorStr);
    });

    // Render-Loop & Resize
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
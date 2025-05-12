// ======== Cube-Simulator Initialisierung =========
function initSim() {
    const container = document.getElementById("simulator");
    if (!container) {
        console.error("Simulator-Container #simulator nicht gefunden");
        return;
    }

    // Vordefinierte Parameter
    const defaultColorString = "XXXXXXWWWRXRRXRRXRGGGGGGGGGYYYXXXYYYOXOOXOOXOBXBBXBBXB";
    const defaultAlgorithm   = "F U R F' U' R' x z M R";

    // Erstes Auftragen der Farben und Anzeigen der Zugfolge
    applyColorString(defaultColorString);
    document.getElementById("algo").value = defaultAlgorithm;

    // Szene, Kamera, Renderer
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    const aspect   = container.clientWidth / container.clientHeight;
    const camera   = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(5, 5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lichter
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Würfel-Gruppe und Cubies-Array
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    const cubies = [];

    // Farben-Mapping für faces
    const colors = {
        U: 0xffffff,
        D: 0xffff00,
        F: 0x00ff00,
        B: 0x0000ff,
        R: 0xff0000,
        L: 0xffa500
    };

    // Aufbau der 27 Cubies
    const size = 1, gap = 0.05;
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const geom = new THREE.BoxGeometry(size, size, size);
                geom.clearGroups();
                for (let i = 0; i < 6; i++) geom.addGroup(i * 6, 6, i);

                const mats = [
                    new THREE.MeshBasicMaterial({ color: 0x000000 }), // R
                    new THREE.MeshBasicMaterial({ color: 0x000000 }), // L
                    new THREE.MeshBasicMaterial({ color: 0x000000 }), // U
                    new THREE.MeshBasicMaterial({ color: 0x000000 }), // D
                    new THREE.MeshBasicMaterial({ color: 0x000000 }), // F
                    new THREE.MeshBasicMaterial({ color: 0x000000 })  // B
                ];

                if (Math.abs(x - 1) < 0.01) mats[0].color.setHex(colors.R);
                if (Math.abs(x + 1) < 0.01) mats[1].color.setHex(colors.L);
                if (Math.abs(y - 1) < 0.01) mats[2].color.setHex(colors.U);
                if (Math.abs(y + 1) < 0.01) mats[3].color.setHex(colors.D);
                if (Math.abs(z - 1) < 0.01) mats[4].color.setHex(colors.F);
                if (Math.abs(z + 1) < 0.01) mats[5].color.setHex(colors.B);

                const cubie = new THREE.Mesh(geom, mats);
                cubie.position.set(x * (size + gap), y * (size + gap), z * (size + gap));
                cubeGroup.add(cubie);
                cubies.push(cubie);
            }
        }
    }

    // Move-Map für alle Face- und Slice-Moves
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

    // Parser für Zugfolgen
    function parseAlgorithm(str) {
        return str.trim().split(/\s+/).map(tok => {
            const face = tok[0];
            let count = 1, prime = false;
            if (tok.endsWith("2"))   count = 2;
            if (tok.endsWith("'"))   prime = true;
            return { face, count, prime };
        });
    }

    // Einzelne Drehung animieren
    function animateMove({ face, count, prime }, onComplete) {
        const move     = moveMap[face];
        if (!move) { onComplete(); return; }
        const { axis, dir: baseDir, slice, whole } = move;
        const direction = baseDir * (prime ? -1 : 1);
        const total     = Math.PI / 2 * count;
        let   rotated   = 0;

        const sliceCubies = whole ? cubies.slice() : cubies.filter(slice);
        const tempGroup   = new THREE.Group();
        scene.add(tempGroup);
        sliceCubies.forEach(c => tempGroup.attach(c));

        function step() {
            const delta = Math.min(0.1, total - rotated);
            tempGroup.rotateOnAxis(axis, direction * delta);
            rotated += delta;
            if (rotated < total) {
                requestAnimationFrame(step);
            } else {
                sliceCubies.forEach(c => cubeGroup.attach(c));
                scene.remove(tempGroup);
                onComplete();
            }
        }
        step();
    }

    // Sequenz von Zügen ablaufen
    let animating = false;
    function runSequence(seq) {
        if (!seq.length) { animating = false; return; }
        animating = true;
        animateMove(seq.shift(), () => runSequence(seq));
    }

    // Start-Button: liest das readonly-Input aus und startet die Animation
    document.getElementById("start").addEventListener("click", () => {
        if (animating) return;
        const moves = parseAlgorithm(document.getElementById("algo").value);
        runSequence(moves);
    });

    // Render-Loop
    (function render() {
        requestAnimationFrame(render);
        controls.update();
        renderer.render(scene, camera);
    })();

    // Auf Fenster-Größenänderung reagieren
    window.addEventListener("resize", () => {
        const w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    // Farbstring-Applier
    const colorMap = {
        W: 0xffffff, R: 0xff0000, G: 0x00ff00,
        B: 0x0000ff, O: 0xffa500, Y: 0xffff00
    };
    function applyColorString(str) {
        if (str.length !== 54) {
            alert("Der Farbstring muss genau 54 Zeichen enthalten.");
            return;
        }
        const facelets = {
            U: str.slice(0,  9).split(""),
            R: str.slice(9,  18).split(""),
            F: str.slice(18, 27).split(""),
            D: str.slice(27, 36).split(""),
            L: str.slice(36, 45).split(""),
            B: str.slice(45, 54).split("")
        };
        const is = (a, b) => Math.abs(a - b) < 0.01;
        const sorted = {
            U: cubies.filter(c => is(c.position.y,  1.05))
                      .sort((a,b) => a.position.z - b.position.z || a.position.x - b.position.x),
            R: cubies.filter(c => is(c.position.x,  1.05))
                      .sort((a,b) => b.position.y - a.position.y || b.position.z - a.position.z),
            F: cubies.filter(c => is(c.position.z,  1.05))
                      .sort((a,b) => b.position.y - a.position.y || a.position.x - b.position.x),
            D: cubies.filter(c => is(c.position.y, -1.05))
                      .sort((a,b) => b.position.z - a.position.z || a.position.x - b.position.x),
            L: cubies.filter(c => is(c.position.x, -1.05))
                      .sort((a,b) => b.position.y - a.position.y || a.position.z - b.position.z),
            B: cubies.filter(c => is(c.position.z, -1.05))
                      .sort((a,b) => b.position.y - a.position.y || b.position.x - a.position.x)
        };
        sorted.U.forEach(c => c.material[2].color.setHex(colorMap[facelets.U.shift()]));
        sorted.R.forEach(c => c.material[0].color.setHex(colorMap[facelets.R.shift()]));
        sorted.F.forEach(c => c.material[4].color.setHex(colorMap[facelets.F.shift()]));
        sorted.D.forEach(c => c.material[3].color.setHex(colorMap[facelets.D.shift()]));
        sorted.L.forEach(c => c.material[1].color.setHex(colorMap[facelets.L.shift()]));
        sorted.B.forEach(c => c.material[5].color.setHex(colorMap[facelets.B.shift()]));
    }

    // Exporte (falls nötig)
    window.cubies           = cubies;
    window.applyColorString = applyColorString;
}

// Sofort ausführen, falls DOM schon ready, sonst Listener setzen
if (document.readyState !== "loading") {
    initSim();
} else {
    document.addEventListener("DOMContentLoaded", initSim);
}
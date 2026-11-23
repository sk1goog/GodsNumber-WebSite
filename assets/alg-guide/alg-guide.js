/*!
 * AlgGuide – datengetriebene, schrittweise Algorithmus-Erklärungen für den 3×3-Würfel.
 *
 * Aufbau:
 *   1. Notation      – Züge parsen, invertieren, beschreiben
 *   2. CubeModel     – exaktes Würfelmodell (ganzzahlige Positionen + Rotationsmatrizen)
 *   3. Masken        – welche Sticker sind Fokus / Kontext / ausgeblendet
 *   4. CubeView      – Three.js-Darstellung (ein gemeinsamer WebGL-Renderer für alle Würfel)
 *   5. CasePlayer    – Schritt-für-Schritt-Steuerung eines Falls
 *   6. Seite         – Sektionen, Navigation, Notations-Trainer, Spickzettel
 *
 * Inhalte kommen ausschließlich aus Daten-Dateien (z. B. data/lbl.js), siehe ANLEITUNG.md.
 * Benötigt THREE (r147, klassischer Build) und THREE.OrbitControls.
 */
(function (global) {
  "use strict";

  /* ======================================================================
   * 1. Notation
   * ==================================================================== */

  // axis: 0=x, 1=y, 2=z · layers: betroffene Ebenen-Koordinaten · dir: +1 = gegen den
  // Uhrzeigersinn um die positive Achse (Rechte-Hand-Regel) bei einem Grundzug.
  const MOVE_DEFS = {
    R: { axis: 0, layers: [1], dir: -1 },  L: { axis: 0, layers: [-1], dir: 1 },
    U: { axis: 1, layers: [1], dir: -1 },  D: { axis: 1, layers: [-1], dir: 1 },
    F: { axis: 2, layers: [1], dir: -1 },  B: { axis: 2, layers: [-1], dir: 1 },
    M: { axis: 0, layers: [0], dir: 1 },   E: { axis: 1, layers: [0], dir: 1 },
    S: { axis: 2, layers: [0], dir: -1 },
    r: { axis: 0, layers: [0, 1], dir: -1 },  l: { axis: 0, layers: [-1, 0], dir: 1 },
    u: { axis: 1, layers: [0, 1], dir: -1 },  d: { axis: 1, layers: [-1, 0], dir: 1 },
    f: { axis: 2, layers: [0, 1], dir: -1 },  b: { axis: 2, layers: [-1, 0], dir: 1 },
    x: { axis: 0, layers: [-1, 0, 1], dir: -1 },
    y: { axis: 1, layers: [-1, 0, 1], dir: -1 },
    z: { axis: 2, layers: [-1, 0, 1], dir: -1 },
  };

  const MOVE_NAMES = {
    R: "rechte Seite", L: "linke Seite", U: "obere Seite", D: "untere Seite",
    F: "vordere Seite", B: "hintere Seite",
    M: "mittlere Scheibe zwischen L und R (dreht wie L)",
    E: "mittlere Scheibe zwischen U und D (dreht wie D)",
    S: "mittlere Scheibe zwischen F und B (dreht wie F)",
    r: "rechte Seite plus Mittelscheibe", l: "linke Seite plus Mittelscheibe",
    u: "obere Seite plus Mittelscheibe", d: "untere Seite plus Mittelscheibe",
    f: "vordere Seite plus Mittelscheibe", b: "hintere Seite plus Mittelscheibe",
    x: "ganzer Würfel (kippt wie R)", y: "ganzer Würfel (dreht wie U)",
    z: "ganzer Würfel (kippt wie F)",
  };

  const TOKEN_RE = /^([URFDLBMESxyzurfdlb])(w?)(\d?)('?)(\d?)$/;

  function parseMove(token) {
    const m = TOKEN_RE.exec(token);
    if (!m) throw new Error("AlgGuide: unbekannter Zug '" + token + "'");
    let base = m[1];
    if (m[2]) base = base.toLowerCase(); // Rw == r
    const def = MOVE_DEFS[base];
    if (!def) throw new Error("AlgGuide: unbekannter Zug '" + token + "'");
    let count = parseInt(m[3] || m[5] || "1", 10) % 4;
    const prime = m[4] === "'";
    if (count === 0) count = 4;
    // Vierteldrehungen, auf -1, 1, 2 (bzw. -2) normalisiert
    let q = def.dir * (prime ? -1 : 1) * count;
    q = ((q % 4) + 4) % 4;
    if (q === 3) q = -1;
    if (q === 2) q = def.dir * (prime ? -1 : 1) > 0 ? 2 : -2;
    // relativ zum Grundzug: 1 = wie notiert, -1 = Strich, 2 = halbe Drehung
    const turns = Math.abs(q) === 2 ? 2 : q === def.dir ? 1 : -1;
    return {
      base, axis: def.axis, layers: def.layers, q,
      label: base + (turns === 2 ? "2" : turns === -1 ? "'" : ""),
      turns,
    };
  }

  function parseAlg(str) {
    if (!str) return [];
    return String(str)
      .replace(/[’´`]/g, "'")
      .replace(/[()\[\],]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(parseMove);
  }

  function invertMove(mv) {
    const inv = Object.assign({}, mv, { q: -mv.q });
    inv.turns = mv.turns === 2 ? 2 : -mv.turns;
    inv.label = mv.base + (inv.turns === 2 ? "2" : inv.turns === -1 ? "'" : "");
    return inv;
  }

  function invertAlg(moves) {
    return moves.slice().reverse().map(invertMove);
  }

  function describeMove(mv) {
    const what = MOVE_NAMES[mv.base] || mv.base;
    const how = mv.turns === 2 ? "halbe Drehung (180°)"
      : mv.turns === 1 ? "im Uhrzeigersinn" : "gegen den Uhrzeigersinn";
    const hint = mv.turns === 2 ? "" : " – mit Blick direkt auf diese Seite";
    return { what: what.charAt(0).toUpperCase() + what.slice(1), how: how + hint };
  }

  /* ======================================================================
   * 2. CubeModel
   * ==================================================================== */

  const FACE_NORMALS = {
    U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1],
  };
  const COLOR_VECTORS = { // Standard-Farbschema: Weiß oben, Grün vorne, Rot rechts
    W: [0, 1, 0], Y: [0, -1, 0], G: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], O: [-1, 0, 0],
  };
  const COLOR_NAMES = { W: "Weiß", Y: "Gelb", G: "Grün", B: "Blau", R: "Rot", O: "Orange" };

  const vecEq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const neg = (a) => [-a[0], -a[1], -a[2]];

  /** Liefert Farbe je Seite, z. B. {U:'W', F:'G'} -> {U:'W',D:'Y',F:'G',B:'B',R:'R',L:'O'} */
  function resolveScheme(orientation) {
    const u = (orientation && orientation.U) || "W";
    const f = (orientation && orientation.F) || "G";
    const vu = COLOR_VECTORS[u], vf = COLOR_VECTORS[f];
    if (!vu || !vf || vecEq(vu, vf) || vecEq(vu, neg(vf))) {
      throw new Error("AlgGuide: ungültige Orientierung " + JSON.stringify(orientation));
    }
    const vr = cross(vu, vf); // U × F = R  (y × z = x)
    const find = (v) => Object.keys(COLOR_VECTORS).find((k) => vecEq(COLOR_VECTORS[k], v));
    return { U: u, D: find(neg(vu)), F: f, B: find(neg(vf)), R: find(vr), L: find(neg(vr)) };
  }

  // 90° gegen den Uhrzeigersinn um x / y / z
  const ROT90 = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  function matMul(a, b) {
    const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    return r;
  }
  function matVec(m, v) {
    return [
      m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
      m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
      m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ];
  }
  function rotMatrix(axis, q) {
    let r = IDENTITY;
    const n = ((q % 4) + 4) % 4;
    for (let i = 0; i < n; i++) r = matMul(ROT90[axis], r);
    return r;
  }

  function faceNameOf(pos) {
    let n = "";
    if (pos[1] === 1) n += "U"; if (pos[1] === -1) n += "D";
    if (pos[2] === 1) n += "F"; if (pos[2] === -1) n += "B";
    if (pos[0] === 1) n += "R"; if (pos[0] === -1) n += "L";
    return n;
  }

  class CubeModel {
    constructor(scheme) {
      this.cubies = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            if (!x && !y && !z) continue;
            const home = [x, y, z];
            const stickers = [];
            for (const face in FACE_NORMALS) {
              const n = FACE_NORMALS[face];
              const onFace = n.every((c, i) => c === 0 || c === home[i]);
              if (onFace) stickers.push({ normal: n, face, color: scheme[face], role: "hidden" });
            }
            this.cubies.push({
              home, name: faceNameOf(home), pos: home.slice(), rot: IDENTITY, stickers,
              type: stickers.length === 1 ? "center" : stickers.length === 2 ? "edge" : "corner",
            });
          }
    }
    affected(mv) {
      return this.cubies.filter((c) => mv.layers.indexOf(c.pos[mv.axis]) !== -1);
    }
    apply(mv) {
      const r = rotMatrix(mv.axis, mv.q);
      for (const c of this.affected(mv)) {
        c.pos = matVec(r, c.pos);
        c.rot = matMul(r, c.rot);
      }
    }
    applyAll(moves) { moves.forEach((m) => this.apply(m)); }
  }

  /* ======================================================================
   * 3. Masken (Fokus-Regeln)
   *
   * Eine Regel: [rolle, "selektor selektor …", "Farbfilter"?]
   *   rolle:     focus | context | hidden
   *   selektor:  all · centers · edges · corners · layer:U · edges:U · corners:U ·
   *              center:U · Steinname wie UFR / FL (Reihenfolge egal)
   *              Ebenen U D F B R L und Mittelscheiben M (x=0) · E (y=0) · S (z=0)
   *   Farbfilter: z. B. "Y" – nur Sticker dieser Farbe(n) bekommen die Rolle.
   * Selektoren beziehen sich auf die Heimatposition eines Steins im gelösten Würfel.
   * ==================================================================== */

  const LAYER_TEST = {
    U: (h) => h[1] === 1, D: (h) => h[1] === -1, F: (h) => h[2] === 1, B: (h) => h[2] === -1,
    R: (h) => h[0] === 1, L: (h) => h[0] === -1,
    M: (h) => h[0] === 0, E: (h) => h[1] === 0, S: (h) => h[2] === 0,
  };
  const TYPE_ALIASES = { centers: "center", center: "center", edges: "edge", edge: "edge", corners: "corner", corner: "corner" };

  function normPiece(n) { return n.toUpperCase().split("").sort().join(""); }

  function selectorMatches(sel, cubie) {
    if (sel === "all") return true;
    if (TYPE_ALIASES[sel]) return cubie.type === TYPE_ALIASES[sel];
    const parts = sel.split(":");
    if (parts.length === 2) {
      const test = LAYER_TEST[parts[1]];
      if (!test) throw new Error("AlgGuide: unbekannte Ebene in '" + sel + "'");
      if (parts[0] === "layer") return test(cubie.home);
      const t = TYPE_ALIASES[parts[0]];
      if (!t) throw new Error("AlgGuide: unbekannter Selektor '" + sel + "'");
      return cubie.type === t && test(cubie.home);
    }
    return normPiece(sel) === normPiece(cubie.name);
  }

  function applyMask(model, rules) {
    for (const rule of rules || []) {
      const [role, selectors, colorFilter] = rule;
      const sels = String(selectors).trim().split(/\s+/);
      for (const c of model.cubies) {
        if (!sels.some((s) => selectorMatches(s, c))) continue;
        for (const st of c.stickers) {
          if (!colorFilter || colorFilter.indexOf(st.color) !== -1) st.role = role;
        }
      }
    }
  }

  /* ======================================================================
   * 4. CubeView (Three.js)
   * ==================================================================== */

  const PALETTE = {
    W: 0xf4f4ef, Y: 0xffd21f, R: 0xc8102e, O: 0xff6a13, G: 0x00a651, B: 0x0a5fd6,
  };
  const HIDDEN_COLOR = 0x6c727c;
  const ARROW_COLOR = 0xe6007e;

  let sharedRenderer = null;
  function getRenderer() {
    if (!sharedRenderer) {
      sharedRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      sharedRenderer.setPixelRatio(1);
      sharedRenderer.setClearColor(0x000000, 0);
    }
    return sharedRenderer;
  }

  const geoCache = {};
  function stickerGeometry() {
    if (geoCache.sticker) return geoCache.sticker;
    const s = 0.42, r = 0.1, sh = new THREE.Shape();
    sh.moveTo(-s + r, -s); sh.lineTo(s - r, -s); sh.quadraticCurveTo(s, -s, s, -s + r);
    sh.lineTo(s, s - r); sh.quadraticCurveTo(s, s, s - r, s); sh.lineTo(-s + r, s);
    sh.quadraticCurveTo(-s, s, -s, s - r); sh.lineTo(-s, -s + r); sh.quadraticCurveTo(-s, -s, -s + r, -s);
    geoCache.sticker = new THREE.ShapeGeometry(sh, 5);
    return geoCache.sticker;
  }
  function bodyGeometry() {
    return geoCache.body || (geoCache.body = new THREE.BoxGeometry(0.97, 0.97, 0.97));
  }

  const matCache = {};
  // Zwei Darstellungen: farbig (focus und context sehen gleich aus) oder grau (hidden).
  function stickerMaterial(color, role) {
    const hidden = role === "hidden";
    const key = hidden ? "hidden" : color;
    if (matCache[key]) return matCache[key];
    const c = new THREE.Color(hidden ? HIDDEN_COLOR : PALETTE[color]);
    const mat = new THREE.MeshStandardMaterial({
      color: c, roughness: hidden ? 0.55 : 0.35, metalness: 0,
      emissive: hidden ? new THREE.Color(0) : c.clone().multiplyScalar(0.12),
    });
    return (matCache[key] = mat);
  }
  function bodyMaterial() {
    return matCache.body || (matCache.body = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.7 }));
  }
  function arrowMaterial() {
    return matCache.arrow || (matCache.arrow = new THREE.MeshBasicMaterial({ color: ARROW_COLOR }));
  }

  const AXIS_VECTORS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  class CubeView {
    /**
     * @param {HTMLElement} host   – Container, bekommt ein <canvas>
     * @param {object} opts        – { scheme, mask, cameraPosition }
     */
    constructor(host, opts) {
      this.host = host;
      this.opts = opts;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "ag-canvas";
      host.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      this.defaultCam = new THREE.Vector3().fromArray(opts.cameraPosition || [5.4, 4.6, 7.2]);
      this.camera.position.copy(this.defaultCam);
      this.camera.lookAt(0, 0, 0);

      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x50555e, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 0.75);
      key.position.set(4, 9, 6);
      this.scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.25);
      fill.position.set(-6, -2, -4);
      this.scene.add(fill);

      this.root = new THREE.Group();
      this.scene.add(this.root);
      this.pivot = new THREE.Group();
      this.root.add(this.pivot);
      this.arrow = null;
      this.anim = null;
      this.dirty = true;

      this.controls = new THREE.OrbitControls(this.camera, this.canvas);
      this.controls.enableZoom = false;
      this.controls.enablePan = false;
      this.controls.rotateSpeed = 0.8;
      this.controls.addEventListener("change", () => this.requestRender());
      this.controls.addEventListener("end", () => this.refreshArrow());
      // vertikales Scrollen auf Touch-Geräten erlauben, horizontales Wischen dreht
      this.canvas.style.touchAction = "pan-y";

      this.model = null;
      this.build([]);

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
      this.resize();
    }

    /** Würfel neu aufbauen: gelöst -> Setup-Züge sofort anwenden */
    build(setupMoves) {
      if (this.model) this.model.cubies.forEach((c) => c.mesh && this.root.remove(c.mesh));
      const model = new CubeModel(this.opts.scheme);
      applyMask(model, this.opts.mask);
      for (const c of model.cubies) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(bodyGeometry(), bodyMaterial()));
        for (const st of c.stickers) {
          const m = new THREE.Mesh(stickerGeometry(), stickerMaterial(st.color, st.role));
          const n = new THREE.Vector3().fromArray(st.normal);
          m.position.copy(n).multiplyScalar(0.487);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
          g.add(m);
        }
        c.mesh = g;
        this.root.add(g);
      }
      this.model = model;
      model.applyAll(setupMoves);
      this.syncAll();
    }

    syncCubie(c) {
      const m = c.rot, e = new THREE.Matrix4();
      e.set(m[0][0], m[0][1], m[0][2], 0, m[1][0], m[1][1], m[1][2], 0, m[2][0], m[2][1], m[2][2], 0, 0, 0, 0, 1);
      c.mesh.quaternion.setFromRotationMatrix(e);
      c.mesh.position.set(c.pos[0], c.pos[1], c.pos[2]);
    }
    syncAll() {
      this.model.cubies.forEach((c) => this.syncCubie(c));
      this.requestRender();
    }

    applyInstant(mv) {
      this.model.apply(mv);
      this.model.affected(mv).forEach((c) => this.syncCubie(c));
      this.requestRender();
    }

    /** Animierter Zug, Promise wird nach Abschluss erfüllt */
    animate(mv, duration) {
      this.finishAnimation();
      this.setArrow(null);
      const cubies = this.model.affected(mv);
      this.pivot.rotation.set(0, 0, 0);
      this.pivot.updateMatrixWorld();
      cubies.forEach((c) => this.pivot.attach(c.mesh));
      return new Promise((resolve) => {
        this.anim = {
          mv, cubies, resolve, start: performance.now(),
          duration: duration * (Math.abs(mv.q) === 2 ? 1.45 : 1),
          angle: (mv.q * Math.PI) / 2,
        };
        this.requestRender();
      });
    }

    finishAnimation() {
      const a = this.anim;
      if (!a) return;
      this.anim = null;
      a.cubies.forEach((c) => this.root.attach(c.mesh));
      this.pivot.rotation.set(0, 0, 0);
      this.model.apply(a.mv);
      a.cubies.forEach((c) => this.syncCubie(c));
      this.requestRender();
      a.resolve();
    }

    stepAnimation(now) {
      const a = this.anim;
      if (!a) return;
      const t = Math.min(1, (now - a.start) / a.duration);
      this.pivot.rotation.set(0, 0, 0);
      this.pivot.rotateOnAxis(AXIS_VECTORS[a.mv.axis], a.angle * easeInOut(t));
      if (t >= 1) this.finishAnimation();
      else this.requestRender();
    }

    /** Drehpfeil für den nächsten Zug (oder null) */
    setArrow(mv) {
      this.arrowMove = mv;
      if (this.arrow) {
        this.root.remove(this.arrow);
        this.arrow.traverse((o) => o.geometry && o.geometry.dispose());
        this.arrow = null;
      }
      if (mv) {
        this.arrow = buildArrow(mv, this.camera.position);
        this.root.add(this.arrow);
      }
      this.requestRender();
    }
    refreshArrow() {
      if (this.arrowMove && !this.anim) this.setArrow(this.arrowMove);
    }

    resetCamera() {
      this.camera.position.copy(this.defaultCam);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      this.refreshArrow();
      this.requestRender();
    }

    resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.camera.aspect = w / h;
      // auf schmalen Formaten etwas weiter weg, damit Pfeile nicht abgeschnitten werden
      this.camera.zoom = Math.min(1, (w / h) * 1.05);
      this.camera.updateProjectionMatrix();
      this.requestRender();
    }

    requestRender() {
      this.dirty = true;
      scheduleFrame();
    }

    draw(now) {
      if (this.anim) this.stepAnimation(now);
      if (!this.dirty) return;
      this.dirty = false;
      const r = getRenderer();
      const w = this.canvas.width, h = this.canvas.height;
      const size = r.getSize(new THREE.Vector2());
      if (size.x !== w || size.y !== h) r.setSize(w, h, false);
      r.render(this.scene, this.camera);
      this.ctx.clearRect(0, 0, w, h);
      this.ctx.drawImage(r.domElement, 0, 0);
      if (this.anim) this.dirty = true;
    }
  }

  // Alle Ansichten teilen sich eine Render-Schleife, die nur läuft, wenn sich etwas ändert.
  const views = new Set();
  let frameScheduled = false;
  function scheduleFrame() {
    if (frameScheduled) return;
    frameScheduled = true;
    requestAnimationFrame((now) => {
      frameScheduled = false;
      views.forEach((v) => v.visible !== false && v.draw(now));
    });
  }

  function buildArrow(mv, camPos) {
    const g = new THREE.Group();
    const axis = AXIS_VECTORS[mv.axis].clone();
    const outer = mv.layers.length === 1 && mv.layers[0] !== 0;
    const half = Math.abs(mv.q) === 2;
    const sign = mv.q > 0 ? 1 : -1;
    const mean = mv.layers.reduce((a, b) => a + b, 0) / mv.layers.length;

    // Seitenfläche sichtbar? Dann Pfeil direkt auf die Fläche, sonst als Gürtel um die Ebene.
    const normal = axis.clone().multiplyScalar(outer ? mv.layers[0] : 0);
    const camDir = camPos.clone().normalize();
    const faceVisible = outer && normal.dot(camDir) > 0.25;

    const radius = faceVisible ? 0.95 : 2.0;
    const arc = faceVisible ? (half ? Math.PI * 1.45 : Math.PI * 0.85) : (half ? Math.PI * 1.1 : Math.PI * 0.6);
    const tube = faceVisible ? 0.065 : 0.07;
    const mat = arrowMaterial();

    const holder = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 64, arc), mat);
    holder.add(torus);
    const addHead = (angle) => {
      const head = new THREE.Mesh(new THREE.ConeGeometry(tube * 2.6, tube * 6, 18), mat);
      head.position.set(radius * Math.cos(angle), radius * Math.sin(angle), 0);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0));
      holder.add(head);
    };
    addHead(arc);
    if (half) addHead(arc / 2);

    // Bogen so drehen, dass seine Mitte zur Kamera zeigt
    const zTarget = axis.clone().multiplyScalar(sign);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), zTarget);
    g.add(holder);
    const localCam = camDir.clone().applyQuaternion(g.quaternion.clone().invert());
    const camAngle = Math.atan2(localCam.y, localCam.x);
    holder.rotation.z = camAngle - arc / 2;

    const offset = faceVisible ? mv.layers[0] * 1.56 : mean;
    g.position.copy(axis.clone().multiplyScalar(offset));
    return g;
  }

  /* ======================================================================
   * 5. CasePlayer – ein Fall mit Phasen und Zügen
   * ==================================================================== */

  const SPEEDS = [
    { label: "0,5×", ms: 760 }, { label: "1×", ms: 420 }, { label: "2×", ms: 220 },
  ];
  let speedIndex = 1;
  const speedListeners = new Set();

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function chipHtml(label) {
    return label.replace("'", "&prime;");
  }
  function colorDot(c) {
    return '<span class="ag-dot ag-c-' + c + '"></span>' + COLOR_NAMES[c];
  }

  class CasePlayer {
    constructor(container, caseDef, section, numberLabel) {
      this.def = caseDef;
      this.section = section;
      this.orientation = caseDef.orientation || section.orientation || { U: "W", F: "G" };
      this.scheme = resolveScheme(this.orientation);
      this.mask = []
        .concat(section.mask || [])
        .concat(caseDef.mask || [])
        .concat(caseDef.focus ? [["focus", caseDef.focus, caseDef.focusColors]] : []);

      // Phasen -> flache Zugliste
      this.phases = (caseDef.phases || []).map((p, i) => ({
        title: p.title || "Schritt " + (i + 1), text: p.text || "", moves: parseAlg(p.moves),
      }));
      this.moves = [];
      this.phases.forEach((p, pi) => p.moves.forEach((mv) => this.moves.push({ mv, phase: pi })));
      const allMoves = this.moves.map((m) => m.mv);
      this.setup = caseDef.setup != null ? parseAlg(caseDef.setup) : invertAlg(allMoves);
      this.index = 0;     // Anzahl ausgeführter Züge
      this.target = 0;    // dorthin soll animiert werden
      this.pending = 0;   // Richtung des gerade animierten Zugs (+1 / -1)
      this.gen = 0;       // erhöht sich bei jedem Sprung, beendet alte Abläufe
      this.running = false;
      this.playing = false;

      this.render(container, numberLabel);
    }

    render(container, numberLabel) {
      const d = this.def;
      const card = el("article", "ag-case");
      card.id = d.id;
      card.tabIndex = 0;
      card.setAttribute("aria-label", d.title);

      const head = el("header", "ag-case-head");
      head.appendChild(el("span", "ag-case-num", numberLabel));
      const ht = el("div", "ag-case-titles");
      ht.appendChild(el("h4", "ag-case-title", d.title));
      const algLine = el("div", "ag-case-alg");
      this.moves.forEach((m) => algLine.appendChild(el("span", "ag-mini", chipHtml(m.mv.label))));
      ht.appendChild(algLine);
      head.appendChild(ht);
      head.appendChild(el("div", "ag-orient",
        '<span title="So hältst du den Würfel">Oben ' + colorDot(this.orientation.U) +
        '</span><span>Vorne ' + colorDot(this.orientation.F) + "</span>"));
      card.appendChild(head);

      const body = el("div", "ag-case-body");
      // Bühne
      const stage = el("div", "ag-stage");
      this.viewHost = el("div", "ag-view");
      stage.appendChild(this.viewHost);
      this.bigMove = el("div", "ag-bigmove");
      stage.appendChild(this.bigMove);
      const camBtn = el("button", "ag-icon-btn ag-cam-reset", "⟲");
      camBtn.type = "button";
      camBtn.title = "Ansicht zurücksetzen";
      camBtn.setAttribute("aria-label", "Ansicht zurücksetzen");
      camBtn.addEventListener("click", () => this.view && this.view.resetCamera());
      stage.appendChild(camBtn);
      stage.appendChild(el("div", "ag-drag-hint", "Ziehen zum Drehen"));
      body.appendChild(stage);

      // Erklärspalte
      const side = el("div", "ag-side");
      if (d.situation) side.appendChild(el("p", "ag-situation", "<strong>Ausgangslage</strong>" + d.situation));
      this.phaseList = el("ol", "ag-phases");
      this.phaseEls = this.phases.map((p, pi) => {
        const li = el("li", "ag-phase");
        const top = el("button", "ag-phase-head");
        top.type = "button";
        top.innerHTML = '<span class="ag-phase-n">' + (pi + 1) + '</span><span class="ag-phase-title">' + p.title + "</span>";
        top.addEventListener("click", () => this.goTo(this.firstIndexOfPhase(pi), true));
        li.appendChild(top);
        const chips = el("div", "ag-chips");
        li.chips = [];
        this.moves.forEach((m, mi) => {
          if (m.phase !== pi) return;
          const b = el("button", "ag-chip", chipHtml(m.mv.label));
          b.type = "button";
          b.title = describeMove(m.mv).what + ", " + describeMove(m.mv).how;
          b.addEventListener("click", () => this.goTo(mi + 1, true));
          chips.appendChild(b);
          li.chips.push({ el: b, index: mi });
        });
        li.appendChild(chips);
        if (p.text) li.appendChild(el("p", "ag-phase-text", p.text));
        this.phaseList.appendChild(li);
        return li;
      });
      side.appendChild(this.phaseList);
      this.nowBox = el("div", "ag-now");
      side.appendChild(this.nowBox);
      if (d.tip) side.appendChild(el("p", "ag-tip", "<strong>Tipp</strong>" + d.tip));
      body.appendChild(side);
      card.appendChild(body);

      // Steuerung
      const ctr = el("div", "ag-controls");
      const btn = (icon, label, fn, cls) => {
        const b = el("button", "ag-btn" + (cls ? " " + cls : ""), icon);
        b.type = "button";
        b.title = label;
        b.setAttribute("aria-label", label);
        b.addEventListener("click", fn);
        ctr.appendChild(b);
        return b;
      };
      this.btnStart = btn(ICONS.first, "Zum Anfang (Pos1)", () => this.goTo(0, false));
      this.btnPrev = btn(ICONS.prev, "Einen Zug zurück (←)", () => this.step(-1));
      this.btnPlay = btn(ICONS.play, "Abspielen / Pause (Leertaste)", () => this.togglePlay(), "ag-btn-play");
      this.btnNext = btn(ICONS.next, "Nächster Zug (→)", () => this.step(1));
      this.btnPhase = btn(ICONS.phase, "Nächsten Teilschritt abspielen", () => this.playPhase(), "ag-btn-phase");

      this.track = el("div", "ag-track");
      this.trackFill = el("div", "ag-track-fill");
      this.track.appendChild(this.trackFill);
      this.ticks = this.moves.map((m, i) => {
        const t = el("button", "ag-tick" + (i > 0 && this.moves[i - 1].phase !== m.phase ? " ag-tick-phase" : ""));
        t.type = "button";
        t.style.left = ((i + 1) / this.moves.length) * 100 + "%";
        t.title = (i + 1) + ". " + m.mv.label;
        t.addEventListener("click", () => this.goTo(i + 1, false));
        this.track.appendChild(t);
        return t;
      });
      ctr.appendChild(this.track);
      this.counter = el("span", "ag-counter");
      ctr.appendChild(this.counter);
      this.speedBtn = el("button", "ag-btn ag-speed", SPEEDS[speedIndex].label);
      this.speedBtn.type = "button";
      this.speedBtn.title = "Geschwindigkeit";
      this.speedBtn.addEventListener("click", () => {
        speedIndex = (speedIndex + 1) % SPEEDS.length;
        speedListeners.forEach((f) => f());
      });
      speedListeners.add(() => (this.speedBtn.textContent = SPEEDS[speedIndex].label));
      ctr.appendChild(this.speedBtn);
      card.appendChild(ctr);

      this.doneBox = el("div", "ag-done", "<strong>Geschafft.</strong> " + (d.done || "Der Fall ist gelöst."));
      card.appendChild(this.doneBox);

      card.addEventListener("keydown", (e) => {
        if (e.target.closest && e.target.closest("button") && e.key === " ") return;
        if (e.key === "ArrowRight") { e.preventDefault(); this.step(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); this.step(-1); }
        else if (e.key === " ") { e.preventDefault(); this.togglePlay(); }
        else if (e.key === "Home") { e.preventDefault(); this.goTo(0, false); }
        else if (e.key === "End") { e.preventDefault(); this.goTo(this.moves.length, false); }
      });

      container.appendChild(card);
      this.card = card;
      this.updateUi();
      lazyInit(this);
    }

    initView() {
      if (this.view) return;
      this.view = new CubeView(this.viewHost, {
        scheme: this.scheme, mask: this.mask, cameraPosition: this.def.camera || this.section.camera,
      });
      views.add(this.view);
      this.view.build(this.setup);
      this.applyIndexInstant(this.index);
      this.updateUi();
    }

    firstIndexOfPhase(pi) {
      return this.moves.findIndex((m) => m.phase === pi);
    }

    /** Ziel setzen; animate=false springt sofort */
    goTo(target, animate) {
      target = Math.max(0, Math.min(this.moves.length, target));
      this.initView();
      if (!animate || Math.abs(target - this.index) > 6) {
        // laufende Abfolge abbrechen, angefangenen Zug sauber abschließen
        this.gen++;
        if (this.view.anim) { this.view.finishAnimation(); this.index += this.pending; }
        this.pending = 0;
        this.running = false;
        this.playing = false;
        this.target = target;
        this.applyIndexInstant(target);
        this.updateUi();
        return;
      }
      this.target = target;
      this.run();
    }

    step(delta) {
      this.stopPlay();
      const base = this.running ? this.target : this.index;
      this.goTo(base + delta, true);
    }

    playPhase() {
      this.stopPlay();
      if (this.index >= this.moves.length) this.goTo(0, false);
      const ph = this.index < this.moves.length ? this.moves[this.index].phase : 0;
      let end = this.index;
      while (end < this.moves.length && this.moves[end].phase === ph) end++;
      this.goTo(end, true);
    }

    togglePlay() {
      if (this.playing) { this.stopPlay(); return; }
      this.initView();
      if (this.index >= this.moves.length) this.goTo(0, false);
      this.playing = true;
      this.target = this.moves.length;
      this.run();
    }
    /** Abspielen anhalten: der gerade laufende Zug wird noch zu Ende gedreht */
    stopPlay() {
      if (!this.playing) return;
      this.playing = false;
      this.target = Math.min(this.moves.length, this.index + (this.pending > 0 ? 1 : 0));
      this.updateUi();
    }

    applyIndexInstant(target) {
      // vom aktuellen Index zum Ziel ohne Animation
      while (this.index < target) { this.view.applyInstant(this.moves[this.index].mv); this.index++; }
      while (this.index > target) { this.index--; this.view.applyInstant(invertMove(this.moves[this.index].mv)); }
    }

    async run() {
      if (this.running) return;
      this.running = true;
      const gen = this.gen;
      this.updateUi();
      while (this.index !== this.target) {
        const forward = this.target > this.index;
        const entry = forward ? this.moves[this.index] : this.moves[this.index - 1];
        const mv = forward ? entry.mv : invertMove(entry.mv);
        this.pending = forward ? 1 : -1;
        await this.view.animate(mv, SPEEDS[speedIndex].ms);
        if (gen !== this.gen) return; // inzwischen gesprungen – goTo hat übernommen
        this.index += this.pending;
        this.pending = 0;
        this.updateUi();
        // kurze Pause – länger beim Wechsel des Teilschritts, damit man mitdenken kann
        if (this.index !== this.target) {
          const phaseChange = forward && this.index < this.moves.length && this.moves[this.index].phase !== entry.phase;
          await wait(phaseChange && this.playing ? 700 : 90);
          if (gen !== this.gen) return;
        }
      }
      this.running = false;
      this.playing = false;
      this.updateUi();
    }

    updateUi() {
      const n = this.moves.length, i = this.index;
      const done = i >= n;
      const cur = done ? null : this.moves[i];
      const activePhase = cur ? cur.phase : this.phases.length - 1;

      this.phaseEls.forEach((li, pi) => {
        li.classList.toggle("is-active", !done && pi === activePhase);
        li.classList.toggle("is-done", done || pi < activePhase);
        li.chips.forEach((c) => {
          c.el.classList.toggle("is-done", c.index < i);
          c.el.classList.toggle("is-next", c.index === i);
        });
      });

      if (cur) {
        const desc = describeMove(cur.mv);
        this.nowBox.innerHTML =
          '<span class="ag-now-label">' + (i === 0 ? "Erster Zug" : "Nächster Zug") + "</span>" +
          '<span class="ag-now-move">' + chipHtml(cur.mv.label) + "</span>" +
          '<span class="ag-now-text"><strong>' + desc.what + "</strong> " + desc.how + "</span>";
        this.bigMove.innerHTML = chipHtml(cur.mv.label);
        this.bigMove.classList.remove("is-done");
      } else {
        this.nowBox.innerHTML = '<span class="ag-now-label">Fertig</span><span class="ag-now-text">Alle ' + n + " Züge ausgeführt. „Zum Anfang“ oder Pos1 startet von vorn.</span>";
        this.bigMove.innerHTML = "✓";
        this.bigMove.classList.add("is-done");
      }
      this.card.classList.toggle("is-finished", done);
      this.trackFill.style.width = (n ? (i / n) * 100 : 0) + "%";
      this.ticks.forEach((t, ti) => t.classList.toggle("is-done", ti < i));
      this.counter.textContent = i + " / " + n;
      this.btnPlay.innerHTML = this.playing ? ICONS.pause : ICONS.play;
      this.btnPrev.disabled = i === 0 && !this.running;
      this.btnStart.disabled = i === 0 && !this.running;
      this.btnNext.disabled = done && !this.running;
      if (this.view) this.view.setArrow(this.running || !cur ? null : cur.mv);
    }
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const ICONS = {
    first: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M18 5v14L7 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M6 5v14l11-7z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    phase: '<svg viewBox="0 0 24 24"><path d="M4 5v14l8-7zM12 5v14l8-7z"/></svg>',
  };

  // Würfel erst bauen, wenn sie in die Nähe des Viewports kommen; außerhalb nicht rendern.
  let lazyObserver = null;
  function lazyInit(player) {
    if (!("IntersectionObserver" in global)) { player.initView(); return; }
    if (!lazyObserver) {
      lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const p = e.target.__agPlayer;
          if (!p) return;
          if (e.isIntersecting) {
            p.initView();
            p.view.visible = true;
            p.view.requestRender();
          } else if (p.view) {
            p.view.visible = false;
          }
        });
      }, { rootMargin: "400px 0px" });
    }
    player.card.__agPlayer = player;
    lazyObserver.observe(player.card);
  }

  /* ======================================================================
   * 6. Seite: Sektionen, Navigation, Notations-Trainer, Spickzettel
   * ==================================================================== */

  const library = {};

  function register(guide) {
    library[guide.id] = guide;
    return guide;
  }

  function mount(target, guideOrId) {
    const root = typeof target === "string" ? document.querySelector(target) : target;
    const guide = typeof guideOrId === "string" ? library[guideOrId] : guideOrId;
    if (!root || !guide) throw new Error("AlgGuide.mount: Ziel oder Leitfaden fehlt");
    root.classList.add("ag-root");

    // Stufen-Navigation
    const nav = el("nav", "ag-stagenav");
    nav.setAttribute("aria-label", "Schritte der Methode");
    const navList = el("ol");
    guide.sections.forEach((s, si) => {
      const li = el("li");
      const a = el("a", null, '<span class="ag-stagenav-n">' + (s.number || si + 1) + "</span>" + (s.short || s.title));
      a.href = "#" + s.id;
      li.appendChild(a);
      navList.appendChild(li);
      s.__navLink = a;
    });
    nav.appendChild(navList);
    root.appendChild(nav);

    if (guide.legend !== false) root.appendChild(renderLegend());
    if (guide.notationTrainer !== false) root.appendChild(renderNotationTrainer(guide.trainerOrientation));

    guide.sections.forEach((s, si) => {
      const sec = el("section", "ag-section");
      sec.id = s.id;
      const num = s.number || String(si + 1);
      const h = el("header", "ag-section-head");
      h.appendChild(el("span", "ag-section-num", num));
      const titles = el("div");
      titles.appendChild(el("h3", "ag-section-title", s.title));
      if (s.goal) titles.appendChild(el("p", "ag-section-goal", s.goal));
      h.appendChild(titles);
      sec.appendChild(h);
      if (s.intro) sec.appendChild(el("div", "ag-section-intro", s.intro));
      (s.cases || []).forEach((c, ci) => new CasePlayer(sec, c, s, num + "." + (ci + 1)));
      if (s.outro) sec.appendChild(el("div", "ag-section-outro", s.outro));
      root.appendChild(sec);
      s.__el = sec;
    });

    if (guide.cheatsheet !== false) root.appendChild(renderCheatsheet(guide));

    // aktive Stufe in der Navigation markieren
    if ("IntersectionObserver" in global) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          guide.sections.forEach((s) => s.__navLink.classList.toggle("is-active", s.__el === e.target));
          // aktiven Eintrag in der (horizontal scrollbaren) Leiste sichtbar halten
          const link = guide.sections.find((s) => s.__el === e.target).__navLink;
          const li = link.parentElement, bar = navList;
          if (li.offsetLeft < bar.scrollLeft || li.offsetLeft + li.offsetWidth > bar.scrollLeft + bar.clientWidth) {
            bar.scrollTo({ left: li.offsetLeft - 12, behavior: "smooth" });
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      guide.sections.forEach((s) => io.observe(s.__el));
    }
  }

  function renderLegend() {
    const box = el("div", "ag-legend");
    box.innerHTML =
      '<p class="ag-legend-title">So liest du die Würfel</p>' +
      '<ul>' +
      '<li><span class="ag-swatch ag-sw-focus"></span><span><strong>Farbig</strong> – wichtig in diesem Schritt.</span></li>' +
      '<li><span class="ag-swatch ag-sw-hidden"></span><span><strong>Grau</strong> – spielt in diesem Schritt keine Rolle.</span></li>' +
      '<li><span class="ag-swatch ag-sw-arrow"></span><span><strong>Pfeil</strong> – der nächste Zug.</span></li>' +
      "</ul>" +
      '<p class="ag-legend-keys">Bedienung: Der große Knopf spielt alles ab, der Doppelpfeil spielt nur den nächsten Teilschritt. ' +
      'Mit den Pfeiltasten (oder den kleinen Knöpfen) geht es Zug für Zug vor und zurück, ein Klick auf einen Zug springt direkt dorthin.</p>';
    return box;
  }

  function renderNotationTrainer(orientation) {
    const wrap = el("section", "ag-trainer");
    wrap.id = "notation";
    wrap.innerHTML =
      '<div class="ag-trainer-text"><h3 class="ag-section-title">Notation in 30 Sekunden</h3>' +
      "<p>Jeder Buchstabe steht für eine Seite: <b>R</b>echts, <b>L</b>inks, <b>U</b> oben (up), <b>D</b> unten (down), <b>F</b> vorne (front), <b>B</b> hinten (back). " +
      "Ohne Zusatz wird die Seite <em>im Uhrzeigersinn</em> gedreht – so, als würdest du direkt auf diese Seite schauen. " +
      "Ein Strich (<b>R′</b>) heißt gegen den Uhrzeigersinn, eine <b>2</b> eine halbe Drehung.</p>" +
      "<p class=\"ag-muted\">Probier es aus – tippe auf einen Zug:</p></div>";
    const box = el("div", "ag-trainer-box");
    const stage = el("div", "ag-stage ag-stage-small");
    const host = el("div", "ag-view");
    stage.appendChild(host);
    const big = el("div", "ag-bigmove");
    stage.appendChild(big);
    box.appendChild(stage);
    const pad = el("div", "ag-trainer-pad");
    const info = el("p", "ag-trainer-info", "&nbsp;");
    let view = null, busy = Promise.resolve();
    const ensure = () => {
      if (!view) {
        view = new CubeView(host, { scheme: resolveScheme(orientation || { U: "W", F: "G" }), mask: [["focus", "all"]] });
        views.add(view);
      }
      return view;
    };
    const rows = [["R", "L", "U", "D", "F", "B"], ["R'", "L'", "U'", "D'", "F'", "B'"], ["R2", "U2", "F2", "M", "E", "S"]];
    rows.forEach((r) => {
      const row = el("div", "ag-trainer-row");
      r.forEach((tok) => {
        const mv = parseMove(tok);
        const b = el("button", "ag-chip", chipHtml(mv.label));
        b.type = "button";
        const show = () => {
          const d = describeMove(mv);
          info.innerHTML = '<strong>' + chipHtml(mv.label) + "</strong> · " + d.what + ", " + d.how;
          big.innerHTML = chipHtml(mv.label);
        };
        b.addEventListener("mouseenter", () => { show(); if (!ensure().anim) view.setArrow(mv); });
        b.addEventListener("mouseleave", () => view && !view.anim && view.setArrow(null));
        b.addEventListener("click", () => {
          show();
          ensure();
          busy = busy.then(() => view.animate(mv, SPEEDS[speedIndex].ms));
        });
        row.appendChild(b);
      });
      pad.appendChild(row);
    });
    const reset = el("button", "ag-btn ag-btn-text", "Würfel zurücksetzen");
    reset.type = "button";
    reset.addEventListener("click", () => { busy = busy.then(() => { ensure().build([]); big.innerHTML = ""; }); });
    pad.appendChild(info);
    pad.appendChild(reset);
    box.appendChild(pad);
    wrap.appendChild(box);
    // erst bauen, wenn sichtbar
    if ("IntersectionObserver" in global) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { ensure(); view.visible = true; view.requestRender(); }
        else if (view) view.visible = false;
      }), { rootMargin: "300px 0px" });
      io.observe(wrap);
    } else ensure();
    return wrap;
  }

  function renderCheatsheet(guide) {
    const sec = el("section", "ag-section ag-cheatsheet");
    sec.id = "spickzettel";
    sec.innerHTML = '<header class="ag-section-head"><span class="ag-section-num">★</span><div><h3 class="ag-section-title">Spickzettel</h3>' +
      '<p class="ag-section-goal">Alle Algorithmen dieser Seite auf einen Blick – ein Klick springt zum Fall.</p></div></header>';
    const grid = el("div", "ag-cheat-grid");
    guide.sections.forEach((s, si) => {
      const col = el("div", "ag-cheat-col");
      col.appendChild(el("h4", null, (s.number || si + 1) + " · " + (s.short || s.title)));
      (s.cases || []).forEach((c) => {
        const a = el("a", "ag-cheat-item");
        a.href = "#" + c.id;
        const alg = (c.phases || []).map((p) => p.moves).join(" ");
        a.innerHTML = '<span class="ag-cheat-name">' + c.title + '</span><code>' +
          parseAlg(alg).map((m) => chipHtml(m.label)).join(" ") + "</code>";
        col.appendChild(a);
      });
      grid.appendChild(col);
    });
    sec.appendChild(grid);
    return sec;
  }

  global.AlgGuide = {
    register, mount, library,
    // für Tests und eigene Erweiterungen
    parseAlg, invertAlg, describeMove, resolveScheme, CubeModel, applyMask, CubeView,
  };
})(window);

<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Algs 01 – Simulation</title>
    <!-- Bootstrap für Zentrierung -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"/>
    <style>
      body { display:flex; flex-direction:column; align-items:center; margin:0; padding:1rem; }
      #simulator { width:400px; height:400px; margin-top:2rem; border:1px solid #ccc; border-radius:.5rem; }
      #controls { display:flex; align-items:center; margin:1rem 0; max-width:400px; }
      #algo { flex:1; padding:.25rem; }
      #start { padding:.25rem .5rem; margin-left:.5rem; }
    </style>
</head>
<body>

  <!-- Simulator-Canvas -->
  <div id="simulator"></div>

  <!-- Fixed-Zugfolge + Start -->
  <div id="controls">
    <input
      id="algo"
      type="text"
      class="form-control"
      readonly
      value="F U R F' U' R' x z M R"
    />
    <button id="start" class="btn btn-outline-secondary">Animation starten</button>
  </div>

  <!-- Three.js & OrbitControls -->
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

  <!-- ausgelagertes Simulation-Skript -->
  <script src="assets/scripts/algs_01.js"></script>

</body>
</html>
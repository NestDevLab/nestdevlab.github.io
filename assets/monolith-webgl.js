const THREE_SRC = './vendor/three-0.164.1.module.min.js';
let THREE = null;

const LAYERS = [
  {
    id: 'top',
    name: 'Skills / Memory',
    color: 0x06b6d4,
    rgb: [6, 182, 212],
    y: 0.82,
    pods: [
      { label: 'Skills', x: -0.78, z: -0.36, w: 1.02, d: 0.62 },
      { label: 'Memory', x: 0.72, z: 0.35, w: 1.12, d: 0.58 },
    ],
  },
  {
    id: 'mid',
    name: 'Modules / Composers',
    color: 0x10b981,
    rgb: [16, 185, 129],
    y: 0,
    pods: [
      { label: 'Modules', x: -0.7, z: 0.32, w: 1.2, d: 0.58 },
      { label: 'Composers', x: 0.78, z: -0.3, w: 1.14, d: 0.6 },
    ],
  },
  {
    id: 'low',
    name: 'API / Events',
    color: 0xf59e0b,
    rgb: [245, 158, 11],
    y: -0.82,
    pods: [
      { label: 'API', x: -0.82, z: -0.28, w: 0.88, d: 0.58 },
      { label: 'Events', x: 0.78, z: 0.32, w: 1.16, d: 0.58 },
    ],
  },
];

const CALLOUTS = {
  Skills: { side: 'left', anchor: [-0.92, 1.4, -0.66], x: 9, y: 22 },
  Memory: { side: 'right', anchor: [0.96, 1.42, 0.58], x: 79, y: 18 },
  Modules: { side: 'left', anchor: [-1.04, 0.22, 0.5], x: 7, y: 45 },
  Composers: { side: 'right', anchor: [1.04, 0.22, -0.5], x: 82, y: 49 },
  API: { side: 'left', anchor: [-1.04, -1.22, -0.46], x: 10, y: 73 },
  Events: { side: 'right', anchor: [1.05, -1.22, 0.55], x: 77, y: 76 },
};

const PROJECT_TO_LAYER = {
  agentwheel: 'top',
  syncwheel: 'mid',
  'nestjs-yalc': 'low',
  'portable-agent-memory': 'top',
  'agent-core-toolkit': 'mid',
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pointerFine = window.matchMedia('(pointer: fine)');
const DPR_CAP = 2;

let currentScene = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rgba = ([r, g, b], alpha) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function injectRuntimeStyles() {
  if (document.getElementById('monolith-runtime-styles')) return;

  const style = document.createElement('style');
  style.id = 'monolith-runtime-styles';
  style.textContent = `
    .monolith-stage {
      position: relative;
      min-height: clamp(390px, 40vw, 500px);
      isolation: isolate;
      overflow: visible;
      display: grid;
      place-items: center;
      contain: layout;
    }

    .monolith-stage::after {
      content: "";
      position: absolute;
      inset: 7% 3% 1%;
      border-radius: 999px;
      background: radial-gradient(ellipse at center, rgba(245,158,11,.16), rgba(16,185,129,.08) 37%, rgba(6,182,212,.08) 54%, transparent 72%);
      filter: blur(24px);
      opacity: .72;
      pointer-events: none;
      z-index: 0;
    }

    .monolith-stage canvas,
    .monolith-lines {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }

    .monolith-stage canvas {
      z-index: 2;
      filter: drop-shadow(0 34px 55px rgba(0,0,0,.42));
    }

    .monolith-lines {
      z-index: 3;
      pointer-events: none;
      overflow: visible;
    }

    .monolith-lines path {
      fill: none;
      stroke-width: 1.15;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: .82;
      filter: drop-shadow(0 0 8px currentColor);
    }

    .monolith-stage .fallback-stack {
      position: relative;
      z-index: 1;
      width: min(450px, 80vw);
      height: 390px;
      transform-style: preserve-3d;
      transform: rotateX(58deg) rotateZ(-35deg);
    }

    .monolith-stage.is-webgl .fallback-stack {
      opacity: 0;
      visibility: hidden;
    }

    .monolith-stage .floor-shadow {
      position: absolute;
      left: 14%;
      right: 14%;
      bottom: 3%;
      height: 20%;
      border-radius: 50%;
      background: radial-gradient(ellipse, rgba(6,182,212,.2), rgba(0,0,0,.18) 48%, transparent 72%);
      filter: blur(13px);
      transform: translateZ(-78px);
    }

    .monolith-stage .mono-layer {
      position: absolute;
      left: 14%;
      width: 72%;
      height: 27%;
      border: 1px solid rgba(var(--ac), .58);
      border-radius: 14px;
      background:
        linear-gradient(145deg, rgba(255,255,255,.15), rgba(255,255,255,.03) 42%, rgba(var(--ac), .12)),
        rgba(8, 12, 13, .54);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.24),
        inset 0 0 30px rgba(var(--ac), .14),
        0 18px 40px rgba(0,0,0,.34),
        0 0 28px rgba(var(--ac), .18);
      transform-style: preserve-3d;
    }

    .monolith-stage .mono-layer-top { top: 11%; }
    .monolith-stage .mono-layer-mid { top: 36%; }
    .monolith-stage .mono-layer-low { top: 61%; }

    .monolith-stage .layer-plate,
    .monolith-stage .module,
    .monolith-stage .trace,
    .monolith-stage .rail {
      position: absolute;
      display: block;
    }

    .monolith-stage .layer-plate {
      inset: 10px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 11px;
      background: linear-gradient(135deg, rgba(255,255,255,.08), transparent 48%);
    }

    .monolith-stage .module {
      min-width: 72px;
      padding: 6px 9px;
      border: 1px solid rgba(var(--ac), .45);
      border-radius: 8px;
      background: rgba(4, 8, 10, .78);
      color: rgba(244, 255, 250, .9);
      font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      text-transform: uppercase;
      text-align: center;
      letter-spacing: .05em;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 0 18px rgba(var(--ac), .18);
      transform: translateZ(20px);
    }

    .monolith-stage .module-a,
    .monolith-stage .module-c,
    .monolith-stage .module-e { left: 15%; top: 24%; }
    .monolith-stage .module-b,
    .monolith-stage .module-d,
    .monolith-stage .module-f { right: 14%; bottom: 22%; }

    .monolith-stage .trace {
      height: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, rgba(var(--ac), .92), transparent);
      box-shadow: 0 0 12px rgba(var(--ac), .65);
      transform: translateZ(26px);
    }

    .monolith-stage .trace-a,
    .monolith-stage .trace-c,
    .monolith-stage .trace-e { left: 12%; right: 18%; top: 51%; }
    .monolith-stage .trace-b,
    .monolith-stage .trace-d,
    .monolith-stage .trace-f { width: 30%; right: 18%; top: 34%; transform: rotate(90deg) translateZ(26px); }

    .monolith-stage .rail {
      width: 3px;
      height: 70%;
      top: 14%;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,.32), rgba(148,163,184,.08));
      box-shadow: 0 0 18px rgba(148,163,184,.18);
    }

    .monolith-stage .rail-left { left: 17%; }
    .monolith-stage .rail-right { right: 17%; }
    .monolith-stage .rail-back { left: 50%; opacity: .35; }

    .callout {
      position: absolute;
      z-index: 5;
      left: calc(var(--x, 50) * 1%);
      top: calc(var(--y, 50) * 1%);
      transform: translate(-50%, -50%);
      width: 116px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      border: 1px solid rgba(var(--callout-color, 245,158,11), .62);
      border-radius: 999px;
      background: rgba(5, 9, 11, .96);
      color: rgba(245, 255, 250, .88);
      box-shadow:
        0 0 0 5px rgba(5, 9, 11, .62),
        0 0 18px rgba(var(--callout-color, 245,158,11), .22),
        inset 0 1px 0 rgba(255,255,255,.14);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font: 700 11px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: .04em;
      text-align: center;
      pointer-events: auto;
      isolation: isolate;
      white-space: nowrap;
      transition: border-color .18s ease, box-shadow .18s ease, color .18s ease, transform .18s ease;
    }

    .callout.is-active,
    .monolith-stage.is-intense .callout {
      border-color: rgba(var(--callout-color, 245,158,11), .82);
      color: #fff;
      box-shadow:
        0 0 0 5px rgba(5, 9, 11, .66),
        0 0 24px rgba(var(--callout-color, 245,158,11), .35),
        inset 0 1px 0 rgba(255,255,255,.18);
    }

    .callout.is-active {
      transform: translate(-50%, -50%) scale(1.04);
    }

    @media (max-width: 900px) {
      .monolith-stage {
        width: 100%;
        min-height: clamp(340px, 66vw, 470px);
      }
    }

    @media (max-width: 520px) {
      .monolith-stage {
        min-height: 350px;
      }

      .callout {
        width: 100px;
        height: 28px;
        padding: 0 8px;
        font-size: 9px;
      }

      .callout[data-callout="Skills"],
      .callout[data-callout="Modules"],
      .callout[data-callout="API"] {
        left: 8% !important;
        transform: translate(0, -50%);
      }

      .callout[data-callout="Memory"],
      .callout[data-callout="Composers"],
      .callout[data-callout="Events"] {
        left: auto !important;
        right: 8% !important;
        transform: translate(0, -50%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .callout,
      .monolith-stage * {
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function createTextTexture(label, rgb) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 256, 96);
  gradient.addColorStop(0, rgba(rgb, 0.18));
  gradient.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = gradient;
  roundRect(ctx, 18, 18, 220, 60, 14);
  ctx.fill();

  ctx.strokeStyle = rgba(rgb, 0.72);
  ctx.lineWidth = 2;
  roundRect(ctx, 18, 18, 220, 60, 14);
  ctx.stroke();

  ctx.font = '700 24px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6fbf7';
  ctx.shadowColor = rgba(rgb, 0.92);
  ctx.shadowBlur = 16;
  ctx.fillText(label.toUpperCase(), 128, 49);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundRect(ctx, x, y, width, height, radius) {
  const right = x + width;
  const bottom = y + height;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function makeBar(length, thickness, color, opacity = 0.78) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(length, thickness, thickness),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
}

function addMeshEdges(mesh, color, opacity = 0.32) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
    }),
  );
  mesh.add(edges);
  return edges;
}

function addGlowSlot(parent, color, width, z = 0, opacity = 0.62) {
  const slot = makeBar(width, 0.018, color, opacity);
  slot.position.set(0, 0.19, z);
  parent.add(slot);
  return slot;
}

function createEnergyFlows() {
  const group = new THREE.Group();
  const specs = [
    {
      color: 0x06b6d4,
      phase: 0,
      speed: 0.22,
      points: [
        [-1.16, 1.22, -0.62],
        [-1.44, 0.72, -0.92],
        [0.72, 0.3, -0.96],
        [1.2, -0.58, -0.68],
      ],
    },
    {
      color: 0x10b981,
      phase: 0.32,
      speed: 0.19,
      points: [
        [1.18, 1.14, 0.62],
        [1.46, 0.66, 0.92],
        [-0.82, 0.1, 0.96],
        [-1.2, -0.64, 0.68],
      ],
    },
    {
      color: 0xf59e0b,
      phase: 0.64,
      speed: 0.24,
      points: [
        [-1.22, -0.76, -0.68],
        [-1.42, -0.28, -1.02],
        [0.54, 0.26, -1.04],
        [1.24, 0.72, -0.76],
      ],
    },
    {
      color: 0x2dd4bf,
      phase: 0.82,
      speed: 0.17,
      points: [
        [1.22, 0.18, -0.52],
        [1.48, 0.56, -0.84],
        [-0.46, 0.98, -0.86],
        [-1.16, 1.28, -0.58],
      ],
    },
  ];

  const flows = specs.map((spec) => {
    const color = new THREE.Color(spec.color);
    const curve = new THREE.CatmullRomCurve3(spec.points.map((point) => new THREE.Vector3(...point)));
    const beam = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 72, 0.016, 8, false),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(beam);

    const core = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 72, 0.006, 6, false),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(core);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(42));
    const line = new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(line);

    const trailGeometry = new THREE.BufferGeometry().setFromPoints([curve.getPoint(0), curve.getPoint(0.05)]);
    const trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(trail);

    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.082, 20, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(packet);

    const halo = createSoftDisc({ r: Math.round(color.r * 255), g: Math.round(color.g * 255), b: Math.round(color.b * 255) }, 0.78, 0.52);
    halo.rotation.x = -Math.PI / 2.8;
    group.add(halo);

    return {
      ...spec,
      curve,
      beam,
      core,
      line,
      trail,
      packet,
      halo,
    };
  });

  group.userData.flows = flows;
  return group;
}

function addCircuit(parent, layer, zOffset) {
  const color = new THREE.Color(layer.color);
  const y = 0.2;
  const traces = [
    { pos: [-0.92, y, zOffset], rot: 0, len: 1.26 },
    { pos: [0.12, y, zOffset], rot: Math.PI / 2, len: 0.82 },
    { pos: [0.92, y, zOffset * -0.78], rot: 0, len: 1.08 },
    { pos: [-0.14, y, zOffset * -0.78], rot: Math.PI / 2, len: 0.66 },
    { pos: [0.02, y + 0.02, 0.02], rot: 0, len: 1.72 },
    { pos: [-1.22, y + 0.015, -0.08], rot: Math.PI / 2, len: 0.72 },
    { pos: [1.22, y + 0.015, 0.12], rot: Math.PI / 2, len: 0.72 },
  ];

  traces.forEach((trace, index) => {
    const bar = makeBar(trace.len, 0.022, color, 0.58);
    bar.position.set(trace.pos[0], trace.pos[1], trace.pos[2]);
    bar.rotation.y = trace.rot;
    bar.userData.phase = index * 0.47;
    parent.add(bar);
  });

  [-1.34, -0.7, -0.1, 0.58, 1.32].forEach((x, index) => {
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(index % 2 ? 0.035 : 0.045, 16, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    node.position.set(x, y + 0.01, index % 2 ? -0.76 : 0.76);
    node.userData.phase = index * 0.36;
    parent.add(node);
  });
}

function createLayer(layer) {
  const group = new THREE.Group();
  group.name = layer.name;
  group.position.y = layer.y;

  const accent = new THREE.Color(layer.color);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(3.22, 0.28, 2.22, 6, 1, 6),
    new THREE.MeshPhysicalMaterial({
      color: accent,
      roughness: 0.12,
      metalness: 0.02,
      transparent: true,
      opacity: 0.15,
      transmission: 0.46,
      thickness: 0.52,
      ior: 1.35,
      clearcoat: 0.82,
      clearcoatRoughness: 0.08,
      emissive: accent,
      emissiveIntensity: 0.03,
      side: THREE.DoubleSide,
    }),
  );
  slab.name = `${layer.id}-glass`;
  group.add(slab);

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
  });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), edgeMaterial);
  group.add(edges);

  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: 0x070b0d,
    roughness: 0.33,
    metalness: 0.88,
    emissive: accent,
    emissiveIntensity: 0.035,
  });

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.5, 1.16),
    chassisMaterial.clone(),
  );
  chassis.position.y = -0.08;
  group.add(chassis);
  addMeshEdges(chassis, accent, 0.24);

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 0.5, 0.82),
    new THREE.MeshStandardMaterial({
      color: 0x12191c,
      roughness: 0.46,
      metalness: 0.74,
      emissive: 0x030608,
      emissiveIntensity: 0.36,
    }),
  );
  core.position.y = 0.25;
  group.add(core);
  addMeshEdges(core, accent, 0.18);

  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x7c8f98,
    roughness: 0.27,
    metalness: 0.86,
    emissive: 0x1d2730,
    emissiveIntensity: 0.16,
  });
  [-1.42, 1.42].forEach((x) => {
    [-0.98, 0.98].forEach((z) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.62, 0.13), railMaterial);
      rail.position.set(x, -0.02, z);
      group.add(rail);
    });
  });

  const podMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0f12,
    roughness: 0.34,
    metalness: 0.78,
    emissive: accent,
    emissiveIntensity: 0.07,
  });

  const sideModuleSpecs = [
    { size: [0.46, 0.56, 0.84], pos: [-1.42, -0.02, 0.22] },
    { size: [0.46, 0.56, 0.84], pos: [1.42, -0.02, -0.2] },
    { size: [0.8, 0.54, 0.42], pos: [-0.62, -0.02, 1.02] },
    { size: [0.8, 0.54, 0.42], pos: [0.62, -0.02, -1.02] },
  ];

  sideModuleSpecs.forEach((spec, index) => {
    const module = new THREE.Mesh(
      new THREE.BoxGeometry(spec.size[0], spec.size[1], spec.size[2]),
      podMaterial.clone(),
    );
    module.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    module.material.emissiveIntensity = 0.055;
    group.add(module);
    addMeshEdges(module, accent, 0.28);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(spec.size[0] * 0.56, 0.018, Math.max(0.18, spec.size[2] * 0.34)),
      new THREE.MeshStandardMaterial({
        color: 0x11191c,
        roughness: 0.38,
        metalness: 0.62,
        emissive: accent,
        emissiveIntensity: 0.04,
      }),
    );
    panel.position.set(spec.pos[0], spec.pos[1] + spec.size[1] * 0.52, spec.pos[2]);
    group.add(panel);
    if (index % 2 === 0) addGlowSlot(module, accent, spec.size[0] * 0.44, 0, 0.42);
  });

  const glassCellMaterial = slab.material.clone();
  glassCellMaterial.opacity = 0.18;
  glassCellMaterial.emissiveIntensity = 0.035;
  [
    { size: [0.66, 0.32, 0.52], pos: [-0.78, 0.12, -0.68] },
    { size: [0.66, 0.32, 0.52], pos: [0.78, 0.12, 0.68] },
    { size: [0.5, 0.3, 0.56], pos: [-1.2, 0.1, -0.1] },
    { size: [0.5, 0.3, 0.56], pos: [1.18, 0.1, 0.1] },
  ].forEach((cell) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(cell.size[0], cell.size[1], cell.size[2]),
      glassCellMaterial.clone(),
    );
    mesh.position.set(cell.pos[0], cell.pos[1], cell.pos[2]);
    group.add(mesh);
    addMeshEdges(mesh, accent, 0.34);
  });

  const pods = layer.pods.map((pod) => {
    const podGroup = new THREE.Group();
    podGroup.name = pod.label;
    podGroup.userData.label = pod.label;
    podGroup.userData.layer = layer.id;
    podGroup.position.set(pod.x * 0.9, 0.34, pod.z);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(pod.w * 0.9, 0.42, pod.d), podMaterial.clone());
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    podGroup.add(mesh);

    const podEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.46,
        blending: THREE.AdditiveBlending,
      }),
    );
    podGroup.add(podEdges);

    const topPanel = new THREE.Mesh(
      new THREE.BoxGeometry(pod.w * 0.54, 0.022, pod.d * 0.42),
      new THREE.MeshStandardMaterial({
        color: 0x151d20,
        roughness: 0.42,
        metalness: 0.66,
        emissive: accent,
        emissiveIntensity: 0.045,
      }),
    );
    topPanel.position.y = 0.221;
    podGroup.add(topPanel);

    const status = addGlowSlot(podGroup, accent, pod.w * 0.3, pod.d * -0.14, 0.58);
    status.position.y = 0.25;

    group.add(podGroup);
    return {
      ...pod,
      group: podGroup,
      material: mesh.material,
      edgeMaterial: podEdges.material,
      statusMaterial: status.material,
    };
  });

  addCircuit(group, layer, 0.68);

  if (layer.id === 'top') {
    const capBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.6, 0.18, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0a1012,
        roughness: 0.28,
        metalness: 0.82,
        emissive: 0x030506,
        emissiveIntensity: 0.28,
      }),
    );
    capBase.position.set(0.12, 0.62, -0.04);
    group.add(capBase);
    addMeshEdges(capBase, accent, 0.22);

    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.024, 0.16),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
      }),
    );
    chip.position.set(0.0, 0.736, 0.0);
    group.add(chip);
  }

  const hookMaterial = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.84,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const hooks = layer.pods.map((pod) => {
    const hook = new THREE.Mesh(new THREE.SphereGeometry(0.056, 18, 10), hookMaterial.clone());
    hook.position.set((pod.x * 0.9) + (pod.x > 0 ? pod.w * 0.44 : -pod.w * 0.44), 0.48, pod.z);
    hook.userData.label = pod.label;
    group.add(hook);
    return hook;
  });

  group.userData = { layer, slab, edgeMaterial, pods, hooks };
  return group;
}

function createSoftDisc(color, opacity, radius = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(256, 256, 4, 256, 256, 250);
  gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${opacity})`);
  gradient.addColorStop(0.46, `rgba(${color.r},${color.g},${color.b},${opacity * 0.28})`);
  gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius, radius),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  return mesh;
}

function prepareDom(stage) {
  injectRuntimeStyles();
  stage.classList.add('is-ready');
  stage.style.setProperty('--monolith-ready', '1');

  const fallback = stage.querySelector('.fallback-stack');
  if (fallback) fallback.setAttribute('aria-hidden', 'true');

  const calloutNodes = Array.from(stage.querySelectorAll('[data-callout]'));
  calloutNodes.forEach((node) => {
    const label = node.getAttribute('data-callout');
    const config = CALLOUTS[label];
    if (!config) return;
    const layer = LAYERS.find((item) => item.pods.some((pod) => pod.label === label)) || LAYERS[0];
    node.style.setProperty('--x', config.x);
    node.style.setProperty('--y', config.y);
    node.style.setProperty('--callout-color', layer.rgb.join(','));
  });

  let svg = stage.querySelector('.monolith-lines');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('monolith-lines');
    svg.setAttribute('aria-hidden', 'true');
    stage.appendChild(svg);
  }
  svg.innerHTML = '';

  const paths = new Map();
  calloutNodes.forEach((node) => {
    const label = node.getAttribute('data-callout');
    const layer = LAYERS.find((item) => item.pods.some((pod) => pod.label === label)) || LAYERS[0];
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.dataset.line = label;
    path.style.color = rgba(layer.rgb, 0.92);
    path.setAttribute('stroke', rgba(layer.rgb, 0.72));
    svg.appendChild(path);
    paths.set(label, path);
  });

  return { fallback, calloutNodes, svg, paths };
}

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  return renderer;
}

function createScene(stage) {
  const dom = prepareDom(stage);
  const canvas = document.createElement('canvas');
  canvas.id = 'monolith-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  stage.appendChild(canvas);

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05080a, 0.032);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
  camera.position.set(0, 0.12, 7.35);

  const root = new THREE.Group();
  root.rotation.set(THREE.MathUtils.degToRad(-17), THREE.MathUtils.degToRad(-31), THREE.MathUtils.degToRad(0));
  scene.add(root);

  scene.add(new THREE.AmbientLight(0xc8fff4, 0.4));

  const key = new THREE.DirectionalLight(0xfff4dc, 2.4);
  key.position.set(-3.2, 4.8, 4.5);
  scene.add(key);

  const amberLight = new THREE.PointLight(0xf59e0b, 2.2, 8);
  amberLight.position.set(-1.2, 2.1, 2.6);
  scene.add(amberLight);

  const tealLight = new THREE.PointLight(0x10b981, 2.15, 8);
  tealLight.position.set(1.9, 0.1, 2.4);
  scene.add(tealLight);

  const cyanLight = new THREE.PointLight(0x06b6d4, 2.1, 8);
  cyanLight.position.set(-0.3, -1.8, 2.8);
  scene.add(cyanLight);

  [amberLight, tealLight, cyanLight].forEach((light) => {
    light.userData.basePosition = light.position.clone();
  });

  const layerGroups = LAYERS.map(createLayer);
  layerGroups.forEach((layerGroup) => root.add(layerGroup));

  const energyFlows = createEnergyFlows();
  root.add(energyFlows);

  const spineMaterial = new THREE.MeshStandardMaterial({
    color: 0x232f36,
    roughness: 0.22,
    metalness: 0.92,
    emissive: 0x071014,
    emissiveIntensity: 0.44,
  });
  [-1.5, 1.5].forEach((x) => {
    [-1.0, 1.0].forEach((z) => {
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 2.72, 18), spineMaterial);
      spine.position.set(x, 0, z);
      root.add(spine);
    });
  });

  const backPlate = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 2.78, 0.05),
    new THREE.MeshBasicMaterial({
      color: 0x0c1519,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  backPlate.position.set(0, 0, -1.24);
  root.add(backPlate);

  const floorGlow = createSoftDisc({ r: 6, g: 182, b: 212 }, 0.34, 4.9);
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, -1.86, 0.25);
  floorGlow.scale.z = 0.28;
  root.add(floorGlow);

  const aura = createSoftDisc({ r: 245, g: 158, b: 11 }, 0.22, 6.5);
  aura.position.set(0, 0.04, -2.25);
  scene.add(aura);

  const particles = createParticles();
  scene.add(particles);

  const clock = new THREE.Clock();
  const state = {
    stage,
    canvas,
    renderer,
    scene,
    camera,
    root,
    layerGroups,
    energyFlows,
    particles,
    lights: [amberLight, tealLight, cyanLight],
    dom,
    reduced: prefersReducedMotion.matches,
    visible: true,
    hidden: document.hidden,
    animationFrame: 0,
    intensity: 0,
    targetIntensity: 0,
    activeLabel: null,
    activeLayer: null,
    clock,
  };

  setupInteractions(state);
  setupLifecycle(state);
  resize(state);
  updateScene(state, 0, 0);
  renderOnce(state);
  start(state);
  currentScene = state;
  return state;
}

function createParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  for (let i = 0; i < 92; i += 1) {
    positions.push(
      (Math.random() - 0.5) * 5.8,
      (Math.random() - 0.5) * 3.8,
      (Math.random() - 0.5) * 3.2,
    );
    const color = i % 3 === 0 ? [245, 158, 11] : i % 3 === 1 ? [16, 185, 129] : [6, 182, 212];
    colors.push(color[0] / 255, color[1] / 255, color[2] / 255);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.023,
      transparent: true,
      opacity: 0.58,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
}

function setupInteractions(state) {
  const { stage, dom } = state;

  const setIntensity = (active, label = null, layer = null) => {
    state.targetIntensity = active ? 1 : 0;
    state.activeLabel = label;
    state.activeLayer = layer;
    stage.classList.toggle('is-intense', active);
    updateCalloutState(state);
    start(state);
  };

  if (pointerFine.matches) {
    stage.addEventListener('pointerenter', () => setIntensity(true));
    stage.addEventListener('pointerleave', () => setIntensity(false));
  }

  stage.addEventListener('focusin', () => setIntensity(true));
  stage.addEventListener('focusout', () => setIntensity(false));

  dom.calloutNodes.forEach((node) => {
    const label = node.getAttribute('data-callout');
    const layer = LAYERS.find((item) => item.pods.some((pod) => pod.label === label));
    const enter = () => setIntensity(true, label, layer?.id || null);
    const leave = () => setIntensity(false);
    node.addEventListener('pointerenter', enter);
    node.addEventListener('focusin', enter);
    node.addEventListener('pointerleave', leave);
    node.addEventListener('focusout', leave);
  });

  document.querySelectorAll('.button-primary, .button-secondary, .nav-pill').forEach((node) => {
    const enter = () => setIntensity(true);
    const leave = () => setIntensity(false);
    node.addEventListener('pointerenter', enter);
    node.addEventListener('focusin', enter);
    node.addEventListener('pointerleave', leave);
    node.addEventListener('focusout', leave);
  });

  document.querySelectorAll('[data-project-card]').forEach((card) => {
    const id = card.getAttribute('data-project-card');
    const layerId = PROJECT_TO_LAYER[id];
    const enter = () => setIntensity(true, null, layerId);
    const leave = () => setIntensity(false);
    card.addEventListener('pointerenter', enter);
    card.addEventListener('focusin', enter);
    card.addEventListener('pointerleave', leave);
    card.addEventListener('focusout', leave);
  });

  prefersReducedMotion.addEventListener?.('change', () => {
    state.reduced = prefersReducedMotion.matches;
    updateScene(state, 0, state.clock.elapsedTime);
    renderOnce(state);
    if (!state.reduced) start(state);
  });
}

function setupLifecycle(state) {
  const observer = new IntersectionObserver((entries) => {
    state.visible = entries.some((entry) => entry.isIntersecting);
    if (state.visible) start(state);
    else stop(state);
  }, { rootMargin: '120px 0px' });
  observer.observe(state.stage);

  document.addEventListener('visibilitychange', () => {
    state.hidden = document.hidden;
    if (state.hidden) stop(state);
    else start(state);
  });

  window.addEventListener('resize', () => resize(state), { passive: true });
}

function updateCalloutState(state) {
  state.dom.calloutNodes.forEach((node) => {
    const label = node.getAttribute('data-callout');
    const isLayer = state.activeLayer && LAYERS
      .find((layer) => layer.id === state.activeLayer)
      ?.pods.some((pod) => pod.label === label);
    node.classList.toggle('is-active', label === state.activeLabel || Boolean(isLayer));
  });
}

function resize(state) {
  const rect = state.stage.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width || 520));
  const height = Math.max(320, Math.floor(rect.height || 520));

  state.camera.aspect = width / height;
  state.camera.position.z = width < 520 ? 9.35 : width < 760 ? 8.35 : 7.35;
  state.camera.updateProjectionMatrix();

  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  state.renderer.setSize(width, height, false);
  state.dom.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  updateCalloutLines(state);
  renderOnce(state);
}

function start(state) {
  if (state.animationFrame || state.hidden || !state.visible) return;
  if (state.reduced && Math.abs(state.intensity - state.targetIntensity) < 0.01) {
    updateScene(state, 0, state.clock.elapsedTime);
    renderOnce(state);
    return;
  }
  state.clock.getDelta();
  state.animationFrame = requestAnimationFrame(() => animate(state));
}

function stop(state) {
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = 0;
}

function animate(state) {
  state.animationFrame = 0;
  if (state.hidden || !state.visible) return;

  const delta = Math.min(state.clock.getDelta(), 0.05);
  const elapsed = state.clock.elapsedTime;
  updateScene(state, delta, elapsed);
  renderOnce(state);

  const settling = Math.abs(state.intensity - state.targetIntensity) > 0.006;
  if (!state.reduced || settling) {
    state.animationFrame = requestAnimationFrame(() => animate(state));
  }
}

function updateScene(state, delta, elapsed) {
  const reduced = state.reduced;
  const ease = reduced ? 1 : 1 - Math.pow(0.001, delta || 0.016);
  state.intensity += (state.targetIntensity - state.intensity) * ease;
  state.intensity = clamp(state.intensity, 0, 1);

  const breathe = reduced ? 0 : Math.sin(elapsed * 1.05) * 0.018;
  const pulse = reduced ? 0.5 : (Math.sin(elapsed * 2.4) + 1) * 0.5;
  const intense = state.intensity;

  state.root.scale.setScalar(1.13 + breathe + intense * 0.045);
  if (!reduced) {
    state.root.rotation.y = THREE.MathUtils.degToRad(-31) + Math.sin(elapsed * 0.23) * 0.052;
    state.root.rotation.x = THREE.MathUtils.degToRad(-17) + Math.sin(elapsed * 0.31) * 0.018;
    state.particles.rotation.y = elapsed * 0.018;
    state.particles.rotation.x = Math.sin(elapsed * 0.19) * 0.02;
  }

  state.layerGroups.forEach((group, index) => {
    const { layer, slab, edgeMaterial, pods, hooks } = group.userData;
    const layerActive = !state.activeLayer || state.activeLayer === layer.id;
    const separate = (index - 1) * 0.11 * intense;
    const drift = reduced ? 0 : Math.sin(elapsed * 0.74 + index * 1.7) * 0.024;
    group.position.y = layer.y + separate + drift;
    group.position.x = (index - 1) * 0.025 * intense;

    slab.material.opacity = layerActive ? 0.15 + intense * 0.06 : 0.09;
    slab.material.emissiveIntensity = (layerActive ? 0.03 : 0.015) + intense * 0.055;
    edgeMaterial.opacity = layerActive ? 0.52 + pulse * 0.16 + intense * 0.16 : 0.24;

    pods.forEach((pod, podIndex) => {
      const labelActive = state.activeLabel === pod.label || (state.activeLayer === layer.id && !state.activeLabel);
      pod.group.position.y = 0.34 + (reduced ? 0 : Math.sin(elapsed * 1.4 + podIndex + index) * 0.014);
      pod.material.emissiveIntensity = (labelActive ? 0.22 : 0.07) + intense * 0.08;
      pod.edgeMaterial.opacity = labelActive ? 0.9 : layerActive ? 0.48 + pulse * 0.12 : 0.22;
      pod.statusMaterial.opacity = labelActive ? 0.95 : 0.48 + pulse * 0.2;
    });

    hooks.forEach((hook, hookIndex) => {
      const labelActive = state.activeLabel === hook.userData.label;
      hook.scale.setScalar(1 + (labelActive ? 0.34 : 0) + pulse * 0.18 + intense * 0.22);
      hook.material.opacity = labelActive ? 1 : 0.68 + pulse * 0.18;
      if (!reduced) hook.position.y = 0.48 + Math.sin(elapsed * 1.65 + hookIndex) * 0.014;
    });
  });

  const flowIntensity = reduced ? 0.42 : 0.82 + pulse * 0.22 + intense * 0.28;
  state.energyFlows.userData.flows.forEach((flow, index) => {
    const t = reduced ? flow.phase : (elapsed * flow.speed + flow.phase) % 1;
    const tailT = Math.max(0, t - 0.16);
    const midT = Math.max(0, t - 0.08);
    const head = flow.curve.getPoint(t);
    const tail = flow.curve.getPoint(tailT);
    const mid = flow.curve.getPoint(midT);

    flow.beam.material.opacity = 0.22 + pulse * 0.12 + intense * 0.08;
    flow.core.material.opacity = 0.42 + pulse * 0.18 + intense * 0.14;

    flow.packet.position.copy(head);
    flow.packet.scale.setScalar(1 + pulse * 0.7 + intense * 0.42);
    flow.packet.material.opacity = flowIntensity;

    flow.halo.position.copy(head);
    flow.halo.position.y += 0.018;
    flow.halo.material.opacity = flowIntensity * 0.55;
    if (!reduced) flow.halo.rotation.z = elapsed * (0.35 + index * 0.08);

    flow.trail.geometry.setFromPoints([tail, mid, head]);
    flow.trail.material.opacity = flowIntensity * 0.92;
    flow.line.material.opacity = 0.18 + pulse * 0.1 + intense * 0.08;
  });

  state.lights.forEach((light, index) => {
    light.intensity = 1.75 + intense * 1.1 + (reduced ? 0 : Math.sin(elapsed * 1.1 + index) * 0.18);
    if (!reduced) {
      const base = light.userData.basePosition;
      light.position.set(
        base.x + Math.sin(elapsed * 0.62 + index) * 0.18,
        base.y + Math.sin(elapsed * 0.54 + index * 1.3) * 0.09,
        base.z + Math.cos(elapsed * 0.7 + index) * 0.16,
      );
    }
  });

  updateCalloutLines(state);
}

function updateCalloutLines(state) {
  const rect = state.stage.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const vector = new THREE.Vector3();
  const scratch = new THREE.Vector3();
  const elapsed = state.clock?.elapsedTime || 0;
  const idlePulse = state.reduced ? 0.2 : (Math.sin(elapsed * 2.1) + 1) * 0.5;

  state.dom.calloutNodes.forEach((node) => {
    const label = node.getAttribute('data-callout');
    const config = CALLOUTS[label];
    const path = state.dom.paths.get(label);
    if (!config || !path) return;

    scratch.fromArray(config.anchor);
    state.root.localToWorld(scratch);
    vector.copy(scratch).project(state.camera);

    const startX = (vector.x * 0.5 + 0.5) * width;
    const startY = (-vector.y * 0.5 + 0.5) * height;
    const calloutRect = node.getBoundingClientRect();
    const lineGap = 14;
    const endX = config.side === 'left'
      ? calloutRect.right - rect.left + lineGap
      : calloutRect.left - rect.left - lineGap;
    const endY = calloutRect.top - rect.top + calloutRect.height / 2;
    const elbowX = config.side === 'left'
      ? Math.min(startX - 44, endX + 58)
      : Math.max(startX + 44, endX - 58);
    const elbowY = startY + (endY - startY) * 0.32;

    path.setAttribute('d', `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${elbowX.toFixed(1)} ${elbowY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`);
    path.style.opacity = state.activeLabel === label || state.targetIntensity > 0.5
      ? '1'
      : String(0.52 + idlePulse * 0.2);
    path.setAttribute('stroke-width', String(1.05 + idlePulse * 0.28 + state.intensity * 0.24));
  });
}

function renderOnce(state) {
  if (state.hidden || !state.visible) return;
  state.renderer.render(state.scene, state.camera);
}

function showFallback(stage) {
  injectRuntimeStyles();
  stage.classList.remove('is-webgl');
  stage.removeAttribute('data-webgl-loading');
  stage.querySelector('.monolith-lines')?.remove();
  stage.querySelector('#monolith-canvas')?.remove();
}

async function loadWebGL(stage) {
  if (currentScene || stage.hasAttribute('data-webgl-loading')) return;
  stage.setAttribute('data-webgl-loading', 'true');

  if (!canUseWebGL()) {
    showFallback(stage);
    return;
  }

  try {
    if (!THREE) THREE = await import(THREE_SRC);
    const sceneState = createScene(stage);
    stage.classList.add('is-webgl');
    sceneState.dom.fallback?.setAttribute('aria-hidden', 'true');
  } catch {
    showFallback(stage);
  }
}

function init() {
  const stage = document.querySelector('[data-monolith]');
  if (!stage) return;

  prepareDom(stage);

  if (!canUseWebGL()) {
    showFallback(stage);
    return;
  }

  const prime = () => loadWebGL(stage);
  stage.addEventListener('pointerenter', prime, { once: true });
  stage.addEventListener('pointerdown', prime, { once: true });
  stage.addEventListener('focusin', prime, { once: true });
  document.querySelectorAll('.button-primary, .button-secondary, .nav-pill').forEach((node) => {
    node.addEventListener('pointerenter', prime, { once: true });
    node.addEventListener('focusin', prime, { once: true });
  });

  loadWebGL(stage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export { LAYERS, currentScene };

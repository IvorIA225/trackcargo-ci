import type * as ThreeNS from "three";

type ThreeModule = typeof ThreeNS;

export interface StudioEnvHandle {
  texture: ThreeNS.Texture;
  dispose: () => void;
}

/**
 * Builds a procedural coastal daylight studio HDRI via PMREMGenerator.
 * Gives metallic steel, brushed aluminum, and glossy BOPP tape real specular reflections
 * without external HDR downloads or CSP issues.
 */
export function createCoastalStudioEnvironment(
  THREE: ThreeModule,
  renderer: ThreeNS.WebGLRenderer
): StudioEnvHandle {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0xdbe7f4);

  // Sky hemisphere dome
  const skyGeo = new THREE.SphereGeometry(32, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0xe6eff9,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(skyGeo, skyMat));

  // Warm 9am sun softbox (upper front-right)
  const sunPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff3dc })
  );
  sunPanel.material.color.multiplyScalar(4.8);
  sunPanel.position.set(14, 15, 11);
  sunPanel.lookAt(0, 0, 0);
  envScene.add(sunPanel);

  // Cool Atlantic sky bounce (left rim)
  const rimPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 14),
    new THREE.MeshBasicMaterial({ color: 0xbad6ff })
  );
  rimPanel.material.color.multiplyScalar(2.1);
  rimPanel.position.set(-16, 7, -9);
  rimPanel.lookAt(0, 0, 0);
  envScene.add(rimPanel);

  // Overhead skylight fill
  const topPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22),
    new THREE.MeshBasicMaterial({ color: 0xf7fbff })
  );
  topPanel.material.color.multiplyScalar(1.8);
  topPanel.position.set(0, 20, 0);
  topPanel.lookAt(0, 0, 0);
  envScene.add(topPanel);

  // Warm travertine quay ground bounce (prevents pitch-black undersides)
  const floorPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    new THREE.MeshBasicMaterial({ color: 0xd8d1c5 })
  );
  floorPanel.position.set(0, -10, 0);
  floorPanel.lookAt(0, 0, 0);
  envScene.add(floorPanel);

  const rt = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();
  skyGeo.dispose();
  skyMat.dispose();

  return {
    texture: rt.texture,
    dispose: () => {
      rt.dispose();
    },
  };
}

/**
 * Generates a soft realistic Ambient Occlusion contact shadow texture for grounded 3D rigs.
 */
export function createGroundShadowTexture(
  THREE: ThreeModule
): ThreeNS.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const grad = ctx.createRadialGradient(256, 256, 32, 256, 256, 244);
    grad.addColorStop(0, "rgba(10, 16, 26, 0.42)");
    grad.addColorStop(0.42, "rgba(10, 16, 26, 0.22)");
    grad.addColorStop(0.75, "rgba(10, 16, 26, 0.06)");
    grad.addColorStop(1, "rgba(10, 16, 26, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface SteelTextureOptions {
  baseHex: string;
  accentHex: string;
  serialCode: string;
  specLine: string;
  brushedAluminum?: boolean;
}

export interface PBRTextureSet {
  map: ThreeNS.CanvasTexture;
  bumpMap: ThreeNS.CanvasTexture;
  roughnessMap: ThreeNS.CanvasTexture;
  dispose: () => void;
}

/**
 * Generates high-DPI procedural steel / brushed aluminum PBR textures with stenciled ISO markings.
 */
export function createSteelLiveryTextures(
  THREE: ThreeModule,
  opts: SteelTextureOptions
): PBRTextureSet {
  const w = 1024;
  const h = 512;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = w;
  colorCanvas.height = h;
  const cCtx = colorCanvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bCtx = bumpCanvas.getContext("2d")!;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext("2d")!;

  // Base coat
  cCtx.fillStyle = opts.baseHex;
  cCtx.fillRect(0, 0, w, h);

  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, w, h);

  rCtx.fillStyle = opts.brushedAluminum ? "#484848" : "#686868";
  rCtx.fillRect(0, 0, w, h);

  // Subtle metallic / enamel grain & vertical panel seams
  if (opts.brushedAluminum) {
    for (let y = 0; y < h; y += 2) {
      const alpha = (Math.sin(y * 0.7) * 0.5 + 0.5) * 0.035;
      cCtx.fillStyle = `rgba(255,255,255,${alpha})`;
      cCtx.fillRect(0, y, w, 1);
      bCtx.fillStyle = `rgba(200,200,200,${alpha * 2})`;
      bCtx.fillRect(0, y, w, 1);
    }
    // Rivet lines
    cCtx.fillStyle = "rgba(13, 19, 29, 0.22)";
    bCtx.fillStyle = "#b8b8b8";
    for (let x = 64; x < w; x += 192) {
      cCtx.fillRect(x, 0, 2, h);
      for (let y = 24; y < h - 16; y += 36) {
        cCtx.beginPath();
        cCtx.arc(x - 7, y, 2.2, 0, Math.PI * 2);
        cCtx.fill();
        bCtx.beginPath();
        bCtx.arc(x - 7, y, 2.5, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  } else {
    // Subtle industrial enamel mottling & weld lines
    for (let i = 0; i < 650; i++) {
      const rx = (i * 197) % w;
      const ry = (i * 113) % h;
      const rw = 18 + (i % 40);
      const rh = 10 + (i % 24);
      cCtx.fillStyle =
        i % 2 === 0 ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.025)";
      cCtx.fillRect(rx, ry, rw, rh);
      rCtx.fillStyle =
        i % 3 === 0 ? "rgba(180,180,180,0.08)" : "rgba(70,70,70,0.08)";
      rCtx.fillRect(rx, ry, rw, rh);
    }
    for (let x = 128; x < w; x += 256) {
      cCtx.fillStyle = "rgba(0,0,0,0.14)";
      cCtx.fillRect(x, 0, 2, h);
      bCtx.fillStyle = "#5a5a5a";
      bCtx.fillRect(x, 0, 3, h);
    }
  }

  // Architectural livery accent stripe + white stencil typography
  cCtx.fillStyle = opts.accentHex;
  cCtx.fillRect(36, 52, 180, 18);

  const inkColor = opts.brushedAluminum
    ? "rgba(13, 19, 29, 0.88)"
    : "rgba(247, 246, 242, 0.92)";
  const subInk = opts.brushedAluminum
    ? "rgba(13, 19, 29, 0.65)"
    : "rgba(247, 246, 242, 0.68)";

  cCtx.fillStyle = inkColor;
  cCtx.font = "800 42px ui-monospace, SFMono-Regular, Menlo, monospace";
  cCtx.fillText(opts.serialCode, 38, 126);

  cCtx.fillStyle = subInk;
  cCtx.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";
  cCtx.fillText(opts.specLine, 38, 162);

  // Subtle corner data plate right side
  cCtx.strokeStyle = subInk;
  cCtx.lineWidth = 2;
  cCtx.strokeRect(w - 220, h - 108, 176, 68);
  cCtx.font = "700 16px ui-monospace, SFMono-Regular, Menlo, monospace";
  cCtx.fillText("ABJ · VRIDI", w - 204, h - 78);
  cCtx.fillText("ISO 45G1", w - 204, h - 54);

  // Stencil paint has slightly higher roughness
  rCtx.fillStyle = "#989898";
  rCtx.fillRect(36, 86, 360, 88);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);

  return {
    map,
    bumpMap,
    roughnessMap,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
    },
  };
}

/**
 * Generates corrugated kraft cardboard PBR textures for export parcels.
 */
export function createCardboardTextures(THREE: ThreeModule): PBRTextureSet {
  const s = 512;
  const cCanvas = document.createElement("canvas");
  cCanvas.width = s;
  cCanvas.height = s;
  const cCtx = cCanvas.getContext("2d")!;

  const bCanvas = document.createElement("canvas");
  bCanvas.width = s;
  bCanvas.height = s;
  const bCtx = bCanvas.getContext("2d")!;

  const rCanvas = document.createElement("canvas");
  rCanvas.width = s;
  rCanvas.height = s;
  const rCtx = rCanvas.getContext("2d")!;

  cCtx.fillStyle = "#cca16e";
  cCtx.fillRect(0, 0, s, s);
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, s, s);
  rCtx.fillStyle = "#d8d8d8";
  rCtx.fillRect(0, 0, s, s);

  // Fine kraft paper fibers & subtle corrugation ribs
  for (let y = 0; y < s; y += 4) {
    const wave = Math.sin((y / s) * Math.PI * 64) * 0.5 + 0.5;
    cCtx.fillStyle = `rgba(92, 58, 28, ${0.02 + wave * 0.025})`;
    cCtx.fillRect(0, y, s, 2);
    const bVal = Math.round(118 + wave * 20);
    bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bCtx.fillRect(0, y, s, 2);
  }

  for (let i = 0; i < 900; i++) {
    const fx = (i * 137) % s;
    const fy = (i * 251) % s;
    cCtx.fillStyle =
      i % 2 === 0 ? "rgba(74, 46, 20, 0.08)" : "rgba(245, 224, 192, 0.08)";
    cCtx.fillRect(fx, fy, 4, 1);
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const bumpMap = new THREE.CanvasTexture(bCanvas);
  const roughnessMap = new THREE.CanvasTexture(rCanvas);

  return {
    map,
    bumpMap,
    roughnessMap,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
    },
  };
}

/**
 * Generates a realistic thermal freight barcode shipping label texture.
 */
export function createShippingLabelTexture(
  THREE: ThreeModule,
  trackingCode: string,
  routeLabel: string,
  weightText: string
): ThreeNS.CanvasTexture {
  const w = 512;
  const h = 340;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Matte thermal white sticker
  ctx.fillStyle = "#faf9f5";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#0d131d";
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  // Header strip
  ctx.fillStyle = "#0d131d";
  ctx.fillRect(12, 12, w - 24, 54);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px system-ui, sans-serif";
  ctx.fillText("TRACKCARGO CI", 28, 47);

  ctx.fillStyle = "#f0642d";
  ctx.fillRect(w - 154, 22, 124, 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 18px ui-monospace, monospace";
  ctx.fillText("PRIORITAIRE", w - 144, 45);

  // Tracking Code
  ctx.fillStyle = "#0d131d";
  ctx.font = "800 44px ui-monospace, monospace";
  ctx.fillText(trackingCode, 28, 122);

  // Route & Weight
  ctx.fillStyle = "#4b5563";
  ctx.font = "700 20px ui-monospace, monospace";
  ctx.fillText(routeLabel, 28, 160);
  ctx.fillText(weightText, 28, 190);

  // Divider
  ctx.fillStyle = "#0d131d";
  ctx.fillRect(28, 210, w - 56, 2);

  // Code-128 style crisp barcode bars
  let bx = 28;
  const pattern = [4, 2, 7, 3, 2, 5, 3, 6, 2, 4, 8, 2, 3, 5, 2, 7, 3, 4, 2, 6, 4, 3, 5, 2, 7, 3, 4, 2, 6, 3, 5];
  pattern.forEach((widthUnit, idx) => {
    const barW = widthUnit * 2.2;
    if (idx % 2 === 0 && bx + barW < w - 28) {
      ctx.fillRect(bx, 226, barW, 74);
    }
    bx += barW + 2.5;
  });

  ctx.fillStyle = "#0d131d";
  ctx.font = "600 14px ui-monospace, monospace";
  ctx.fillText(`ABIDJAN · COMPTOIR TREICHVILLE · ${trackingCode}`, 28, 316);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates slatted hardwood floor / Euro-pallet timber textures.
 */
export function createWoodDeckTexture(THREE: ThreeModule): {
  map: ThreeNS.CanvasTexture;
  bumpMap: ThreeNS.CanvasTexture;
  dispose: () => void;
} {
  const s = 512;
  const cCanvas = document.createElement("canvas");
  cCanvas.width = s;
  cCanvas.height = s;
  const cCtx = cCanvas.getContext("2d")!;

  const bCanvas = document.createElement("canvas");
  bCanvas.width = s;
  bCanvas.height = s;
  const bCtx = bCanvas.getContext("2d")!;

  const planks = 8;
  const ph = s / planks;
  for (let p = 0; p < planks; p++) {
    const shade = 165 + ((p * 17) % 26);
    cCtx.fillStyle = `rgb(${shade}, ${Math.round(shade * 0.74)}, ${Math.round(shade * 0.48)})`;
    cCtx.fillRect(0, p * ph, s, ph - 3);
    cCtx.fillStyle = "#5c4028";
    cCtx.fillRect(0, (p + 1) * ph - 3, s, 3);

    bCtx.fillStyle = "#989898";
    bCtx.fillRect(0, p * ph, s, ph - 3);
    bCtx.fillStyle = "#303030";
    bCtx.fillRect(0, (p + 1) * ph - 3, s, 3);
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bCanvas);

  return {
    map,
    bumpMap,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
    },
  };
}


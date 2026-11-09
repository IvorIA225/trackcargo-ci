"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type DispatchStageStatus =
  | "RECUE_ORIGINE"
  | "EN_TRANSIT"
  | "ARRIVEE_ABIDJAN"
  | "PRET_RETRAIT";

interface ContainerStage3DProps {
  status: DispatchStageStatus;
  actRef: React.RefObject<HTMLElement | null>;
}

const TARGET_DOOR_ANGLE: Record<DispatchStageStatus, number> = {
  RECUE_ORIGINE: 0.04,
  EN_TRANSIT: 0.28,
  ARRIVEE_ABIDJAN: 0.88,
  PRET_RETRAIT: 1.9,
};

// Positive yaw swings the +Z rear hinged doors directly toward camera (+4.75, 2.55, 6.75)
const TARGET_YAW: Record<DispatchStageStatus, number> = {
  RECUE_ORIGINE: -0.34,
  EN_TRANSIT: -0.02,
  ARRIVEE_ABIDJAN: 0.24,
  PRET_RETRAIT: 0.42,
};

const STATUS_CODE_INDEX: Record<DispatchStageStatus, number> = {
  RECUE_ORIGINE: 0,
  EN_TRANSIT: 1,
  ARRIVEE_ABIDJAN: 2,
  PRET_RETRAIT: 3,
};

function createCorrugatedBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const ribs = 16;
    const w = canvas.width / ribs;
    for (let i = 0; i < ribs; i++) {
      const grad = ctx.createLinearGradient(i * w, 0, (i + 1) * w, 0);
      grad.addColorStop(0.0, "#404040");
      grad.addColorStop(0.28, "#d4d4d4");
      grad.addColorStop(0.56, "#ebebeb");
      grad.addColorStop(0.84, "#4b4b4b");
      grad.addColorStop(1.0, "#404040");
      ctx.fillStyle = grad;
      ctx.fillRect(i * w, 0, w + 1, canvas.height);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

export default function ContainerStage3D({
  status,
  actRef,
}: ContainerStage3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<DispatchStageStatus>(status);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const host = hostRef.current;
    const canvasHost = canvasHostRef.current;
    if (!host || !canvasHost) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => setWebglUnavailable(true));
      return;
    }

    if (!renderer.getContext()) {
      queueMicrotask(() => setWebglUnavailable(true));
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;

    canvasHost.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c1119, 0.056);

    const camera = new THREE.PerspectiveCamera(35, 16 / 10, 0.1, 60);
    camera.position.set(4.75, 2.55, 6.75);
    camera.lookAt(0.08, 0.1, 0.16);

    // Balanced Dusk Abidjan Key + Front Harbor Fill + Maritime Sky Rim
    const hemi = new THREE.HemisphereLight(0x9ebbe8, 0x121926, 1.25);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffb44d, 3.0);
    keyLight.position.set(5.8, 7.2, 5.4);
    scene.add(keyLight);

    const frontFill = new THREE.DirectionalLight(0x88b3ea, 1.35);
    frontFill.position.set(4.6, 2.6, 7.6);
    scene.add(frontFill);

    const rimLight = new THREE.DirectionalLight(0x4b85d6, 1.65);
    rimLight.position.set(-6.0, 4.4, -5.0);
    scene.add(rimLight);

    const interiorLight = new THREE.PointLight(0xffbe55, 0, 7.0, 1.2);
    interiorLight.position.set(0.0, 0.45, 1.15);
    scene.add(interiorLight);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    const bumpTex = createCorrugatedBumpTexture();

    // Quay Apron Platform + subtle port grid
    const floorGeo = trackGeo(new THREE.PlaneGeometry(24, 24));
    const floorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f1620,
        roughness: 0.7,
        metalness: 0.24,
      })
    );
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.04;
    scene.add(floorMesh);

    const grid = new THREE.GridHelper(16, 24, 0x3b5374, 0x202d40);
    grid.position.y = -1.03;
    scene.add(grid);

    // Master Container Group
    const containerGroup = new THREE.Group();
    containerGroup.position.set(0, -0.02, 0);
    scene.add(containerGroup);

    const L = 4.4;
    const H = 1.88;
    const W = 1.88;

    const steelMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2a4162,
        roughness: 0.42,
        metalness: 0.62,
        bumpMap: bumpTex,
        bumpScale: 0.045,
      })
    );

    const frameMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x364f75,
        roughness: 0.36,
        metalness: 0.78,
      })
    );

    const amberTrimMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe89b2d,
        roughness: 0.3,
        metalness: 0.4,
        emissive: 0x5c3604,
        emissiveIntensity: 0.45,
      })
    );

    const chromeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd0dcec,
        roughness: 0.22,
        metalness: 0.9,
      })
    );

    const floorInteriorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x362b1f,
        roughness: 0.84,
        metalness: 0.08,
      })
    );

    // Side Walls, Roof, Floor, Bulkhead
    const wallSideGeo = trackGeo(new THREE.BoxGeometry(0.06, H, L));
    const wallLeft = new THREE.Mesh(wallSideGeo, steelMat);
    wallLeft.position.set(-W / 2, 0, 0);
    containerGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(wallSideGeo, steelMat);
    wallRight.position.set(W / 2, 0, 0);
    containerGroup.add(wallRight);

    const roofGeo = trackGeo(new THREE.BoxGeometry(W + 0.08, 0.07, L));
    const roof = new THREE.Mesh(roofGeo, steelMat);
    roof.position.set(0, H / 2, 0);
    containerGroup.add(roof);

    const bedGeo = trackGeo(new THREE.BoxGeometry(W, 0.09, L));
    const bed = new THREE.Mesh(bedGeo, floorInteriorMat);
    bed.position.set(0, -H / 2, 0);
    containerGroup.add(bed);

    const bulkheadGeo = trackGeo(new THREE.BoxGeometry(W, H, 0.07));
    const bulkhead = new THREE.Mesh(bulkheadGeo, steelMat);
    bulkhead.position.set(0, 0, -L / 2);
    containerGroup.add(bulkhead);

    // Corner Posts + Upper Amber Horizon Stripe
    const postGeo = trackGeo(new THREE.BoxGeometry(0.11, H + 0.08, 0.11));
    [
      [-W / 2, -L / 2],
      [W / 2, -L / 2],
      [-W / 2, L / 2],
      [W / 2, L / 2],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(px, 0, pz);
      containerGroup.add(post);
    });

    const stripeGeo = trackGeo(new THREE.BoxGeometry(0.075, 0.12, L - 0.14));
    const stripeR = new THREE.Mesh(stripeGeo, amberTrimMat);
    stripeR.position.set(W / 2 + 0.012, H / 2 - 0.14, 0);
    containerGroup.add(stripeR);

    const stripeL = new THREE.Mesh(stripeGeo, amberTrimMat);
    stripeL.position.set(-W / 2 - 0.012, H / 2 - 0.14, 0);
    containerGroup.add(stripeL);

    // Palletized Export Cartons Inside Container Bay (highlighted as doors swing open)
    const cartonGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.52, 0.72));
    const cartonMatA = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd5a163,
        roughness: 0.74,
        metalness: 0.04,
      })
    );
    const cartonMatB = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xb68249,
        roughness: 0.78,
        metalness: 0.04,
      })
    );
    const tapeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe89b2d,
        roughness: 0.4,
        metalness: 0.25,
      })
    );
    const strapGeo = trackGeo(new THREE.BoxGeometry(0.7, 0.04, 0.74));

    const cartonCoords: Array<[number, number, number]> = [
      [-0.42, -0.61, 1.48],
      [0.42, -0.61, 1.44],
      [-0.4, -0.06, 1.4],
      [0.42, -0.06, 1.38],
      [-0.4, -0.61, 0.56],
      [0.4, -0.61, 0.58],
    ];
    cartonCoords.forEach(([cx, cy, cz], idx) => {
      const box = new THREE.Mesh(cartonGeo, idx % 2 === 0 ? cartonMatA : cartonMatB);
      box.position.set(cx, cy, cz);
      containerGroup.add(box);
      const strap = new THREE.Mesh(strapGeo, tapeMat);
      strap.position.set(cx, cy + 0.05, cz);
      containerGroup.add(strap);
    });

    // Twin Articulated Rear Doors (pivot at outer rear corners z = +L/2)
    const doorW = W / 2 - 0.03;
    const doorGeo = trackGeo(new THREE.BoxGeometry(doorW, H - 0.12, 0.055));
    const lockRodGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, H - 0.22, 10));

    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-W / 2 + 0.02, 0, L / 2);
    const leftDoorMesh = new THREE.Mesh(doorGeo, steelMat);
    leftDoorMesh.position.set(doorW / 2, 0, 0);
    leftDoorPivot.add(leftDoorMesh);
    const leftRod = new THREE.Mesh(lockRodGeo, chromeMat);
    leftRod.position.set(doorW * 0.75, 0, 0.044);
    leftDoorPivot.add(leftRod);
    containerGroup.add(leftDoorPivot);

    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(W / 2 - 0.02, 0, L / 2);
    const rightDoorMesh = new THREE.Mesh(doorGeo, steelMat);
    rightDoorMesh.position.set(-doorW / 2, 0, 0);
    rightDoorPivot.add(rightDoorMesh);
    const rightRod = new THREE.Mesh(lockRodGeo, chromeMat);
    rightRod.position.set(-doorW * 0.75, 0, 0.044);
    rightDoorPivot.add(rightRod);
    containerGroup.add(rightDoorPivot);

    // Overhead Corridor Arc (China/Turkey -> Abidjan Port Beacon safely inside canvas bounds)
    const abidjanPt = new THREE.Vector3(1.55, 0.36, 1.72);
    const arcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.9, 0.85, -1.65),
      new THREE.Vector3(-1.1, 2.25, -0.45),
      new THREE.Vector3(0.55, 1.9, 0.75),
      abidjanPt,
    ]);
    const arcGeo = trackGeo(new THREE.TubeGeometry(arcCurve, 48, 0.019, 8, false));
    const arcMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe89b2d,
        transparent: true,
        opacity: 0.86,
      })
    );
    scene.add(new THREE.Mesh(arcGeo, arcMat));

    const secondaryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.3, 0.45, -2.1),
      new THREE.Vector3(-0.25, 1.78, -0.8),
      abidjanPt,
    ]);
    const secGeo = trackGeo(
      new THREE.TubeGeometry(secondaryCurve, 40, 0.012, 6, false)
    );
    const secMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x6296df,
        transparent: true,
        opacity: 0.52,
      })
    );
    scene.add(new THREE.Mesh(secGeo, secMat));

    const beaconGeo = trackGeo(new THREE.SphereGeometry(0.068, 16, 16));
    const beaconMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xffcd78 })
    );
    const arcBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    scene.add(arcBeacon);

    const hubRingGeo = trackGeo(new THREE.RingGeometry(0.14, 0.19, 32));
    const hubRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xe89b2d,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    const abidjanRing = new THREE.Mesh(hubRingGeo, hubRingMat);
    abidjanRing.position.set(1.55, -0.92, 1.72);
    abidjanRing.rotation.x = -Math.PI / 2;
    scene.add(abidjanRing);

    const resize = () => {
      if (!canvasHost || !renderer) return;
      const rect = canvasHost.getBoundingClientRect();
      const w = Math.max(rect.width, 280);
      const h = Math.max(rect.height, 130);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvasHost);

    // Pointer tilt (gated to fine hover pointer & never captures cursor)
    let ptrX = 0;
    let ptrY = 0;
    let curPtrX = 0;
    let curPtrY = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (!finePointer || reducedMotion || e.pointerType !== "mouse") return;
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      ptrX = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      ptrY = THREE.MathUtils.clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
    };
    host.addEventListener("pointermove", onPointerMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(host);

    let currentAngle = TARGET_DOOR_ANGLE[statusRef.current];
    let currentYaw = TARGET_YAW[statusRef.current];
    let clock = 0;
    let lastTime = performance.now();
    let frameId = 0;
    let lastVerifyState = "";

    const renderFrame = (now: number) => {
      frameId = requestAnimationFrame(renderFrame);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!visible || !renderer) return;

      const actEl = actRef.current;
      const pRaw = actEl
        ? parseFloat(actEl.style.getPropertyValue("--sc-p") || "0") || 0
        : 0;
      const scrollP = THREE.MathUtils.clamp(pRaw, 0, 1);

      const st = statusRef.current;
      // Since Act 4 syncs active status to scroll unless pinned manually, lean into
      // TARGET_DOOR_ANGLE[st] & TARGET_YAW[st] plus smooth continuous scroll scrub
      const scrollDoorBoost = Math.pow(scrollP, 1.05) * 1.9;
      const targetDoor = Math.max(TARGET_DOOR_ANGLE[st], scrollDoorBoost);
      const scrollYaw = -0.34 + scrollP * 0.76;
      const targetYaw = THREE.MathUtils.lerp(scrollYaw, TARGET_YAW[st], 0.65);

      const lerpSpeed = reducedMotion ? 1 : 0.11;
      currentAngle += (targetDoor - currentAngle) * lerpSpeed;
      currentYaw += (targetYaw - currentYaw) * lerpSpeed;

      curPtrX += (ptrX - curPtrX) * 0.07;
      curPtrY += (ptrY - curPtrY) * 0.07;

      containerGroup.rotation.y = currentYaw + (reducedMotion ? 0 : curPtrX * 0.14);
      containerGroup.rotation.x = reducedMotion ? 0 : -curPtrY * 0.05;

      // Swing rear doors wide open away from container frame toward camera
      leftDoorPivot.rotation.y = -currentAngle;
      rightDoorPivot.rotation.y = currentAngle;

      // Interior inspection tungsten flood illuminates crates proportionally with opening
      interiorLight.intensity = Math.min(6.5, (currentAngle / 1.8) * 6.5);

      // Animate corridor beacon continuously
      if (!reducedMotion) {
        clock += dt * 0.34;
      }
      const routeT = reducedMotion
        ? (STATUS_CODE_INDEX[st] + 1) * 0.24
        : (scrollP * 0.68 + (clock % 1)) % 1;
      const pt = arcCurve.getPointAt(THREE.MathUtils.clamp(routeT, 0.01, 0.99));
      arcBeacon.position.copy(pt);

      // Frame cleanly inside viewport at both desktop and compact mobile aspect ratios
      camera.position.x = 4.75 - curPtrX * 0.22;
      camera.position.y = 2.55 - curPtrY * 0.14;
      camera.lookAt(0.08, 0.1, 0.16);

      // Publish live verification signature for automated dead-scroll verification
      const pBucket = Math.round(scrollP * 40);
      const verifyKey = `3d:${st}:${pBucket}:${Math.round(currentAngle * 20)}`;
      if (verifyKey !== lastVerifyState) {
        lastVerifyState = verifyKey;
        host.setAttribute("data-sc-verify-state", verifyKey);
      }

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      bumpTex.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === canvasHost) {
          canvasHost.removeChild(renderer.domElement);
        }
      }
    };
  }, [actRef]);

  return (
    <div
      ref={hostRef}
      data-sc-verify-state={`3d:${status}:0`}
      className="relative w-full h-full min-h-[130px] rounded-[14px] overflow-hidden border border-[color:var(--sc-hairline)] bg-[#0c1119]"
    >
      {/* Clean Three.js Canvas Host */}
      <div
        ref={canvasHostRef}
        className={`w-full h-full min-h-[130px] ${
          webglUnavailable ? "hidden" : "block"
        }`}
        aria-label="Visualisation 3D interactive d'un conteneur de groupage TrackCargo CI"
      />

      {/* Graceful Static Fallback Diagram if WebGL unavailable */}
      {webglUnavailable && (
        <div className="w-full h-full min-h-[130px] flex flex-col items-center justify-center p-5 text-center bg-[#0c1119]">
          <svg
            viewBox="0 0 640 340"
            className="w-full max-w-lg"
            role="img"
            aria-label="Coupe architecturale du conteneur ISO TrackCargo CI"
          >
            <defs>
              <linearGradient id="tcBayGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#121a26" />
                <stop offset="100%" stopColor="#e89b2d" stopOpacity="0.28" />
              </linearGradient>
            </defs>
            <path
              d="M60 220 Q220 40 530 140"
              fill="none"
              stroke="#e89b2d"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <rect
              x="140"
              y="120"
              width="340"
              height="150"
              rx="6"
              fill="url(#tcBayGlow)"
              stroke="#4d607c"
              strokeWidth="2"
            />
            <rect x="165" y="205" width="76" height="48" fill="#c2935c" />
            <rect x="252" y="205" width="76" height="48" fill="#a77845" />
            <rect x="165" y="150" width="76" height="48" fill="#c2935c" />
            <rect x="466" y="128" width="12" height="134" fill="#e89b2d" />
            <circle cx="530" cy="140" r="7" fill="#e89b2d" />
          </svg>
          <p className="mt-3 text-xs font-mono text-[color:var(--sc-ink-soft)]">
            Conteneur 40 pieds synchronisé ({status})
          </p>
        </div>
      )}
    </div>
  );
}

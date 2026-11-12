"use client";

import { useEffect, useRef, useState } from "react";
import {
  createCardboardTextures,
  createCoastalStudioEnvironment,
  createGroundShadowTexture,
  createShippingLabelTexture,
  createWoodDeckTexture,
  PBRTextureSet,
} from "@/lib/three-studio";
import { createSteelLiveryTextures } from "@/lib/three-studio";

export type CorridorId = "yiwu_sea" | "canton_air" | "istanbul_dubai";

interface ContainerStage3DProps {
  className?: string;
  corridor?: CorridorId;
  activeStep?: string;
}

interface CorridorLook {
  hullHex: string;
  doorColor: number;
  accentHex: string;
  serial: string;
  spec: string;
  metalness: number;
  roughness: number;
  brushed: boolean;
  isAirUld: boolean;
}

const CORRIDOR_LOOKS: Record<CorridorId, CorridorLook> = {
  yiwu_sea: {
    hullHex: "#153766",
    doorColor: 0xc9410e,
    accentHex: "#c9410e",
    serial: "TRCK 409281 0",
    spec: "MAX GROSS 32 500 KG · 45G1",
    metalness: 0.45,
    roughness: 0.38,
    brushed: false,
    isAirUld: false,
  },
  canton_air: {
    hullHex: "#d7dfe8",
    doorColor: 0xc9410e,
    accentHex: "#c9410e",
    serial: "AKE 48210 CI",
    spec: "FRET AÉRIEN · AÉROPORT FHB",
    metalness: 0.84,
    roughness: 0.24,
    brushed: true,
    isAirUld: true,
  },
  istanbul_dubai: {
    hullHex: "#212b38",
    doorColor: 0xd16024,
    accentHex: "#d16024",
    serial: "TCGO 712045 4",
    spec: "LOT NÉGOCE · ISTANBUL / DUBAÏ",
    metalness: 0.52,
    roughness: 0.34,
    brushed: false,
    isAirUld: false,
  },
};

export default function ContainerStage3D({
  className = "",
  corridor = "yiwu_sea",
  activeStep = "EN_TRANSIT",
}: ContainerStage3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const corridorRef = useRef<CorridorId>(corridor);
  const stepRef = useRef<string>(activeStep);
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    corridorRef.current = corridor;
  }, [corridor]);

  useEffect(() => {
    stepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityObserver: IntersectionObserver | null = null;
    let isVisible = true;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const disposables: Array<{ dispose: () => void }> = [];
    const liveryCache: Partial<Record<CorridorId, PBRTextureSet>> = {};

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const getScrollProgress = () => {
      const act = container.closest("[data-sc-act]") as HTMLElement | null;
      if (!act) return 0;
      const val = getComputedStyle(act).getPropertyValue("--sc-p").trim();
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (prefersReduced || e.pointerType !== "mouse") return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    import("three")
      .then((THREE) => {
        if (disposed || !container) return;

        const w = Math.max(container.clientWidth, 300);
        const h = Math.max(container.clientHeight, 240);

        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          });
        } catch {
          setWebglReady(false);
          return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.06;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";
        container.replaceChildren();
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();

        // Procedural Coastal Daylight HDRI for realistic metallic & specular reflections
        const studioEnv = createCoastalStudioEnvironment(THREE, renderer);
        disposables.push(studioEnv);
        scene.environment = studioEnv.texture;

        const isNarrow = w < 520;
        const fov = w / h > 1.55 ? 29 : isNarrow ? 34 : 28;
        const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
        camera.position.set(
          isNarrow ? 7.65 : 7.55,
          isNarrow ? 2.6 : 2.38,
          isNarrow ? 8.9 : 8.45
        );
        camera.lookAt(0.12, isNarrow ? 0.02 : -0.04, 0);

        const hemi = new THREE.HemisphereLight(0xf2f7ff, 0xd8cfc2, 0.85);
        scene.add(hemi);

        const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.5);
        sunLight.position.set(8.5, 12.5, 9.0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(1024, 1024);
        sunLight.shadow.camera.near = 2;
        sunLight.shadow.camera.far = 28;
        sunLight.shadow.camera.left = -5.5;
        sunLight.shadow.camera.right = 5.5;
        sunLight.shadow.camera.top = 5.5;
        sunLight.shadow.camera.bottom = -5.5;
        sunLight.shadow.bias = -0.0004;
        sunLight.shadow.radius = 3.5;
        scene.add(sunLight);

        const skyRim = new THREE.DirectionalLight(0xa8cbff, 0.95);
        skyRim.position.set(-8, 5, -6);
        scene.add(skyRim);

        // Grounded Shadow Receiver + Soft Ambient Occlusion Contact Decal
        const groundY = -1.06;
        const shadowFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(24, 24),
          new THREE.ShadowMaterial({ opacity: 0.2 })
        );
        shadowFloor.rotation.x = -Math.PI / 2;
        shadowFloor.position.y = groundY;
        shadowFloor.receiveShadow = true;
        scene.add(shadowFloor);

        const aoTex = createGroundShadowTexture(THREE);
        disposables.push(aoTex);
        const aoPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(7.2, 4.2),
          new THREE.MeshBasicMaterial({
            map: aoTex,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
          })
        );
        aoPlane.rotation.x = -Math.PI / 2;
        aoPlane.position.set(0.15, groundY + 0.004, 0);
        scene.add(aoPlane);

        const cargoRig = new THREE.Group();
        cargoRig.position.y = 0.02;
        scene.add(cargoRig);

        (Object.keys(CORRIDOR_LOOKS) as CorridorId[]).forEach((cid) => {
          const look = CORRIDOR_LOOKS[cid];
          const texSet = createSteelLiveryTextures(THREE, {
            baseHex: look.hullHex,
            accentHex: look.accentHex,
            serialCode: look.serial,
            specLine: look.spec,
            brushedAluminum: look.brushed,
          });
          liveryCache[cid] = texSet;
          disposables.push(texSet);
        });

        const initialLook = CORRIDOR_LOOKS[corridorRef.current];
        const initialLivery = liveryCache[corridorRef.current]!;

        const hullMat = new THREE.MeshStandardMaterial({
          map: initialLivery.map,
          bumpMap: initialLivery.bumpMap,
          bumpScale: 0.014,
          roughnessMap: initialLivery.roughnessMap,
          metalness: initialLook.metalness,
          roughness: initialLook.roughness,
          envMapIntensity: 1.05,
        });

        const ribMat = new THREE.MeshStandardMaterial({
          color: initialLook.hullHex,
          metalness: 0.36,
          roughness: 0.48,
          envMapIntensity: 0.92,
        });

        const castSteelMat = new THREE.MeshStandardMaterial({
          color: 0x202938,
          metalness: 0.78,
          roughness: 0.34,
          envMapIntensity: 1.05,
        });

        const steelFrameMat = new THREE.MeshStandardMaterial({
          color: 0x111722,
          metalness: 0.65,
          roughness: 0.36,
          envMapIntensity: 1.0,
        });

        const doorMat = new THREE.MeshStandardMaterial({
          color: initialLook.doorColor,
          metalness: 0.38,
          roughness: 0.32,
          envMapIntensity: 1.1,
        });

        const chromeMat = new THREE.MeshStandardMaterial({
          color: 0xe8edf3,
          metalness: 0.92,
          roughness: 0.16,
          envMapIntensity: 1.35,
        });

        const rubberSealMat = new THREE.MeshStandardMaterial({
          color: 0x10141b,
          metalness: 0.05,
          roughness: 0.85,
        });

        const woodTex = createWoodDeckTexture(THREE);
        disposables.push(woodTex);
        const deckMat = new THREE.MeshStandardMaterial({
          map: woodTex.map,
          bumpMap: woodTex.bumpMap,
          bumpScale: 0.02,
          roughness: 0.78,
          metalness: 0.04,
        });

        const L = 4.6;
        const H = 2.08;
        const D = 1.98;
        const wall = 0.06;

        const addMesh = (
          geo: import("three").BufferGeometry,
          mat: import("three").Material,
          x: number,
          y: number,
          z: number,
          parent: import("three").Object3D = cargoRig
        ) => {
          const m = new THREE.Mesh(geo, mat);
          m.position.set(x, y, z);
          m.castShadow = true;
          m.receiveShadow = true;
          parent.add(m);
          return m;
        };

        // 1. ISO Maritime / Bonded Steel Container Group
        const isoGroup = new THREE.Group();
        cargoRig.add(isoGroup);

        addMesh(new THREE.BoxGeometry(L, wall, D), steelFrameMat, 0, -H / 2 + wall / 2, 0, isoGroup);
        addMesh(new THREE.BoxGeometry(L, wall, D), ribMat, 0, H / 2 - wall / 2, 0, isoGroup);
        addMesh(new THREE.BoxGeometry(wall, H, D), hullMat, -L / 2 + wall / 2, 0, 0, isoGroup);
        addMesh(new THREE.BoxGeometry(L, H - 0.14, wall), hullMat, 0, 0, -D / 2 + wall / 2, isoGroup);
        addMesh(new THREE.BoxGeometry(L, H - 0.14, wall), hullMat, 0, 0, D / 2 - wall / 2, isoGroup);
        // Smooth flush nameplate sign mounted over front ribs so ISO code reads cleanly
        addMesh(new THREE.BoxGeometry(1.75, 0.42, 0.016), hullMat, -0.85, 0.36, D / 2 + 0.048, isoGroup);
        addMesh(new THREE.BoxGeometry(L - 0.16, 0.03, D - 0.16), deckMat, 0, -H / 2 + wall + 0.015, 0, isoGroup);

        const ribShape = new THREE.Shape();
        ribShape.moveTo(0, 0);
        ribShape.lineTo(0.028, 0.045);
        ribShape.lineTo(0.088, 0.045);
        ribShape.lineTo(0.116, 0);
        ribShape.closePath();

        const sideRibGeo = new THREE.ExtrudeGeometry(ribShape, {
          depth: H - 0.24,
          bevelEnabled: true,
          bevelThickness: 0.004,
          bevelSize: 0.004,
          bevelSegments: 2,
        });
        sideRibGeo.rotateX(-Math.PI / 2);

        const roofRibGeo = new THREE.ExtrudeGeometry(ribShape, {
          depth: D - 0.24,
          bevelEnabled: true,
          bevelThickness: 0.003,
          bevelSize: 0.003,
          bevelSegments: 2,
        });

        const ribCount = 17;
        for (let i = 0; i < ribCount; i++) {
          const rx = -L / 2 + 0.34 + (i / (ribCount - 1)) * (L - 0.72);
          const ribFront = new THREE.Mesh(sideRibGeo, ribMat);
          ribFront.position.set(rx - 0.058, -(H - 0.24) / 2, D / 2 - 0.002);
          ribFront.castShadow = true;
          ribFront.receiveShadow = true;
          isoGroup.add(ribFront);

          const ribBack = new THREE.Mesh(sideRibGeo, ribMat);
          ribBack.rotation.y = Math.PI;
          ribBack.position.set(rx + 0.058, -(H - 0.24) / 2, -D / 2 + 0.002);
          ribBack.castShadow = true;
          ribBack.receiveShadow = true;
          isoGroup.add(ribBack);

          const ribRoof = new THREE.Mesh(roofRibGeo, ribMat);
          ribRoof.position.set(rx - 0.058, H / 2 - 0.002, -(D - 0.24) / 2);
          ribRoof.castShadow = true;
          ribRoof.receiveShadow = true;
          isoGroup.add(ribRoof);
        }

        addMesh(new THREE.BoxGeometry(L, 0.08, 0.08), steelFrameMat, 0, H / 2 - 0.04, D / 2 - 0.03, isoGroup);
        addMesh(new THREE.BoxGeometry(L, 0.08, 0.08), steelFrameMat, 0, H / 2 - 0.04, -D / 2 + 0.03, isoGroup);
        addMesh(new THREE.BoxGeometry(L, 0.11, 0.09), steelFrameMat, 0, -H / 2 + 0.055, D / 2 - 0.03, isoGroup);
        addMesh(new THREE.BoxGeometry(L, 0.11, 0.09), steelFrameMat, 0, -H / 2 + 0.055, -D / 2 + 0.03, isoGroup);
        [-0.75, 0.75].forEach((fx) => {
          addMesh(new THREE.BoxGeometry(0.32, 0.065, D + 0.03), rubberSealMat, fx, -H / 2 + 0.055, 0, isoGroup);
        });

        const cornerXZ: [number, number][] = [
          [-L / 2 + 0.055, -D / 2 + 0.055],
          [-L / 2 + 0.055, D / 2 - 0.055],
          [L / 2 - 0.055, -D / 2 + 0.055],
          [L / 2 - 0.055, D / 2 - 0.055],
        ];
        cornerXZ.forEach(([cx, cz]) => {
          addMesh(new THREE.BoxGeometry(0.11, H + 0.01, 0.11), steelFrameMat, cx, 0, cz, isoGroup);
          addMesh(new THREE.BoxGeometry(0.145, 0.11, 0.145), castSteelMat, cx, H / 2 - 0.025, cz, isoGroup);
          addMesh(new THREE.BoxGeometry(0.145, 0.11, 0.145), castSteelMat, cx, -H / 2 + 0.025, cz, isoGroup);
        });

        const leftDoorPivot = new THREE.Group();
        leftDoorPivot.position.set(L / 2 - 0.03, 0, -D / 2 + 0.045);
        isoGroup.add(leftDoorPivot);

        const rightDoorPivot = new THREE.Group();
        rightDoorPivot.position.set(L / 2 - 0.03, 0, D / 2 - 0.045);
        isoGroup.add(rightDoorPivot);

        const doorHalfW = D / 2 - 0.055;
        addMesh(new THREE.BoxGeometry(0.055, H - 0.14, doorHalfW), doorMat, 0, 0, doorHalfW / 2, leftDoorPivot);
        addMesh(new THREE.BoxGeometry(0.055, H - 0.14, doorHalfW), doorMat, 0, 0, -doorHalfW / 2, rightDoorPivot);

        addMesh(new THREE.BoxGeometry(0.064, H - 0.15, 0.025), rubberSealMat, 0, 0, doorHalfW - 0.01, leftDoorPivot);
        addMesh(new THREE.BoxGeometry(0.064, H - 0.15, 0.025), rubberSealMat, 0, 0, -doorHalfW + 0.01, rightDoorPivot);

        [0.24, 0.58].forEach((offset) => {
          addMesh(
            new THREE.CylinderGeometry(0.018, 0.018, H - 0.22, 12),
            chromeMat,
            0.042,
            0,
            offset,
            leftDoorPivot
          );
          addMesh(new THREE.BoxGeometry(0.04, 0.11, 0.045), chromeMat, 0.055, -0.35, offset, leftDoorPivot);

          addMesh(
            new THREE.CylinderGeometry(0.018, 0.018, H - 0.22, 12),
            chromeMat,
            0.042,
            0,
            -offset,
            rightDoorPivot
          );
          addMesh(new THREE.BoxGeometry(0.04, 0.11, 0.045), chromeMat, 0.055, -0.35, -offset, rightDoorPivot);
        });

        // 2. Brushed Aluminum AKE Air Freight ULD Group
        const uldGroup = new THREE.Group();
        uldGroup.visible = initialLook.isAirUld;
        cargoRig.add(uldGroup);

        const uldProfile = new THREE.Shape();
        uldProfile.moveTo(-1.35, -0.98);
        uldProfile.lineTo(1.15, -0.98);
        uldProfile.lineTo(1.75, -0.35);
        uldProfile.lineTo(1.75, 0.98);
        uldProfile.lineTo(-1.65, 0.98);
        uldProfile.lineTo(-1.65, -0.98);
        uldProfile.closePath();

        const uldExtrudeGeo = new THREE.ExtrudeGeometry(uldProfile, {
          depth: 1.9,
          bevelEnabled: true,
          bevelThickness: 0.025,
          bevelSize: 0.025,
          bevelSegments: 3,
        });
        uldExtrudeGeo.translate(0, 0, -0.95);
        const uldBody = new THREE.Mesh(uldExtrudeGeo, hullMat);
        uldBody.castShadow = true;
        uldBody.receiveShadow = true;
        uldGroup.add(uldBody);

        addMesh(new THREE.BoxGeometry(3.65, 0.09, 2.08), chromeMat, 0.05, -0.98, 0, uldGroup);
        addMesh(new THREE.BoxGeometry(0.07, 1.96, 1.96), steelFrameMat, 1.73, 0, 0, uldGroup);
        for (let sy = -0.65; sy <= 0.65; sy += 0.32) {
          addMesh(new THREE.BoxGeometry(0.03, 0.045, 1.82), doorMat, 1.77, sy, 0, uldGroup);
        }
        for (let sz = -0.68; sz <= 0.68; sz += 0.34) {
          addMesh(new THREE.BoxGeometry(0.03, 1.84, 0.045), doorMat, 1.77, 0, sz, uldGroup);
        }

        // 3. Palletized Cartons Bay
        const parcelBay = new THREE.Group();
        cargoRig.add(parcelBay);

        const kraftTex = createCardboardTextures(THREE);
        disposables.push(kraftTex);

        const cartonMat = new THREE.MeshStandardMaterial({
          map: kraftTex.map,
          bumpMap: kraftTex.bumpMap,
          bumpScale: 0.015,
          roughnessMap: kraftTex.roughnessMap,
          roughness: 0.85,
          metalness: 0.02,
        });

        const tapeMat = new THREE.MeshPhysicalMaterial({
          color: 0xd8b27c,
          roughness: 0.14,
          metalness: 0.05,
          clearcoat: 0.9,
          clearcoatRoughness: 0.1,
        });

        const labelTex = createShippingLabelTexture(
          THREE,
          "TC-8841",
          "CHINE -> ABIDJAN",
          "18.5 KG · LOT 42"
        );
        disposables.push(labelTex);
        const labelMat = new THREE.MeshStandardMaterial({
          map: labelTex,
          roughness: 0.55,
        });

        addMesh(new THREE.BoxGeometry(3.15, 0.06, 1.48), deckMat, 0.35, -H / 2 + 0.13, 0, parcelBay);
        [-0.55, 0, 0.55].forEach((pz) => {
          addMesh(new THREE.BoxGeometry(3.1, 0.06, 0.14), deckMat, 0.35, -H / 2 + 0.08, pz, parcelBay);
        });

        const boxSpecs: Array<[number, number, number, number, number, number, boolean]> = [
          [-0.65, -0.46, -0.34, 0.86, 0.68, 0.68, false],
          [0.32, -0.46, -0.34, 0.88, 0.68, 0.68, false],
          [1.26, -0.45, -0.34, 0.84, 0.7, 0.68, true],
          [-0.65, -0.46, 0.38, 0.86, 0.68, 0.66, false],
          [0.32, -0.46, 0.38, 0.88, 0.68, 0.66, false],
          [1.26, -0.43, 0.38, 0.86, 0.74, 0.66, true],
          [-0.12, 0.26, 0.02, 0.95, 0.66, 1.18, false],
          [0.95, 0.28, 0.02, 0.92, 0.68, 1.16, true],
        ];

        boxSpecs.forEach(([bx, by, bz, bw, bh, bd, showLabel]) => {
          addMesh(new THREE.BoxGeometry(bw, bh, bd), cartonMat, bx, by, bz, parcelBay);
          addMesh(new THREE.BoxGeometry(bw + 0.008, 0.014, 0.11), tapeMat, bx, by + bh / 2 + 0.004, bz, parcelBay);
          addMesh(new THREE.BoxGeometry(0.025, bh + 0.012, bd + 0.012), steelFrameMat, bx - bw * 0.22, by, bz, parcelBay);
          addMesh(new THREE.BoxGeometry(0.025, bh + 0.012, bd + 0.012), steelFrameMat, bx + bw * 0.22, by, bz, parcelBay);
          if (showLabel) {
            addMesh(new THREE.BoxGeometry(0.012, 0.22, 0.34), labelMat, bx + bw / 2 + 0.006, by + 0.08, bz, parcelBay);
          }
        });

        container.addEventListener("pointermove", onPointerMove, { passive: true });
        container.addEventListener("pointerleave", onPointerLeave, { passive: true });

        resizeObserver = new ResizeObserver(() => {
          if (!renderer || !container) return;
          const nw = Math.max(container.clientWidth, 260);
          const nh = Math.max(container.clientHeight, 220);
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh, false);
        });
        resizeObserver.observe(container);

        visibilityObserver = new IntersectionObserver(
          (entries) => {
            isVisible = entries[0]?.isIntersecting ?? true;
          },
          { threshold: 0.05 }
        );
        visibilityObserver.observe(container);

        let lastCorridor = corridorRef.current;
        let t = 0;

        const renderFrame = () => {
          if (disposed) return;
          rafId = requestAnimationFrame(renderFrame);
          if (!isVisible || !renderer) return;

          if (!prefersReduced) {
            t += 0.014;
          }

          const curCorridor = corridorRef.current;
          const look = CORRIDOR_LOOKS[curCorridor];
          if (curCorridor !== lastCorridor) {
            lastCorridor = curCorridor;
            const livery = liveryCache[curCorridor];
            if (livery) {
              hullMat.map = livery.map;
              hullMat.bumpMap = livery.bumpMap;
              hullMat.roughnessMap = livery.roughnessMap;
              hullMat.metalness = look.metalness;
              hullMat.roughness = look.roughness;
              hullMat.needsUpdate = true;
            }
            doorMat.color.setHex(look.doorColor);
            ribMat.color.set(look.hullHex);
            ribMat.metalness = look.metalness;
            ribMat.roughness = look.roughness + 0.12;
            isoGroup.visible = !look.isAirUld;
            uldGroup.visible = look.isAirUld;
            parcelBay.visible = !look.isAirUld;
          }

          curX += (targetX - curX) * 0.065;
          curY += (targetY - curY) * 0.065;

          const p = getScrollProgress();
          const stepBoost =
            stepRef.current === "PRET_RETRAIT"
              ? 0.88
              : stepRef.current === "ARRIVEE_ABIDJAN"
              ? 0.62
              : 0.32;

          const doorProgress = prefersReduced
            ? 0.48
            : Math.min(1, Math.max(0.28, p * 1.3 + stepBoost * 0.35));
          const doorSwing = 0.24 + doorProgress * 1.42;

          leftDoorPivot.rotation.y = -doorSwing;
          rightDoorPivot.rotation.y = doorSwing;

          parcelBay.position.x = prefersReduced ? 0.25 : doorProgress * 0.58;

          const subtleBreath = prefersReduced ? 0 : Math.sin(t * 0.9) * 0.012;
          const corridorYaw =
            curCorridor === "canton_air"
              ? -0.22
              : curCorridor === "istanbul_dubai"
              ? -0.44
              : -0.34;

          cargoRig.rotation.y = corridorYaw + p * 0.42 + curX * 0.11;
          cargoRig.rotation.x = 0.03 - curY * 0.045;
          cargoRig.position.y = 0.02 + subtleBreath;

          aoPlane.rotation.z = -cargoRig.rotation.y * 0.2;

          renderer.render(scene, camera);
        };

        renderFrame();
      })
      .catch(() => {
        if (!disposed) setWebglReady(false);
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      disposables.forEach((d) => d.dispose());
      if (renderer) {
        renderer.dispose();
        renderer = null;
      }
    };
  }, []);

  return (
    <div
      className={`relative w-full h-full select-none ${className}`}
      data-corridor={corridor}
      data-step={activeStep}
    >
      {webglReady ? (
        <div
          ref={hostRef}
          className="w-full h-full min-h-[240px]"
          aria-label="Rendu 3D interactif de l'unité de fret TrackCargo CI"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4">
          <svg
            viewBox="0 0 420 260"
            className="w-full max-w-[380px] drop-shadow-xl"
            aria-label="Vue vectorielle de l'unité de fret TrackCargo CI"
          >
            <ellipse cx="210" cy="218" rx="154" ry="16" fill="rgba(13,19,29,0.16)" />
            <polygon
              points="74,95 270,58 348,88 348,188 152,216 74,184"
              fill="#153766"
              stroke="#0d131d"
              strokeWidth="2"
            />
            <polygon
              points="270,58 348,88 348,188 270,158"
              fill="#c9410e"
              stroke="#0d131d"
              strokeWidth="2"
            />
            <polygon
              points="74,95 270,58 348,88 152,124"
              fill="#1e4b8a"
              stroke="#0d131d"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

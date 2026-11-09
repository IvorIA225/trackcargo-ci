"use client";

import { useEffect, useRef, useState } from "react";

export type CorridorId = "yiwu_sea" | "canton_air" | "istanbul_dubai";

interface ContainerStage3DProps {
  className?: string;
  corridor?: CorridorId;
  activeStep?: string;
  compact?: boolean;
}

const CORRIDOR_COLORS: Record<
  CorridorId,
  {
    hull: number;
    door: number;
    beacon: number;
    badge: string;
    arcHeight: number;
  }
> = {
  yiwu_sea: {
    hull: 0x124eb5,
    door: 0xff5c1b,
    beacon: 0xff5c1b,
    badge: "YIWU · VRIDI 40FT",
    arcHeight: 2.35,
  },
  canton_air: {
    hull: 0x0a2e6e,
    door: 0x06b6d4,
    beacon: 0xff5c1b,
    badge: "CANTON · AIR CARGO",
    arcHeight: 3.15,
  },
  istanbul_dubai: {
    hull: 0x163d82,
    door: 0xf59e0b,
    beacon: 0x0ea5e9,
    badge: "DUBAÏ · ISTANBUL",
    arcHeight: 2.75,
  },
};

export default function ContainerStage3D({
  className = "",
  corridor = "yiwu_sea",
  activeStep = "EN_TRANSIT",
  compact = false,
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
    let hullMatRef: import("three").MeshStandardMaterial | null = null;
    let doorMatRef: import("three").MeshStandardMaterial | null = null;
    let beaconMatRef: import("three").MeshStandardMaterial | null = null;
    let arcCurvePts: import("three").QuadraticBezierCurve3 | null = null;
    let arcLineMesh: import("three").Mesh | null = null;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const getScrollProgress = () => {
      const stage = container.closest("[data-sc-act], [data-sc-stage]") as
        | HTMLElement
        | null;
      if (!stage) return 0.12;
      const val = getComputedStyle(stage).getPropertyValue("--sc-p").trim();
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.12;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (prefersReduced) return;
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
        const h = Math.max(container.clientHeight, 260);

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
        renderer.toneMappingExposure = 1.18;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";
        container.replaceChildren();
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();

        const isNarrow = w < 520;
        const fov = w / h > 1.55 ? 36 : isNarrow ? 38 : 33;
        const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
        camera.position.set(
          isNarrow ? 6.6 : 6.0,
          isNarrow ? 2.55 : 2.35,
          isNarrow ? 7.5 : 6.7
        );
        camera.lookAt(0, isNarrow ? 0.35 : 0.28, 0);

        // Bright Coastal 9am Three-Point Daylight Lighting
        const skyBounce = new THREE.HemisphereLight(0xf3f9ff, 0xe8dfd0, 1.9);
        scene.add(skyBounce);

        const sunLight = new THREE.DirectionalLight(0xfff8ed, 2.9);
        sunLight.position.set(7.5, 11.5, 8.5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(1024, 1024);
        sunLight.shadow.camera.near = 2;
        sunLight.shadow.camera.far = 26;
        sunLight.shadow.camera.left = -5;
        sunLight.shadow.camera.right = 5;
        sunLight.shadow.camera.top = 5;
        sunLight.shadow.camera.bottom = -5;
        sunLight.shadow.bias = -0.0005;
        scene.add(sunLight);

        const skyRim = new THREE.DirectionalLight(0x9ec5ff, 1.25);
        skyRim.position.set(-7, 4.5, -5.5);
        scene.add(skyRim);

        const apronFill = new THREE.PointLight(0xffffff, 1.1, 14);
        apronFill.position.set(2.5, -0.4, 5.2);
        scene.add(apronFill);

        // Soft cast shadow receiver onto sunlit quay floor
        const shadowFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(18, 18),
          new THREE.ShadowMaterial({ opacity: 0.22 })
        );
        shadowFloor.rotation.x = -Math.PI / 2;
        shadowFloor.position.y = -1.12;
        shadowFloor.receiveShadow = true;
        scene.add(shadowFloor);

        // Architectural Travertine Quay Plinth Base
        const plinthGroup = new THREE.Group();
        const plinthTop = new THREE.Mesh(
          new THREE.BoxGeometry(5.6, 0.14, 3.1),
          new THREE.MeshStandardMaterial({
            color: 0xf6f3ec,
            roughness: 0.72,
            metalness: 0.04,
          })
        );
        plinthTop.position.set(0, -1.04, 0);
        plinthTop.receiveShadow = true;
        plinthGroup.add(plinthTop);

        const plinthTrim = new THREE.Mesh(
          new THREE.BoxGeometry(5.72, 0.05, 3.22),
          new THREE.MeshStandardMaterial({
            color: 0x0a2e6e,
            roughness: 0.42,
            metalness: 0.2,
          })
        );
        plinthTrim.position.set(0, -1.11, 0);
        plinthGroup.add(plinthTrim);
        scene.add(plinthGroup);

        // Root CargoRig
        const cargoRig = new THREE.Group();
        cargoRig.position.y = 0.06;
        scene.add(cargoRig);

        const initialPalette = CORRIDOR_COLORS[corridorRef.current];

        const containerSteelMat = new THREE.MeshStandardMaterial({
          color: initialPalette.hull,
          metalness: 0.42,
          roughness: 0.36,
        });
        hullMatRef = containerSteelMat;

        const containerTrimMat = new THREE.MeshStandardMaterial({
          color: 0x09152b,
          metalness: 0.55,
          roughness: 0.34,
        });

        const doorPanelMat = new THREE.MeshStandardMaterial({
          color: initialPalette.door,
          metalness: 0.34,
          roughness: 0.3,
        });
        doorMatRef = doorPanelMat;

        const chromeMat = new THREE.MeshStandardMaterial({
          color: 0xf1f5f9,
          metalness: 0.85,
          roughness: 0.18,
        });

        const length = 4.4;
        const height = 2.02;
        const depth = 1.94;
        const wall = 0.065;

        const addBox = (
          bw: number,
          bh: number,
          bd: number,
          x: number,
          y: number,
          z: number,
          mat: import("three").Material,
          parent: import("three").Object3D = cargoRig
        ) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
          m.position.set(x, y, z);
          m.castShadow = true;
          m.receiveShadow = true;
          parent.add(m);
          return m;
        };

        // Main shell (Floor + Interior deck, Roof, Back wall, Left & Right Walls)
        addBox(length, wall, depth, 0, -height / 2 + wall / 2, 0, containerTrimMat);
        addBox(length, wall, depth, 0, height / 2 - wall / 2, 0, containerSteelMat);
        addBox(wall, height, depth, -length / 2 + wall / 2, 0, 0, containerSteelMat);
        addBox(length, height, wall, 0, 0, -depth / 2 + wall / 2, containerSteelMat);
        addBox(length, height, wall, 0, 0, depth / 2 - wall / 2, containerSteelMat);

        // Hardwood deck interior planks
        addBox(
          length - 0.16,
          0.03,
          depth - 0.16,
          0,
          -height / 2 + wall + 0.015,
          0,
          new THREE.MeshStandardMaterial({
            color: 0xcfa46f,
            roughness: 0.78,
            metalness: 0.02,
          })
        );

        // Crisp exterior corrugation ribs along both long sides + roof
        const ribCount = 15;
        for (let i = 0; i < ribCount; i++) {
          const rx = -length / 2 + 0.3 + (i / (ribCount - 1)) * (length - 0.6);
          addBox(0.085, height - 0.22, 0.045, rx, 0, depth / 2 + 0.02, containerSteelMat);
          addBox(0.085, height - 0.22, 0.045, rx, 0, -depth / 2 - 0.02, containerSteelMat);
          addBox(0.085, 0.035, depth - 0.22, rx, height / 2 + 0.015, 0, containerSteelMat);
        }

        // ISO Corner Posts + High-Contrast White/Orange Corner Castings
        const corners: [number, number][] = [
          [-length / 2 + 0.05, -depth / 2 + 0.05],
          [-length / 2 + 0.05, depth / 2 - 0.05],
          [length / 2 - 0.05, -depth / 2 + 0.05],
          [length / 2 - 0.05, depth / 2 - 0.05],
        ];
        corners.forEach(([cx, cz]) => {
          addBox(0.11, height + 0.02, 0.11, cx, 0, cz, containerTrimMat);
          addBox(0.135, 0.11, 0.135, cx, height / 2 - 0.03, cz, chromeMat);
          addBox(0.135, 0.11, 0.135, cx, -height / 2 + 0.03, cz, chromeMat);
        });

        // White architectural stencil stripe along top edge
        addBox(length - 0.45, 0.14, 0.02, 0, height / 2 - 0.24, depth / 2 + 0.046, chromeMat);
        addBox(0.95, 0.28, 0.022, -length / 2 + 0.72, 0.22, depth / 2 + 0.048, doorPanelMat);

        // Twin Hinged Signal Orange Rear Doors (+X opening)
        const leftDoorPivot = new THREE.Group();
        leftDoorPivot.position.set(length / 2 - 0.03, 0, -depth / 2 + 0.04);
        cargoRig.add(leftDoorPivot);

        const rightDoorPivot = new THREE.Group();
        rightDoorPivot.position.set(length / 2 - 0.03, 0, depth / 2 - 0.04);
        cargoRig.add(rightDoorPivot);

        const doorHalfDepth = depth / 2 - 0.05;
        const leftLeaf = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, height - 0.14, doorHalfDepth),
          doorPanelMat
        );
        leftLeaf.position.set(0, 0, doorHalfDepth / 2);
        leftLeaf.castShadow = true;
        leftDoorPivot.add(leftLeaf);

        const rightLeaf = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, height - 0.14, doorHalfDepth),
          doorPanelMat
        );
        rightLeaf.position.set(0, 0, -doorHalfDepth / 2);
        rightLeaf.castShadow = true;
        rightDoorPivot.add(rightLeaf);

        // Dual Stainless Locking Rods per Door Leaf
        [0.24, 0.56].forEach((offset) => {
          const rodL = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, height - 0.22, 10),
            chromeMat
          );
          rodL.position.set(0.042, 0, offset);
          leftDoorPivot.add(rodL);

          const rodR = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, height - 0.22, 10),
            chromeMat
          );
          rodR.position.set(0.042, 0, -offset);
          rightDoorPivot.add(rodR);
        });

        // Illuminated Sunlit Carton Pallet Bay inside Container
        const parcelBay = new THREE.Group();
        cargoRig.add(parcelBay);

        const crateLightMat = new THREE.MeshStandardMaterial({
          color: 0xe2bb87,
          roughness: 0.72,
          metalness: 0.03,
        });
        const crateWarmMat = new THREE.MeshStandardMaterial({
          color: 0xd09d62,
          roughness: 0.78,
          metalness: 0.02,
        });
        const parcelLabelCobalt = new THREE.MeshStandardMaterial({
          color: 0x0a2e6e,
          roughness: 0.35,
          metalness: 0.1,
        });
        const parcelLabelReady = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x065f46,
          emissiveIntensity: 0.22,
          roughness: 0.3,
        });

        // Heavy Pallet Base
        addBox(3.4, 0.09, 1.5, 0.15, -height / 2 + 0.14, 0, crateWarmMat, parcelBay);

        const specs = [
          [-0.9, -0.45, -0.35, 0.85, 0.7, 0.72],
          [0.05, -0.45, -0.35, 0.85, 0.7, 0.72],
          [1.0, -0.45, -0.35, 0.88, 0.72, 0.72],
          [-0.9, -0.45, 0.42, 0.85, 0.7, 0.68],
          [0.05, -0.45, 0.42, 0.85, 0.7, 0.68],
          [1.02, -0.42, 0.42, 0.9, 0.76, 0.68],
          [-0.45, 0.3, 0.02, 0.92, 0.65, 1.25],
          [0.62, 0.3, 0.02, 0.92, 0.65, 1.25],
          [1.56, -0.42, -0.1, 0.62, 0.74, 1.05],
        ];
        specs.forEach(([px, py, pz, sw, sh, sd], idx) => {
          addBox(
            sw,
            sh,
            sd,
            px,
            py,
            pz,
            idx % 2 === 0 ? crateLightMat : crateWarmMat,
            parcelBay
          );
          addBox(
            0.02,
            0.14,
            0.28,
            px + sw / 2 + 0.01,
            py + 0.08,
            pz,
            idx % 3 === 0 ? parcelLabelReady : parcelLabelCobalt,
            parcelBay
          );
        });

        // Elevated Daylight Route Arc & Live Freight Beacon above Container
        const arcGroup = new THREE.Group();
        cargoRig.add(arcGroup);

        const buildArc = (arcH: number) => {
          if (arcLineMesh) {
            arcGroup.remove(arcLineMesh);
            arcLineMesh.geometry.dispose();
          }
          arcCurvePts = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-2.1, height / 2 + 0.25, 0),
            new THREE.Vector3(0.05, height / 2 + arcH, 0.35),
            new THREE.Vector3(2.35, height / 2 + 0.28, 0)
          );
          const tubeGeo = new THREE.TubeGeometry(arcCurvePts, 44, 0.024, 8, false);
          arcLineMesh = new THREE.Mesh(
            tubeGeo,
            new THREE.MeshStandardMaterial({
              color: 0x0a2e6e,
              roughness: 0.28,
              metalness: 0.4,
            })
          );
          arcGroup.add(arcLineMesh);
        };
        buildArc(initialPalette.arcHeight);

        const beaconMat = new THREE.MeshStandardMaterial({
          color: initialPalette.beacon,
          emissive: initialPalette.beacon,
          emissiveIntensity: 0.38,
          roughness: 0.25,
          metalness: 0.2,
        });
        beaconMatRef = beaconMat;

        const beacon = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.14, 1),
          beaconMat
        );
        arcGroup.add(beacon);

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
            t += 0.016;
          }

          const curCorridor = corridorRef.current;
          const palette = CORRIDOR_COLORS[curCorridor];
          if (curCorridor !== lastCorridor) {
            lastCorridor = curCorridor;
            hullMatRef?.color.setHex(palette.hull);
            doorMatRef?.color.setHex(palette.door);
            beaconMatRef?.color.setHex(palette.beacon);
            beaconMatRef?.emissive.setHex(palette.beacon);
            buildArc(palette.arcHeight);
          }

          curX += (targetX - curX) * 0.07;
          curY += (targetY - curY) * 0.07;

          const p = getScrollProgress();
          const stepBoost =
            stepRef.current === "PRET_RETRAIT"
              ? 0.92
              : stepRef.current === "ARRIVEE_ABIDJAN"
              ? 0.72
              : 0.35;

          const doorProgress = prefersReduced
            ? 0.48
            : Math.min(1, Math.max(0.24, (p - 0.04) * 1.45 + stepBoost * 0.32));
          const doorSwing = 0.25 + doorProgress * 1.38;

          leftDoorPivot.rotation.y = -doorSwing;
          rightDoorPivot.rotation.y = doorSwing;

          parcelBay.position.x = prefersReduced
            ? 0.28
            : doorProgress * 0.65;

          const idleBob = prefersReduced ? 0 : Math.sin(t * 1.2) * 0.035;
          const corridorOffset =
            curCorridor === "canton_air"
              ? 0.16
              : curCorridor === "istanbul_dubai"
              ? -0.14
              : 0;

          cargoRig.rotation.y =
            -0.34 + corridorOffset + p * 0.56 + curX * 0.14;
          cargoRig.rotation.x = 0.04 - curY * 0.07;
          cargoRig.position.y = 0.06 + idleBob;

          plinthGroup.rotation.y = cargoRig.rotation.y * 0.38;

          if (arcCurvePts) {
            const beaconPos = prefersReduced
              ? 0.62
              : (0.15 + p * 0.75 + Math.sin(t * 0.7) * 0.06) % 1;
            const pt = arcCurvePts.getPoint(Math.max(0, Math.min(1, beaconPos)));
            beacon.position.copy(pt);
            beacon.rotation.y = t * 1.4;
          }

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
      if (renderer) {
        renderer.dispose();
        renderer = null;
      }
    };
  }, [compact]);

  const palette = CORRIDOR_COLORS[corridor];

  return (
    <div
      className={`relative w-full h-full select-none ${className}`}
      data-corridor={corridor}
      data-step={activeStep}
    >
      {webglReady ? (
        <div
          ref={hostRef}
          className="w-full h-full min-h-[260px]"
          aria-label="Maquette 3D interactive du conteneur TrackCargo CI"
        />
      ) : (
        /* Daylight Architectural Vector Blueprint Fallback when WebGL unavailable */
        <div className="w-full h-full flex items-center justify-center p-4">
          <svg
            viewBox="0 0 420 260"
            className="w-full max-w-[400px] drop-shadow-xl"
            aria-label="Schéma conteneur 3D TrackCargo CI"
          >
            <ellipse cx="210" cy="222" rx="158" ry="18" fill="rgba(10,46,110,0.14)" />
            <polygon
              points="74,95 270,58 348,88 348,188 152,216 74,184"
              fill="#124eb5"
              stroke="#09152b"
              strokeWidth="2.5"
            />
            <polygon
              points="270,58 348,88 348,188 270,158"
              fill="#ff5c1b"
              stroke="#09152b"
              strokeWidth="2.5"
            />
            <polygon
              points="74,95 270,58 348,88 152,124"
              fill="#1e63d6"
              stroke="#09152b"
              strokeWidth="2"
            />
            <path
              d="M 92 78 Q 210 10 318 68"
              fill="none"
              stroke="#ff5c1b"
              strokeWidth="3"
              strokeDasharray="6 5"
            />
            <circle cx="240" cy="36" r="7" fill="#ff5c1b" stroke="#09152b" strokeWidth="2" />
          </svg>
        </div>
      )}

      {/* Architectural Spec Plate pinned discretely at container base */}
      <div className="pointer-events-none absolute bottom-3 right-3 sm:bottom-5 sm:right-5 inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-white/92 backdrop-blur-xs border border-[#09152b]/18 shadow-sm text-[11px] font-mono font-bold text-[#09152b]">
        <span
          className="h-2 w-2 rounded-full bg-[#ff5c1b]"
          aria-hidden="true"
        />
        <span>{palette.badge}</span>
      </div>
    </div>
  );
}

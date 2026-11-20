"use client";

import { useEffect, useRef, useState } from "react";
import type { CorridorId } from "@/components/ContainerStage3D";

interface GlobeStage3DProps {
  corridor: CorridorId;
  activeStep?: string;
  className?: string;
}

interface HubCoord {
  id: string;
  name: string;
  lat: number;
  lon: number;
  corridor?: CorridorId;
}

const ABIDJAN_HUB: HubCoord = {
  id: "abidjan",
  name: "Abidjan · Vridi / FHB",
  lat: 5.32,
  lon: -4.02,
};

const ORIGIN_HUBS: HubCoord[] = [
  {
    id: "yiwu",
    name: "Yiwu & Ningbo",
    lat: 29.3,
    lon: 120.07,
    corridor: "yiwu_sea",
  },
  {
    id: "canton",
    name: "Guangzhou Baiyun",
    lat: 23.13,
    lon: 113.26,
    corridor: "canton_air",
  },
  {
    id: "istanbul",
    name: "Istanbul Laleli",
    lat: 41.01,
    lon: 28.97,
    corridor: "istanbul_dubai",
  },
  {
    id: "dubai",
    name: "Dubaï Deira",
    lat: 25.27,
    lon: 55.3,
    corridor: "istanbul_dubai",
  },
];

// Target globe Y rotation (radians) to center each corridor's arc (Abidjan <-> Asia/Middle East) dead-center toward +Z camera
const CORRIDOR_YAW: Record<CorridorId, number> = {
  yiwu_sea: -2.56,
  canton_air: -2.48,
  istanbul_dubai: -1.96,
};

const CORRIDOR_PITCH: Record<CorridorId, number> = {
  yiwu_sea: 0.28,
  canton_air: 0.26,
  istanbul_dubai: 0.34,
};

// Dense continental constellation patches (latMin, latMax, lonMin, lonMax, count)
const CONTINENT_PATCHES: Array<[number, number, number, number, number]> = [
  // West Africa & Gulf of Guinea coast (Côte d'Ivoire, Senegal, Ghana, Nigeria)
  [4.5, 16, -17, 10, 420],
  // Sahara & North Africa (Morocco, Algeria, Tunisia, Egypt)
  [16, 36, -12, 34, 460],
  // Central & East Africa (Cameroon, Kenya, Ethiopia, Tanzania)
  [-12, 15, 10, 50, 420],
  // Southern Africa
  [-34, -12, 14, 36, 260],
  // Madagascar
  [-25, -13, 44, 50, 65],
  // Western & Central Europe
  [36, 58, -9, 24, 480],
  // Turkey, Black Sea & Eastern Mediterranean (Istanbul hub)
  [35, 47, 24, 44, 340],
  // Arabian Peninsula & Persian Gulf (Dubai hub)
  [13, 33, 36, 58, 360],
  // Iran & Central Asia
  [26, 46, 48, 76, 280],
  // India & South Asia
  [8, 30, 70, 89, 360],
  // China Coastal & Industrial Heartland (Guangzhou, Yiwu, Ningbo, Shanghai)
  [20, 42, 102, 122, 640],
  // Southeast Asia & Malacca Strait
  [-6, 19, 98, 118, 280],
  // Japan & Korea
  [31, 42, 126, 141, 140],
  // Australia
  [-36, -14, 115, 151, 200],
  // South America East
  [-32, 8, -70, -35, 240],
];

export default function GlobeStage3D({
  corridor = "yiwu_sea",
  className = "",
}: GlobeStage3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const corridorRef = useRef<CorridorId>(corridor);
  const [webglReady, setWebglReady] = useState(true);

  useEffect(() => {
    corridorRef.current = corridor;
  }, [corridor]);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityObserver: IntersectionObserver | null = null;
    let isVisible = true;

    let pointerX = 0;
    let pointerY = 0;
    let smoothPointerX = 0;
    let smoothPointerY = 0;

    let currentYaw = CORRIDOR_YAW[corridorRef.current];
    let currentPitch = CORRIDOR_PITCH[corridorRef.current];

    const disposables: Array<{ dispose: () => void }> = [];

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
      pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };

    import("three")
      .then((THREE) => {
        if (disposed || !container) return;

        const w = Math.max(container.clientWidth, 300);
        const h = Math.max(container.clientHeight, 300);

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
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";
        container.replaceChildren();
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
        camera.position.set(0, 0.12, 5.65);
        camera.lookAt(0, 0.02, 0);

        // Tropical sun + ocean atmosphere lighting
        const ambient = new THREE.AmbientLight(0xdbeafe, 1.35);
        scene.add(ambient);

        const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
        sunLight.position.set(5.5, 4.2, 4.8);
        scene.add(sunLight);

        const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.65);
        cyanRim.position.set(-5.0, 2.5, -3.5);
        scene.add(cyanRim);

        const warmUnderLight = new THREE.PointLight(0xff6b2b, 1.8, 12);
        warmUnderLight.position.set(1.2, -2.4, 3.0);
        scene.add(warmUnderLight);

        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const GLOBE_R = 1.44;

        // Convert (lat, lon) in degrees to 3D Vector3 on sphere of radius r
        const latLonToVec3 = (lat: number, lon: number, r: number) => {
          const phi = (90 - lat) * (Math.PI / 180);
          const theta = (lon + 180) * (Math.PI / 180);
          const x = -(r * Math.sin(phi) * Math.cos(theta));
          const z = r * Math.sin(phi) * Math.sin(theta);
          const y = r * Math.cos(phi);
          return new THREE.Vector3(x, y, z);
        };

        // 1. Deep Ocean Core Sphere (velvety deep sapphire so golden constellation & arcs pop)
        const oceanGeo = new THREE.SphereGeometry(GLOBE_R, 64, 64);
        const oceanMat = new THREE.MeshPhysicalMaterial({
          color: 0x071d3a,
          emissive: 0x051428,
          emissiveIntensity: 0.75,
          roughness: 0.56,
          metalness: 0.12,
          clearcoat: 0.18,
          clearcoatRoughness: 0.45,
        });
        disposables.push(oceanGeo, oceanMat);
        const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
        globeGroup.add(oceanMesh);

        // 2. Subtle Graticule Wireframe Shell
        const gridGeo = new THREE.SphereGeometry(GLOBE_R * 1.003, 32, 20);
        const gridMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.08,
        });
        disposables.push(gridGeo, gridMat);
        globeGroup.add(new THREE.Mesh(gridGeo, gridMat));

        // 3. Outer Atmospheric Rim Halo
        const atmoGeo = new THREE.SphereGeometry(GLOBE_R * 1.09, 48, 48);
        const atmoMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.11,
          side: THREE.BackSide,
        });
        disposables.push(atmoGeo, atmoMat);
        globeGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

        // 4. Orbital Logistics Ring
        const ringGeo = new THREE.RingGeometry(GLOBE_R * 1.18, GLOBE_R * 1.195, 96);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
        });
        disposables.push(ringGeo, ringMat);
        const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
        orbitalRing.rotation.x = Math.PI * 0.42;
        orbitalRing.rotation.y = -0.25;
        globeGroup.add(orbitalRing);

        // 5. Continental Constellation Point-Cloud (Golden + Cyan particles)
        const positions: number[] = [];
        const colors: number[] = [];
        const goldColor = new THREE.Color(0xfde68a);
        const cyanColor = new THREE.Color(0x7dd3fc);
        const copperColor = new THREE.Color(0xff7a3d);

        // Deterministic PRNG so constellation is crisp and repeatable
        let seed = 42109;
        const nextRand = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };

        for (const [latMin, latMax, lonMin, lonMax, count] of CONTINENT_PATCHES) {
          for (let i = 0; i < count; i++) {
            const u = nextRand();
            const v = nextRand();
            const lat = latMin + u * (latMax - latMin);
            const lon = lonMin + v * (lonMax - lonMin);
            const pos = latLonToVec3(lat, lon, GLOBE_R * 1.008);
            positions.push(pos.x, pos.y, pos.z);

            const mix = nextRand();
            const c =
              mix > 0.72 ? copperColor : mix > 0.28 ? goldColor : cyanColor;
            colors.push(c.r, c.g, c.b);
          }
        }

        const constellationGeo = new THREE.BufferGeometry();
        constellationGeo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );
        constellationGeo.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3)
        );
        const constellationMat = new THREE.PointsMaterial({
          size: 0.028,
          vertexColors: true,
          transparent: true,
          opacity: 0.92,
        });
        disposables.push(constellationGeo, constellationMat);
        const constellationPoints = new THREE.Points(
          constellationGeo,
          constellationMat
        );
        globeGroup.add(constellationPoints);

        // 6. Abidjan Destination Beacon + Pulsing Radar Rings
        const abidjanPos = latLonToVec3(
          ABIDJAN_HUB.lat,
          ABIDJAN_HUB.lon,
          GLOBE_R * 1.015
        );
        const hubSphereGeo = new THREE.SphereGeometry(0.048, 20, 20);
        const abidjanMat = new THREE.MeshBasicMaterial({ color: 0xff6b2b });
        disposables.push(hubSphereGeo, abidjanMat);
        const abidjanBeacon = new THREE.Mesh(hubSphereGeo, abidjanMat);
        abidjanBeacon.position.copy(abidjanPos);
        globeGroup.add(abidjanBeacon);

        // Radar ring oriented tangent to Abidjan surface normal
        const radarRingGeo = new THREE.RingGeometry(0.06, 0.088, 32);
        const radarRingMat = new THREE.MeshBasicMaterial({
          color: 0xff8c42,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        });
        disposables.push(radarRingGeo, radarRingMat);
        const abidjanRadar = new THREE.Mesh(radarRingGeo, radarRingMat);
        abidjanRadar.position.copy(abidjanPos);
        abidjanRadar.lookAt(abidjanPos.clone().multiplyScalar(2));
        globeGroup.add(abidjanRadar);

        // 7. Geodesic Route Arcs + Animated Cargo Pulses from Origins -> Abidjan
        interface RouteArcEntry {
          corridor?: CorridorId;
          curve: import("three").QuadraticBezierCurve3;
          tubeMat: import("three").MeshBasicMaterial;
          pulseMesh: import("three").Mesh;
          pulseMat: import("three").MeshBasicMaterial;
          originMesh: import("three").Mesh;
          phaseOffset: number;
        }

        const routeArcs: RouteArcEntry[] = [];
        const pulseGeo = new THREE.SphereGeometry(0.036, 16, 16);
        const originMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
        disposables.push(pulseGeo, originMat);

        ORIGIN_HUBS.forEach((hub, idx) => {
          const startPos = latLonToVec3(hub.lat, hub.lon, GLOBE_R * 1.014);
          const endPos = abidjanPos.clone();

          // Origin beacon
          const originBeacon = new THREE.Mesh(hubSphereGeo, originMat);
          originBeacon.position.copy(startPos);
          originBeacon.scale.setScalar(0.76);
          globeGroup.add(originBeacon);

          // Elevated midpoint for geodesic arc above the globe surface
          const dist = startPos.distanceTo(endPos);
          const mid = startPos
            .clone()
            .add(endPos)
            .multiplyScalar(0.5)
            .normalize()
            .multiplyScalar(GLOBE_R + 0.32 + dist * 0.24);

          const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
          const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.018, 10, false);
          const tubeMat = new THREE.MeshBasicMaterial({
            color: 0xff7a3d,
            transparent: true,
            opacity: 0.92,
          });
          disposables.push(tubeGeo, tubeMat);
          const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
          globeGroup.add(tubeMesh);

          const pulseMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
          });
          disposables.push(pulseMat);
          const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
          globeGroup.add(pulseMesh);

          routeArcs.push({
            corridor: hub.corridor,
            curve,
            tubeMat,
            pulseMesh,
            pulseMat,
            originMesh: originBeacon,
            phaseOffset: idx * 0.24,
          });
        });

        const clockStart = performance.now();

        const renderFrame = (now: number) => {
          if (disposed || !renderer) return;
          if (!isVisible) {
            rafId = requestAnimationFrame(renderFrame);
            return;
          }

          const elapsed = (now - clockStart) * 0.001;
          const scrollP = getScrollProgress();
          const activeCorridor = corridorRef.current;

          // Smoothly rotate globe toward active corridor's optimal viewing angle
          const targetYaw =
            CORRIDOR_YAW[activeCorridor] +
            (prefersReduced ? 0 : Math.sin(elapsed * 0.28) * 0.06) +
            scrollP * 0.35;
          const targetPitch =
            CORRIDOR_PITCH[activeCorridor] - scrollP * 0.14;

          currentYaw += (targetYaw - currentYaw) * 0.06;
          currentPitch += (targetPitch - currentPitch) * 0.06;

          smoothPointerX += (pointerX - smoothPointerX) * 0.07;
          smoothPointerY += (pointerY - smoothPointerY) * 0.07;

          globeGroup.rotation.y = currentYaw + smoothPointerX * 0.24;
          globeGroup.rotation.x = currentPitch + smoothPointerY * 0.14;

          // Scroll-driven camera zoom toward Abidjan hub
          const targetZ = 5.65 - scrollP * 0.75;
          camera.position.z += (targetZ - camera.position.z) * 0.08;

          // Pulse Abidjan radar ring
          const radarPhase = (elapsed * 0.85) % 1;
          abidjanRadar.scale.setScalar(1 + radarPhase * 2.4);
          radarRingMat.opacity = (1 - radarPhase) * 0.85;

          // Update route arcs & traveling cargo pulses
          routeArcs.forEach((arc) => {
            const isSelected = arc.corridor === activeCorridor;
            arc.tubeMat.color.setHex(isSelected ? 0xff6b2b : 0x38bdf8);
            arc.tubeMat.opacity = isSelected ? 0.96 : 0.38;
            arc.pulseMat.color.setHex(isSelected ? 0xfff7ed : 0x7dd3fc);
            arc.pulseMesh.scale.setScalar(isSelected ? 1.25 : 0.78);

            const t = prefersReduced
              ? 0.62
              : (elapsed * (isSelected ? 0.36 : 0.22) + arc.phaseOffset) % 1;
            const pt = arc.curve.getPoint(t);
            arc.pulseMesh.position.copy(pt);
          });

          renderer.render(scene, camera);
          if (!prefersReduced) {
            rafId = requestAnimationFrame(renderFrame);
          }
        };

        rafId = requestAnimationFrame(renderFrame);

        if ("ResizeObserver" in window) {
          resizeObserver = new ResizeObserver(() => {
            if (!container || !renderer) return;
            const nw = Math.max(container.clientWidth, 260);
            const nh = Math.max(container.clientHeight, 260);
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh, false);
            renderer.render(scene, camera);
          });
          resizeObserver.observe(container);
        }

        if ("IntersectionObserver" in window) {
          visibilityObserver = new IntersectionObserver(
            (entries) => {
              isVisible = entries[0]?.isIntersecting ?? true;
            },
            { threshold: 0.02 }
          );
          visibilityObserver.observe(container);
        }
      })
      .catch(() => {
        setWebglReady(false);
      });

    container.addEventListener("pointermove", onPointerMove, { passive: true });
    container.addEventListener("pointerleave", onPointerLeave, {
      passive: true,
    });

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {}
      });
      if (renderer) {
        try {
          renderer.dispose();
        } catch {}
      }
    };
  }, []);

  if (!webglReady) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-[20px] ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/v5-world-routes.webp"
          alt="Carte mondiale des corridors aériens et maritimes reliés à Abidjan"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      aria-label="Globe 3D interactif des corridors logistiques Chine, Turquie et Dubaï vers Abidjan"
      className={`relative select-none ${className}`}
    />
  );
}

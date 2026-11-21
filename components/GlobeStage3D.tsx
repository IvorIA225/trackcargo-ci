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
    lat: 29.88,
    lon: 121.55,
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
  yiwu_sea: -2.46,
  canton_air: -2.4,
  istanbul_dubai: -1.94,
};

const CORRIDOR_PITCH: Record<CorridorId, number> = {
  yiwu_sea: 0.24,
  canton_air: 0.22,
  istanbul_dubai: 0.28,
};

// ============================================================================
// Geographically Accurate Continent Polygons ([lat, lon] in degrees)
// ============================================================================
type LatLon = [number, number];

const AFRICA_POLY: LatLon[] = [
  [35.9, -5.6],
  [33.6, -7.6],
  [30.4, -9.6],
  [27.1, -13.2],
  [20.9, -17.0],
  [14.7, -17.5], // Cap-Vert / Dakar
  [11.8, -15.6],
  [8.5, -13.3],
  [6.3, -10.8],
  [4.4, -7.7], // Cape Palmas
  [5.3, -4.0], // Abidjan / Côte d'Ivoire
  [5.6, -0.2], // Accra
  [6.4, 3.4], // Lagos
  [4.3, 6.1], // Niger Delta
  [4.0, 9.7], // Douala
  [0.4, 9.4], // Libreville
  [-4.8, 11.8],
  [-8.8, 13.2], // Luanda
  [-15.2, 12.1],
  [-22.9, 14.5], // Walvis Bay
  [-28.6, 16.5],
  [-34.0, 18.4], // Cape Town
  [-34.8, 20.0], // Cape Agulhas
  [-33.9, 25.6],
  [-29.8, 31.0], // Durban
  [-25.9, 32.6], // Maputo
  [-19.8, 34.8],
  [-15.0, 40.7],
  [-10.3, 40.2],
  [-6.8, 39.3], // Dar es Salaam
  [-4.0, 39.7], // Mombasa
  [-0.4, 42.5],
  [2.0, 45.3], // Mogadishu
  [6.0, 49.0],
  [11.8, 51.3], // Cape Guardafui (Horn of Africa)
  [10.5, 45.0],
  [11.6, 43.1], // Djibouti
  [15.6, 39.5],
  [19.6, 37.2],
  [24.0, 35.5],
  [27.8, 33.8],
  [29.9, 32.5], // Suez
  [31.5, 31.0], // Nile Delta
  [31.2, 29.9], // Alexandria
  [32.1, 23.9],
  [32.9, 21.6],
  [30.4, 19.0], // Gulf of Sidra
  [32.9, 13.2], // Tripoli
  [33.9, 10.1],
  [37.3, 9.8], // Tunis / Bizerte
  [36.9, 7.8],
  [36.8, 3.1], // Algiers
  [35.7, -0.6],
  [35.9, -5.6],
];

const MADAGASCAR_POLY: LatLon[] = [
  [-12.0, 49.3],
  [-15.3, 50.4],
  [-18.1, 49.4],
  [-21.3, 48.3],
  [-25.0, 47.0],
  [-25.6, 45.1],
  [-23.3, 43.7],
  [-19.0, 44.2],
  [-15.7, 46.3],
  [-13.5, 47.8],
  [-12.0, 49.3],
];

const EUROPE_POLY: LatLon[] = [
  [36.1, -5.4], // Gibraltar
  [37.0, -8.9], // Cape St. Vincent
  [38.7, -9.4], // Lisbon
  [43.0, -9.3], // Galicia
  [43.3, -1.8], // Bay of Biscay
  [47.2, -2.2],
  [48.4, -4.8], // Brittany
  [49.6, -1.6],
  [51.0, 1.8], // Calais
  [52.0, 4.1], // Rotterdam
  [53.6, 8.1],
  [57.7, 10.6], // Denmark tip
  [54.5, 10.2],
  [54.0, 14.0],
  [54.4, 18.6], // Gdansk
  [55.7, 21.1],
  [59.4, 24.7], // Tallinn
  [60.0, 30.2], // St. Petersburg
  [66.0, 40.0],
  [68.5, 54.0],
  [60.0, 60.0],
  [47.2, 39.7], // Rostov
  [45.0, 36.6],
  [46.5, 30.7], // Odessa
  [44.2, 28.6],
  [41.2, 29.0], // Bosphorus
  [40.6, 22.9], // Thessaloniki
  [38.0, 23.7], // Athens
  [36.4, 22.5], // Peloponnese
  [39.6, 19.9],
  [42.6, 18.1], // Dubrovnik
  [45.6, 13.7], // Trieste
  [44.4, 12.3],
  [41.1, 16.9], // Bari
  [39.8, 18.4], // Heel of Italy
  [40.4, 17.2],
  [38.0, 15.6], // Toe of Italy
  [40.8, 14.3], // Naples
  [41.8, 12.2], // Rome
  [44.4, 8.9], // Genoa
  [43.7, 7.3], // Nice
  [43.3, 5.4], // Marseille
  [43.0, 3.0],
  [41.4, 2.2], // Barcelona
  [39.5, -0.3], // Valencia
  [36.7, -4.4], // Malaga
  [36.1, -5.4],
];

const UK_POLY: LatLon[] = [
  [50.0, -5.2],
  [50.8, 0.2],
  [51.4, 1.4],
  [52.7, 1.7],
  [53.6, 0.1],
  [55.0, -1.4],
  [57.1, -2.1],
  [58.6, -3.1],
  [57.8, -5.8],
  [55.8, -4.9],
  [53.4, -3.0],
  [51.6, -5.1],
  [50.0, -5.2],
];

const SCANDINAVIA_POLY: LatLon[] = [
  [55.4, 12.9],
  [57.7, 11.9],
  [59.9, 10.7],
  [58.0, 7.5],
  [60.4, 5.3],
  [63.4, 10.4],
  [68.4, 16.0],
  [71.1, 25.8],
  [70.0, 29.8],
  [65.8, 24.1],
  [63.8, 20.3],
  [59.3, 18.1],
  [56.2, 16.0],
  [55.4, 12.9],
];

const ASIA_MIDDLE_EAST_POLY: LatLon[] = [
  // Anatolia / Turkey
  [41.0, 29.0],
  [42.0, 35.1],
  [41.0, 39.7],
  [41.6, 41.6],
  [36.8, 36.2],
  [36.5, 32.0],
  [36.8, 28.3],
  [38.4, 27.1],
  [40.0, 26.2],
  // Levant & Red Sea East
  [36.0, 35.9],
  [33.9, 35.5],
  [31.5, 34.5],
  [29.5, 35.0],
  [24.0, 38.0],
  [21.5, 39.2], // Jeddah
  [16.9, 42.6],
  [12.6, 43.5], // Bab el-Mandeb
  // Arabian South & East
  [12.8, 45.0], // Aden
  [14.5, 49.1],
  [17.0, 54.1], // Salalah
  [22.5, 59.8], // Muscat point
  [26.2, 56.3], // Strait of Hormuz
  [25.3, 55.3], // Dubai
  [24.5, 54.4], // Abu Dhabi
  [25.3, 51.5], // Doha
  [29.4, 48.0], // Kuwait
  // Iran & Pakistan
  [30.0, 49.5],
  [27.2, 56.3],
  [25.3, 60.6],
  [24.8, 67.0], // Karachi
  // Indian Peninsula
  [22.5, 69.1],
  [21.1, 72.8],
  [19.0, 72.8], // Mumbai
  [15.4, 73.8],
  [10.0, 76.2],
  [8.1, 77.5], // Southern tip of India
  [10.8, 79.8],
  [13.1, 80.3], // Chennai
  [17.7, 83.3],
  [20.3, 86.7],
  [21.8, 88.5], // Kolkata / Ganges Delta
  [22.3, 91.8], // Chittagong
  // Southeast Asia & Malay Peninsula
  [19.5, 93.5],
  [16.0, 94.3],
  [16.8, 96.2], // Yangon
  [12.0, 98.6],
  [7.9, 98.3], // Phuket
  [3.1, 101.4], // Port Klang
  [1.3, 103.8], // Singapore
  [3.8, 103.3],
  [7.2, 100.6],
  [13.5, 100.6], // Bangkok
  [10.4, 103.5],
  [8.6, 104.8], // Mekong tip
  [10.8, 106.7], // Ho Chi Minh
  [12.2, 109.2],
  [16.0, 108.2], // Da Nang
  [20.8, 106.7], // Haiphong
  [21.5, 109.5],
  // China Coast (Guangzhou -> Yiwu/Ningbo -> Shanghai -> Qingdao -> Dalian)
  [22.2, 113.5], // Macau / Pearl River
  [23.1, 113.3], // Guangzhou
  [22.3, 114.2], // Hong Kong / Shenzhen
  [23.4, 116.7], // Shantou
  [24.5, 118.1], // Xiamen
  [26.0, 119.5], // Fuzhou
  [28.0, 120.7], // Wenzhou
  [29.9, 121.6], // Yiwu & Ningbo
  [31.2, 121.5], // Shanghai
  [34.7, 119.2],
  [36.1, 120.4], // Qingdao
  [37.5, 122.1],
  [37.8, 119.0],
  [39.0, 117.7], // Tianjin
  [40.0, 119.6],
  [38.9, 121.6], // Dalian
  [40.0, 124.3],
  // Korea
  [37.5, 126.6], // Incheon
  [34.8, 126.4],
  [35.1, 129.0], // Busan
  [38.7, 128.2],
  [42.3, 130.6],
  // Far East & Northern Boundary
  [43.1, 131.9], // Vladivostok
  [48.0, 139.5],
  [54.0, 138.0],
  [60.0, 150.0],
  [66.0, 170.0],
  [70.0, 140.0],
  [72.0, 100.0],
  [69.0, 65.0],
  [47.0, 40.0],
  [41.0, 29.0],
];

const JAPAN_POLY: LatLon[] = [
  [31.3, 130.6],
  [33.6, 130.4],
  [34.7, 135.5],
  [35.7, 139.8], // Tokyo
  [38.3, 141.0],
  [41.5, 140.9],
  [43.1, 141.3],
  [39.7, 140.1],
  [36.6, 136.6],
  [34.4, 132.5],
  [31.3, 130.6],
];

const SUMATRA_JAVA_POLY: LatLon[] = [
  [5.5, 95.3],
  [1.0, 102.2],
  [-5.9, 105.9],
  [-6.2, 106.8], // Jakarta
  [-7.8, 113.9],
  [-8.7, 114.5],
  [-6.8, 105.3],
  [-1.0, 100.4],
  [5.5, 95.3],
];

const BORNEO_POLY: LatLon[] = [
  [7.0, 116.8],
  [4.2, 117.9],
  [-1.3, 116.8],
  [-3.5, 114.5],
  [-2.8, 110.2],
  [1.5, 110.3],
  [4.9, 114.9],
  [7.0, 116.8],
];

const AUSTRALIA_POLY: LatLon[] = [
  [-12.4, 130.8],
  [-12.0, 142.5],
  [-19.3, 146.8],
  [-27.5, 153.0],
  [-33.9, 151.2], // Sydney
  [-38.1, 145.0], // Melbourne
  [-35.0, 138.6],
  [-32.0, 133.6],
  [-34.0, 115.0],
  [-31.9, 115.8], // Perth
  [-21.9, 114.1],
  [-18.0, 122.2],
  [-12.4, 130.8],
];

const SOUTH_AMERICA_POLY: LatLon[] = [
  [11.0, -74.8],
  [10.5, -66.9],
  [6.8, -58.2],
  [0.0, -50.0],
  [-2.5, -44.3],
  [-5.8, -35.2], // Natal (eastern tip facing West Africa)
  [-13.0, -38.5],
  [-22.9, -43.2], // Rio
  [-24.0, -46.3], // Santos
  [-34.6, -58.4], // Buenos Aires
  [-45.8, -67.5],
  [-54.8, -68.3],
  [-41.5, -73.0],
  [-33.0, -71.6],
  [-12.0, -77.0],
  [-2.2, -80.9],
  [4.0, -77.0],
  [11.0, -74.8],
];

const NORTH_AMERICA_POLY: LatLon[] = [
  [8.9, -79.5],
  [19.2, -96.1],
  [25.9, -97.4],
  [29.7, -95.0],
  [29.9, -90.1],
  [25.8, -80.2], // Miami
  [32.1, -81.1],
  [36.8, -76.0],
  [40.7, -74.0], // New York
  [42.4, -71.0],
  [46.8, -71.2],
  [52.0, -55.8],
  [60.0, -64.5],
  [62.0, -78.0],
  [55.0, -90.0],
  [55.0, -130.0],
  [37.8, -122.4],
  [32.7, -117.2],
  [22.9, -109.9],
  [16.8, -99.9],
  [8.9, -79.5],
];

const ALL_CONTINENT_POLYS: LatLon[][] = [
  AFRICA_POLY,
  MADAGASCAR_POLY,
  EUROPE_POLY,
  UK_POLY,
  SCANDINAVIA_POLY,
  ASIA_MIDDLE_EAST_POLY,
  JAPAN_POLY,
  SUMATRA_JAVA_POLY,
  BORNEO_POLY,
  AUSTRALIA_POLY,
  SOUTH_AMERICA_POLY,
  NORTH_AMERICA_POLY,
];

// Point-in-polygon ray-casting test in (lat, lon) space
function isPointInPoly(lat: number, lon: number, poly: LatLon[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0];
    const xi = poly[i][1];
    const yj = poly[j][0];
    const xj = poly[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isLand(lat: number, lon: number): boolean {
  for (let k = 0; k < ALL_CONTINENT_POLYS.length; k++) {
    if (isPointInPoly(lat, lon, ALL_CONTINENT_POLYS[k])) return true;
  }
  return false;
}

// High-resolution 2048x1024 Equirectangular Earth Continent Canvas Texture
function createRealisticEarthTexture(
  THREE: typeof import("three")
): import("three").CanvasTexture {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // 1. Deep Ocean Gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
    oceanGrad.addColorStop(0, "#040f21");
    oceanGrad.addColorStop(0.5, "#071f40");
    oceanGrad.addColorStop(1, "#040f21");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Subtle Lat/Lon Graticule Lines every 15 degrees
    ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
    ctx.lineWidth = 1;
    for (let lon = -165; lon <= 165; lon += 15) {
      const x = ((lon + 180) / 360) * W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      const y = ((90 - lat) / 180) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Helper to convert (lat, lon) -> (x, y) on equirectangular canvas
    const toXY = (lat: number, lon: number): [number, number] => [
      ((lon + 180) / 360) * W,
      ((90 - lat) / 180) * H,
    ];

    // 3. Draw Continent Silhouettes with Coastal Shelf Glow & Crisp Gold/Cyan Coastlines
    ALL_CONTINENT_POLYS.forEach((poly) => {
      if (poly.length < 3) return;
      ctx.beginPath();
      poly.forEach(([lat, lon], idx) => {
        const [x, y] = toXY(lat, lon);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      // Continental landmass fill
      ctx.fillStyle = "rgba(18, 56, 108, 0.88)";
      ctx.fill();

      // Outer coastal shelf glow
      ctx.save();
      ctx.shadowColor = "rgba(56, 189, 248, 0.65)";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(125, 211, 252, 0.78)";
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();

      // Inner warm gold coastline highlight
      ctx.strokeStyle = "rgba(253, 230, 138, 0.52)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

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

        // Lighting
        const ambient = new THREE.AmbientLight(0xe0f2fe, 1.55);
        scene.add(ambient);

        const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.6);
        sunLight.position.set(5.5, 4.0, 5.0);
        scene.add(sunLight);

        const cyanRim = new THREE.DirectionalLight(0x38bdf8, 1.5);
        cyanRim.position.set(-5.0, 2.5, -3.5);
        scene.add(cyanRim);

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

        // 1. Textured Earth Sphere with Geographically Accurate Continents
        const earthTex = createRealisticEarthTexture(THREE);
        const oceanGeo = new THREE.SphereGeometry(GLOBE_R, 72, 72);
        const oceanMat = new THREE.MeshPhysicalMaterial({
          map: earthTex,
          roughness: 0.52,
          metalness: 0.14,
          clearcoat: 0.22,
          clearcoatRoughness: 0.4,
        });
        disposables.push(earthTex, oceanGeo, oceanMat);
        globeGroup.add(new THREE.Mesh(oceanGeo, oceanMat));

        // 2. 3D Vector Coastline Outlines directly on the sphere surface
        const coastLineMat = new THREE.LineBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.62,
        });
        disposables.push(coastLineMat);

        ALL_CONTINENT_POLYS.forEach((poly) => {
          const pts: import("three").Vector3[] = [];
          for (let i = 0; i < poly.length; i++) {
            const [lat1, lon1] = poly[i];
            const [lat2, lon2] = poly[(i + 1) % poly.length];
            const steps = Math.max(
              1,
              Math.ceil(Math.hypot(lat2 - lat1, lon2 - lon1) / 2.2)
            );
            for (let s = 0; s < steps; s++) {
              const f = s / steps;
              pts.push(
                latLonToVec3(
                  lat1 + (lat2 - lat1) * f,
                  lon1 + (lon2 - lon1) * f,
                  GLOBE_R * 1.003
                )
              );
            }
          }
          const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
          disposables.push(lineGeo);
          globeGroup.add(new THREE.LineLoop(lineGeo, coastLineMat));
        });

        // 3. Outer Atmospheric Rim Halo & Orbital Ring
        const atmoGeo = new THREE.SphereGeometry(GLOBE_R * 1.08, 48, 48);
        const atmoMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide,
        });
        disposables.push(atmoGeo, atmoMat);
        globeGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

        const ringGeo = new THREE.RingGeometry(GLOBE_R * 1.18, GLOBE_R * 1.195, 96);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
        });
        disposables.push(ringGeo, ringMat);
        const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
        orbitalRing.rotation.x = Math.PI * 0.42;
        orbitalRing.rotation.y = -0.25;
        globeGroup.add(orbitalRing);

        // 4. Geographically-Filtered Continental Constellation Point-Cloud
        const positions: number[] = [];
        const colors: number[] = [];
        const goldColor = new THREE.Color(0xfde68a);
        const cyanColor = new THREE.Color(0x7dd3fc);
        const copperColor = new THREE.Color(0xff8c42);

        let seed = 918273;
        const nextRand = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };

        // Uniform Fibonacci-like grid tested against exact continent polygons
        for (let lat = -54; lat <= 70; lat += 1.45) {
          const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
          const lonStep = 1.45 / cosLat;
          for (let lon = -130; lon <= 155; lon += lonStep) {
            const jLat = lat + (nextRand() - 0.5) * 0.8;
            const jLon = lon + (nextRand() - 0.5) * 0.8;
            if (!isLand(jLat, jLon)) continue;

            const pos = latLonToVec3(jLat, jLon, GLOBE_R * 1.006);
            positions.push(pos.x, pos.y, pos.z);

            const mix = nextRand();
            const c =
              mix > 0.72 ? copperColor : mix > 0.24 ? goldColor : cyanColor;
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
          size: 0.025,
          vertexColors: true,
          transparent: true,
          opacity: 0.94,
        });
        disposables.push(constellationGeo, constellationMat);
        globeGroup.add(new THREE.Points(constellationGeo, constellationMat));

        // 5. Abidjan Destination Beacon + Pulsing Radar Ring
        const abidjanPos = latLonToVec3(
          ABIDJAN_HUB.lat,
          ABIDJAN_HUB.lon,
          GLOBE_R * 1.015
        );
        const hubSphereGeo = new THREE.SphereGeometry(0.044, 20, 20);
        const abidjanMat = new THREE.MeshBasicMaterial({ color: 0xff6b2b });
        disposables.push(hubSphereGeo, abidjanMat);
        const abidjanBeacon = new THREE.Mesh(hubSphereGeo, abidjanMat);
        abidjanBeacon.position.copy(abidjanPos);
        globeGroup.add(abidjanBeacon);

        const radarRingGeo = new THREE.RingGeometry(0.055, 0.082, 32);
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

        // 6. Geodesic Route Arcs + Animated Cargo Pulses from Origins -> Abidjan
        interface RouteArcEntry {
          corridor?: CorridorId;
          curve: import("three").QuadraticBezierCurve3;
          tubeMat: import("three").MeshBasicMaterial;
          pulseMesh: import("three").Mesh;
          pulseMat: import("three").MeshBasicMaterial;
          phaseOffset: number;
        }

        const routeArcs: RouteArcEntry[] = [];
        const pulseGeo = new THREE.SphereGeometry(0.034, 16, 16);
        const originMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
        disposables.push(pulseGeo, originMat);

        ORIGIN_HUBS.forEach((hub, idx) => {
          const startPos = latLonToVec3(hub.lat, hub.lon, GLOBE_R * 1.014);
          const endPos = abidjanPos.clone();

          const originBeacon = new THREE.Mesh(hubSphereGeo, originMat);
          originBeacon.position.copy(startPos);
          originBeacon.scale.setScalar(0.76);
          globeGroup.add(originBeacon);

          const dist = startPos.distanceTo(endPos);
          const mid = startPos
            .clone()
            .add(endPos)
            .multiplyScalar(0.5)
            .normalize()
            .multiplyScalar(GLOBE_R + 0.28 + dist * 0.22);

          const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
          const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.016, 10, false);
          const tubeMat = new THREE.MeshBasicMaterial({
            color: 0xff7a3d,
            transparent: true,
            opacity: 0.92,
          });
          disposables.push(tubeGeo, tubeMat);
          globeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

          const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          disposables.push(pulseMat);
          const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
          globeGroup.add(pulseMesh);

          routeArcs.push({
            corridor: hub.corridor,
            curve,
            tubeMat,
            pulseMesh,
            pulseMat,
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

          const targetYaw =
            CORRIDOR_YAW[activeCorridor] +
            (prefersReduced ? 0 : Math.sin(elapsed * 0.28) * 0.05) +
            scrollP * 0.32;
          const targetPitch =
            CORRIDOR_PITCH[activeCorridor] - scrollP * 0.12;

          currentYaw += (targetYaw - currentYaw) * 0.06;
          currentPitch += (targetPitch - currentPitch) * 0.06;

          smoothPointerX += (pointerX - smoothPointerX) * 0.07;
          smoothPointerY += (pointerY - smoothPointerY) * 0.07;

          globeGroup.rotation.y = currentYaw + smoothPointerX * 0.22;
          globeGroup.rotation.x = currentPitch + smoothPointerY * 0.12;

          const targetZ = 5.65 - scrollP * 0.75;
          camera.position.z += (targetZ - camera.position.z) * 0.08;

          const radarPhase = (elapsed * 0.85) % 1;
          abidjanRadar.scale.setScalar(1 + radarPhase * 2.4);
          radarRingMat.opacity = (1 - radarPhase) * 0.85;

          routeArcs.forEach((arc) => {
            const isSelected = arc.corridor === activeCorridor;
            arc.tubeMat.color.setHex(isSelected ? 0xff6b2b : 0x38bdf8);
            arc.tubeMat.opacity = isSelected ? 0.96 : 0.4;
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
      aria-label="Globe 3D interactif aux contours continentaux réalistes reliant la Chine, la Turquie et Dubaï à Abidjan"
      className={`relative select-none ${className}`}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  createCardboardTextures,
  createCoastalStudioEnvironment,
  createGroundShadowTexture,
  createShippingLabelTexture,
  createWoodDeckTexture,
} from "@/lib/three-studio";

interface ParcelShowcase3DProps {
  className?: string;
}

/**
 * Macro 3D studio render of an export carton (TC-8841) on a slatted timber pallet.
 * Reacts smoothly to Act 2 scroll progress (--sc-p) to inspect the glossy BOPP tape,
 * tensioned strapping, and thermal shipping barcode label.
 */
export default function ParcelShowcase3D({
  className = "",
}: ParcelShowcase3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [webglReady, setWebglReady] = useState(true);

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

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const getActProgress = () => {
      const act = container.closest("[data-sc-act]") as HTMLElement | null;
      if (!act) return 0.35;
      const val = getComputedStyle(act).getPropertyValue("--sc-p").trim();
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.35;
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

        const w = Math.max(container.clientWidth, 280);
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
        renderer.toneMappingExposure = 1.04;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";
        container.replaceChildren();
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const studioEnv = createCoastalStudioEnvironment(THREE, renderer);
        disposables.push(studioEnv);
        scene.environment = studioEnv.texture;

        const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 50);
        camera.position.set(4.1, 2.35, 4.4);
        camera.lookAt(0, 0.12, 0);

        const hemi = new THREE.HemisphereLight(0xf6f9ff, 0xdfd8cb, 0.9);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.3);
        keyLight.position.set(6, 9, 6);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.radius = 3.5;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0xbad4ff, 0.85);
        rimLight.position.set(-6, 4, -5);
        scene.add(rimLight);

        const groundY = -0.88;
        const shadowFloor = new THREE.Mesh(
          new THREE.PlaneGeometry(14, 14),
          new THREE.ShadowMaterial({ opacity: 0.18 })
        );
        shadowFloor.rotation.x = -Math.PI / 2;
        shadowFloor.position.y = groundY;
        shadowFloor.receiveShadow = true;
        scene.add(shadowFloor);

        const aoTex = createGroundShadowTexture(THREE);
        disposables.push(aoTex);
        const aoPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(4.2, 4.2),
          new THREE.MeshBasicMaterial({
            map: aoTex,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
          })
        );
        aoPlane.rotation.x = -Math.PI / 2;
        aoPlane.position.set(0, groundY + 0.003, 0);
        scene.add(aoPlane);

        const parcelRig = new THREE.Group();
        scene.add(parcelRig);

        const woodTex = createWoodDeckTexture(THREE);
        disposables.push(woodTex);
        const woodMat = new THREE.MeshStandardMaterial({
          map: woodTex.map,
          bumpMap: woodTex.bumpMap,
          bumpScale: 0.02,
          roughness: 0.78,
        });

        const kraftTex = createCardboardTextures(THREE);
        disposables.push(kraftTex);
        const cartonMat = new THREE.MeshStandardMaterial({
          map: kraftTex.map,
          bumpMap: kraftTex.bumpMap,
          bumpScale: 0.018,
          roughnessMap: kraftTex.roughnessMap,
          roughness: 0.86,
          metalness: 0.02,
        });

        const tapeMat = new THREE.MeshPhysicalMaterial({
          color: 0xe3c291,
          roughness: 0.12,
          metalness: 0.05,
          clearcoat: 0.95,
          clearcoatRoughness: 0.08,
        });

        const strapMat = new THREE.MeshStandardMaterial({
          color: 0xc9410e,
          roughness: 0.36,
          metalness: 0.12,
        });

        const metalClipMat = new THREE.MeshStandardMaterial({
          color: 0xdbe2ea,
          metalness: 0.9,
          roughness: 0.18,
        });

        const labelTex = createShippingLabelTexture(
          THREE,
          "TC-8841",
          "GUANGZHOU -> TREICHVILLE",
          "14.5 KG · PAYABLE WAVE"
        );
        disposables.push(labelTex);
        const labelMat = new THREE.MeshStandardMaterial({
          map: labelTex,
          roughness: 0.52,
        });

        const addBox = (
          bw: number,
          bh: number,
          bd: number,
          x: number,
          y: number,
          z: number,
          mat: import("three").Material
        ) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
          m.position.set(x, y, z);
          m.castShadow = true;
          m.receiveShadow = true;
          parcelRig.add(m);
          return m;
        };

        // Slatted Miniature Timber Pallet
        for (let i = -2; i <= 2; i++) {
          addBox(2.35, 0.055, 0.28, 0, -0.7, i * 0.42, woodMat);
        }
        [-0.85, 0, 0.85].forEach((sx) => {
          addBox(0.22, 0.12, 2.0, sx, -0.78, 0, woodMat);
        });
        addBox(2.35, 0.04, 2.0, 0, -0.86, 0, woodMat);

        // Main Export Carton
        const cw = 1.92;
        const ch = 1.32;
        const cd = 1.48;
        const cy = -0.01;
        addBox(cw, ch, cd, 0, cy, 0, cartonMat);

        // Top Flap Seam + Glossy BOPP Tape Wrap (Top & Side Drops)
        addBox(cw + 0.014, 0.014, 0.2, 0, cy + ch / 2 + 0.005, 0, tapeMat);
        addBox(0.014, 0.24, 0.2, cw / 2 + 0.005, cy + ch / 2 - 0.11, 0, tapeMat);
        addBox(0.014, 0.24, 0.2, -cw / 2 - 0.005, cy + ch / 2 - 0.11, 0, tapeMat);

        // Twin Tensioned Vermilion PP Straps + Brushed Steel Seals
        [-0.56, 0.56].forEach((sx) => {
          addBox(0.048, ch + 0.02, cd + 0.024, sx, cy, 0, strapMat);
          addBox(0.068, 0.022, 0.12, sx, cy + ch / 2 + 0.014, 0, metalClipMat);
        });

        // Crisp Thermal Barcode Label on Front Face + Corner Fragile Stamp
        addBox(0.76, 0.52, 0.012, 0, cy + 0.14, cd / 2 + 0.007, labelMat);
        // Secondary side label
        const sideLabel = new THREE.Mesh(
          new THREE.BoxGeometry(0.012, 0.48, 0.72),
          labelMat
        );
        sideLabel.position.set(cw / 2 + 0.007, cy + 0.16, 0);
        sideLabel.castShadow = true;
        parcelRig.add(sideLabel);

        container.addEventListener("pointermove", onPointerMove, { passive: true });
        container.addEventListener("pointerleave", onPointerLeave, { passive: true });

        resizeObserver = new ResizeObserver(() => {
          if (!renderer || !container) return;
          const nw = Math.max(container.clientWidth, 240);
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

        let t = 0;
        const renderFrame = () => {
          if (disposed) return;
          rafId = requestAnimationFrame(renderFrame);
          if (!isVisible || !renderer) return;

          if (!prefersReduced) t += 0.012;
          curX += (targetX - curX) * 0.07;
          curY += (targetY - curY) * 0.07;

          const p = getActProgress();
          const baseYaw = prefersReduced ? -0.45 : -0.65 + p * 1.45;

          parcelRig.rotation.y = baseYaw + curX * 0.18;
          parcelRig.rotation.x = 0.02 - curY * 0.08;
          parcelRig.position.y = prefersReduced ? 0 : Math.sin(t * 0.9) * 0.015;

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
    <div className={`relative w-full h-full select-none ${className}`}>
      {webglReady ? (
        <div
          ref={hostRef}
          className="w-full h-full min-h-[260px]"
          aria-label="Carton d'exportation TC-8841 en 3D"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-6">
          <div className="w-56 h-44 rounded-xl bg-[#cca16e] border border-[#0d131d]/15 shadow-lg flex items-center justify-center p-4">
            <div className="bg-white px-4 py-3 rounded-md border border-[#0d131d]/15 font-mono text-xs text-[#0d131d] font-bold">
              TC-8841 · TREICHVILLE
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


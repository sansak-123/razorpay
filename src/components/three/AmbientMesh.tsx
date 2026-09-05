"use client";

import { useEffect, useRef } from "react";

export function AmbientMesh() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    let disposed = false;
    let raf = 0;
    let renderer: import("three").WebGLRenderer | undefined;

    import("three").then((THREE) => {
      if (disposed || !container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      camera.position.z = 18;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const PARTICLE_COUNT = 220;
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: new THREE.Color("#0d94fb"),
        size: 0.12,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);

      const icoGeom = new THREE.IcosahedronGeometry(6, 1);
      const icoMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#286cd5"),
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      });
      const ico = new THREE.Mesh(icoGeom, icoMat);
      ico.position.set(6, -1, -6);
      scene.add(ico);

      const clock = new THREE.Clock();
      const animate = () => {
        if (disposed) return;
        const t = clock.getElapsedTime();
        points.rotation.y = t * 0.02;
        ico.rotation.y = t * 0.05;
        ico.rotation.x = t * 0.03;
        renderer!.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      const handleResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-70"
      style={{
        background:
          "radial-gradient(ellipse 60% 80% at 70% 20%, rgba(13,148,251,0.12), transparent 70%)",
      }}
    />
  );
}

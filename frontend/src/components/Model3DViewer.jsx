import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCw, ZoomIn, ZoomOut, Eye, Sparkles, Layers } from "lucide-react";

export default function Model3DViewer({ tables, chairs, vertices, onSelectPoint }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userDropLineRef = useRef(null);
  const animFrameRef = useRef(null);
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const cameraAnglesRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 5, radius: 140 });

  const [autoRotate, setAutoRotate] = useState(false);
  const [showPlanes, setShowPlanes] = useState(true);

  // Normalize coordinates for 3D scene:
  // X: Tables (0..60), maps to Three.js X (-30..30)
  // Y: Chairs (0..60), maps to Three.js Z (-30..30)
  // Z: Profit (0..2800), maps to Three.js Y (0..45)
  const to3D = (t, c, p) => {
    const x3d = (t - 30) * 1.1;
    const z3d = (c - 30) * 1.1;
    const y3d = (p / 2800) * 45;
    return new THREE.Vector3(x3d, y3d, z3d);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1b2e);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 1000);
    cameraRef.current = camera;
    const updateCameraPos = () => {
      const { theta, phi, radius } = cameraAnglesRef.current;
      camera.position.x = radius * Math.sin(theta) * Math.cos(phi);
      camera.position.y = Math.max(10, radius * Math.sin(phi));
      camera.position.z = radius * Math.cos(theta) * Math.cos(phi);
      camera.lookAt(0, 16, 0);
    };
    updateCameraPos();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x70aaff, 1.4);
    dirLight.position.set(60, 100, 50);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2, 200);
    pointLight.position.set(0, 50, 0);
    scene.add(pointLight);

    // 5. Ground Grid
    const gridHelper = new THREE.GridHelper(90, 18, 0x334e77, 0x1a2e4a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Coordinate Axes representation
    const axisGroup = new THREE.Group();
    // X Axis: Tables (Red/Blue)
    const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-35, 0, -35), new THREE.Vector3(45, 0, -35)]);
    const xMat = new THREE.LineBasicMaterial({ color: 0x4c8df6, linewidth: 2 });
    axisGroup.add(new THREE.Line(xGeo, xMat));

    // Y Axis: Chairs
    const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-35, 0, -35), new THREE.Vector3(-35, 0, 45)]);
    const zMat = new THREE.LineBasicMaterial({ color: 0x34d399, linewidth: 2 });
    axisGroup.add(new THREE.Line(zGeo, zMat));

    // Z Axis: Profit (Vertical)
    const yGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-35, 0, -35), new THREE.Vector3(-35, 52, -35)]);
    const yMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
    axisGroup.add(new THREE.Line(yGeo, yMat));
    scene.add(axisGroup);

    // 6. Feasible 3D Polyhedron / Prism
    // Corner Points in 3D:
    // O(0,0,0), A(60,0,2400), B(40,40,2800), C(0,60,1800)
    const O_ground = to3D(0, 0, 0);
    const A_ground = to3D(60, 0, 0);
    const B_ground = to3D(40, 40, 0);
    const C_ground = to3D(0, 60, 0);

    const O_top = to3D(0, 0, 0);
    const A_top = to3D(60, 0, 2400);
    const B_top = to3D(40, 40, 2800);
    const C_top = to3D(0, 60, 1800);

    // Ground polygon line
    const floorPoints = [O_ground, A_ground, B_ground, C_ground, O_ground];
    const floorGeo = new THREE.BufferGeometry().setFromPoints(floorPoints);
    const floorLine = new THREE.Line(floorGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 }));
    scene.add(floorLine);

    // Floor fill
    const floorShape = new THREE.Shape();
    floorShape.moveTo(O_ground.x, -O_ground.z);
    floorShape.lineTo(A_ground.x, -A_ground.z);
    floorShape.lineTo(B_ground.x, -B_ground.z);
    floorShape.lineTo(C_ground.x, -C_ground.z);
    floorShape.closePath();
    const floorShapeGeo = new THREE.ShapeGeometry(floorShape);
    floorShapeGeo.rotateX(Math.PI / 2);
    const floorShapeMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorShapeGeo, floorShapeMat);
    floorMesh.position.y = 0.05;
    scene.add(floorMesh);

    // 3D Polyhedron volume mesh
    const prismGeo = new THREE.BufferGeometry();
    // Vertices: 0: O_g, 1: A_g, 2: B_g, 3: C_g, 4: O_t, 5: A_t, 6: B_t, 7: C_t
    const pVerts = [
      O_ground.x, O_ground.y, O_ground.z, // 0
      A_ground.x, A_ground.y, A_ground.z, // 1
      B_ground.x, B_ground.y, B_ground.z, // 2
      C_ground.x, C_ground.y, C_ground.z, // 3
      O_top.x, O_top.y, O_top.z,          // 4
      A_top.x, A_top.y, A_top.z,          // 5
      B_top.x, B_top.y, B_top.z,          // 6
      C_top.x, C_top.y, C_top.z,          // 7
    ];
    // Faces (triangles):
    // Top face: (4, 5, 6), (4, 6, 7)
    // Wall OA: (0, 1, 5), (0, 5, 4)
    // Wall AB: (1, 2, 6), (1, 6, 5)
    // Wall BC: (2, 3, 7), (2, 7, 6)
    // Wall CO: (3, 0, 4), (3, 4, 7)
    const indices = [
      4, 5, 6, 4, 6, 7,
      0, 1, 5, 0, 5, 4,
      1, 2, 6, 1, 6, 5,
      2, 3, 7, 2, 7, 6,
      3, 0, 4, 3, 4, 7,
    ];
    prismGeo.setAttribute("position", new THREE.Float32BufferAttribute(pVerts, 3));
    prismGeo.setIndex(indices);
    prismGeo.computeVertexNormals();

    const prismMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      shininess: 90,
    });
    const prismMesh = new THREE.Mesh(prismGeo, prismMat);
    scene.add(prismMesh);

    // Wireframe edges on the 3D feasible prism
    const wireGeo = new THREE.WireframeGeometry(prismGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, linewidth: 1.5 });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    scene.add(wireframe);

    // 7. Corner point markers in 3D
    const cornerVertices = [
      { name: "O (0, 0, 0)", pos: O_top, optimal: false, profit: 0 },
      { name: "A (60, 0, 2400)", pos: A_top, optimal: false, profit: 2400 },
      { name: "B (40, 40, 2800) ★ OPTIMUM", pos: B_top, optimal: true, profit: 2800 },
      { name: "C (0, 60, 1800)", pos: C_top, optimal: false, profit: 1800 },
    ];

    cornerVertices.forEach((c) => {
      // Sphere
      const sphereGeo = new THREE.SphereGeometry(c.optimal ? 1.8 : 1.2, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: c.optimal ? 0xf59e0b : 0x93c5fd,
        emissive: c.optimal ? 0xd97706 : 0x1e3a8a,
        emissiveIntensity: c.optimal ? 0.9 : 0.4,
        roughness: 0.2,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(c.pos);
      scene.add(sphere);

      // Vertical line to ground
      const lineG = new THREE.BufferGeometry().setFromPoints([
        c.pos,
        new THREE.Vector3(c.pos.x, 0, c.pos.z),
      ]);
      const lineM = new THREE.LineDashedMaterial({
        color: c.optimal ? 0xfbbf24 : 0x64748b,
        dashSize: 1.5,
        gapSize: 1,
      });
      const dLine = new THREE.Line(lineG, lineM);
      dLine.computeLineDistances();
      scene.add(dLine);

      // Beacon halo for optimal point
      if (c.optimal) {
        const ringGeo = new THREE.RingGeometry(2.4, 3.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(c.pos);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
      }
    });

    // 8. User Plan Live 3D Marker
    const userMarkerGeo = new THREE.SphereGeometry(1.6, 24, 24);
    const userMarkerMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.8,
    });
    const userMarker = new THREE.Mesh(userMarkerGeo, userMarkerMat);
    scene.add(userMarker);
    userMarkerRef.current = userMarker;

    const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const dropLineMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
    const userDropLine = new THREE.Line(dropLineGeo, dropLineMat);
    scene.add(userDropLine);
    userDropLineRef.current = userDropLine;

    // 9. Animation Loop
    let angleOffset = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (autoRotate) {
        cameraAnglesRef.current.theta += 0.006;
        updateCameraPos();
      }

      // Subtle pulse on optimal beacon
      angleOffset += 0.04;

      renderer.render(scene, camera);
    };
    animate();

    // 10. Pointer / Touch Interaction for 3D rotation & zoom
    const onPointerDown = (e) => {
      isDraggingRef.current = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      prevPointerRef.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e) => {
      if (!isDraggingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevPointerRef.current.x;
      const deltaY = clientY - prevPointerRef.current.y;
      prevPointerRef.current = { x: clientX, y: clientY };

      cameraAnglesRef.current.theta -= deltaX * 0.008;
      cameraAnglesRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2.2, cameraAnglesRef.current.phi + deltaY * 0.008));
      updateCameraPos();
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      cameraAnglesRef.current.radius = Math.max(70, Math.min(230, cameraAnglesRef.current.radius + e.deltaY * 0.12));
      updateCameraPos();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    domEl.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      domEl.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      domEl.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      domEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(domEl)) container.removeChild(domEl);
    };
  }, []);

  // Update live user marker when tables or chairs change
  useEffect(() => {
    if (!userMarkerRef.current || !userDropLineRef.current) return;
    const profit = 40 * tables + 30 * chairs;
    const pos = to3D(tables, chairs, profit);
    userMarkerRef.current.position.copy(pos);

    // Update drop line
    const groundPos = new THREE.Vector3(pos.x, 0, pos.z);
    userDropLineRef.current.geometry.setFromPoints([pos, groundPos]);

    // Change marker color if feasible vs infeasible
    const labour = 4 * tables + 2 * chairs;
    const wood = 2 * tables + 4 * chairs;
    const feasible = tables >= 0 && chairs >= 0 && labour <= 240 && wood <= 240;

    userMarkerRef.current.material.color.setHex(feasible ? 0x10b981 : 0xef4444);
    userMarkerRef.current.material.emissive.setHex(feasible ? 0x059669 : 0xb91c1c);
    userDropLineRef.current.material.color.setHex(feasible ? 0x10b981 : 0xef4444);
  }, [tables, chairs]);

  // Camera preset views
  const setView = (theta, phi, radius = 140) => {
    cameraAnglesRef.current = { theta, phi, radius };
    if (cameraRef.current) {
      cameraRef.current.position.x = radius * Math.sin(theta) * Math.cos(phi);
      cameraRef.current.position.y = Math.max(10, radius * Math.sin(phi));
      cameraRef.current.position.z = radius * Math.cos(theta) * Math.cos(phi);
      cameraRef.current.lookAt(0, 16, 0);
    }
  };

  return (
    <div className="model-3d-container">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="model-3d-canvas" style={{ width: "100%", height: "430px", cursor: "grab" }} />

      {/* Floating 3D HUD & Controls */}
      <div className="model-3d-toolbar">
        <div className="model-3d-chip">
          <span className="dot-pulse" />
          <span>Interactive 3D Solution Space (Touch & Drag to Rotate)</span>
        </div>

        <div className="model-3d-actions">
          <button
            type="button"
            className="model-3d-btn"
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle 360° Auto-Rotation"
          >
            <RotateCw size={13} className={autoRotate ? "spin-icon" : ""} />
            <span>{autoRotate ? "Pause" : "Auto-Rotate"}</span>
          </button>

          <button
            type="button"
            className="model-3d-btn"
            onClick={() => setView(Math.PI / 4, Math.PI / 5, 140)}
            title="Isometric 3D Perspective"
          >
            <Eye size={13} />
            <span>Perspective</span>
          </button>

          <button
            type="button"
            className="model-3d-btn"
            onClick={() => setView(0.01, Math.PI / 2.05, 130)}
            title="Top-Down 2D Projection"
          >
            <Layers size={13} />
            <span>Top (2D)</span>
          </button>

          <button
            type="button"
            className="model-3d-btn"
            onClick={() => setView(Math.PI * 0.45, Math.PI / 8, 95)}
            title="Focus on Optimal Peak B (40, 40, 2800)"
          >
            <Sparkles size={13} style={{ color: "#f59e0b" }} />
            <span>Peak B</span>
          </button>
        </div>
      </div>

      {/* 3D Model Legend */}
      <div className="model-3d-legend">
        <span><i style={{ background: "#4c8df6" }} /> X: Tables (0..60)</span>
        <span><i style={{ background: "#34d399" }} /> Y: Chairs (0..60)</span>
        <span><i style={{ background: "#f59e0b" }} /> Height (Z): Profit Z = 40X + 30Y</span>
        <span><i style={{ background: "#38bdf8" }} /> 3D Feasible Prism</span>
        <span><i style={{ background: "#f59e0b", borderRadius: "50%" }} /> Optimal Vertex B (40, 40, 2800)</span>
        <span><i style={{ background: "#ef4444", borderRadius: "50%" }} /> Your Plan ({tables}, {chairs})</span>
      </div>
    </div>
  );
}

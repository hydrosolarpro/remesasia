import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw, Zap, Shield, ArrowRight, Smartphone, Sparkles, Globe as GlobeIcon } from 'lucide-react';

interface HeroMap3DProps {
  onOpenDemoModal: () => void;
}

export const HeroMap3D: React.FC<HeroMap3DProps> = ({ onOpenDemoModal }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activePreset, setActivePreset] = useState<'route' | 'peru' | 'venezuela'>('route');

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const currentContainer = mountRef.current;
    if (!currentContainer) return;

    const width = currentContainer.clientWidth;
    const height = currentContainer.clientHeight;

    // 1. Generate High-Resolution Realistic Earth Texture
    const createEarthTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.CanvasTexture(canvas);

      const w = canvas.width;
      const h = canvas.height;

      // Convert Lat/Lon to Canvas X/Y
      const toX = (lon: number) => ((lon + 180) / 360) * w;
      const toY = (lat: number) => ((90 - lat) / 180) * h;

      // A. Ocean Base Gradient (Deep Atlantic & Pacific Blue)
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#020916');
      oceanGrad.addColorStop(0.2, '#071d3a');
      oceanGrad.addColorStop(0.5, '#0b284e');
      oceanGrad.addColorStop(0.8, '#071d3a');
      oceanGrad.addColorStop(1, '#020916');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);

      // B. Shallow Coastal Glow / Shelf
      ctx.fillStyle = '#0e4166';
      ctx.shadowColor = '#1e6898';
      ctx.shadowBlur = 15;

      // C. Helper to draw continent polygons
      const drawPolygon = (coords: Array<[number, number]>, fillStyle: string, strokeStyle?: string) => {
        if (coords.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(toX(coords[0][1]), toY(coords[0][0]));
        for (let i = 1; i < coords.length; i++) {
          ctx.lineTo(toX(coords[i][1]), toY(coords[i][0]));
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };

      // D. Realistic Continent Polygons (Lat, Lon)
      // SOUTH AMERICA (High detail with Amazon rainforest + Andes mountains)
      const southAmerica: Array<[number, number]> = [
        [12.5, -72.0], [10.5, -62.0], [8.0, -59.0], [5.0, -52.5], [0.0, -50.0],
        [-5.0, -35.0], [-10.0, -36.5], [-20.0, -40.0], [-23.0, -43.0], [-30.0, -50.0],
        [-40.0, -62.0], [-55.0, -67.0], [-52.0, -75.0], [-45.0, -74.0], [-35.0, -72.0],
        [-18.0, -70.5], [-12.0, -77.2], [-5.0, -81.0], [1.0, -79.0], [8.0, -77.5],
        [11.5, -73.0]
      ];

      // NORTH AMERICA
      const northAmerica: Array<[number, number]> = [
        [72, -165], [70, -130], [60, -80], [50, -55], [45, -64],
        [30, -81], [25, -80], [25, -97], [18, -95], [15, -88],
        [8, -77], [14, -92], [20, -105], [32, -117], [48, -124],
        [60, -145], [65, -168]
      ];

      // EURASIA
      const eurasia: Array<[number, number]> = [
        [70, 10], [75, 40], [70, 80], [70, 170], [60, 160],
        [50, 140], [35, 120], [22, 114], [10, 105], [8, 77],
        [24, 62], [28, 48], [12, 44], [30, 32], [36, 36],
        [40, 26], [38, 9], [44, -8], [58, 5], [62, 6]
      ];

      // AFRICA
      const africa: Array<[number, number]> = [
        [37, 10], [32, 32], [12, 43], [10, 51], [-12, 40],
        [-34, 26], [-34, 18], [-18, 12], [0, 9], [5, -4],
        [15, -17], [28, -13], [35, -6]
      ];

      // AUSTRALIA
      const australia: Array<[number, number]> = [
        [-12, 130], [-14, 142], [-25, 153], [-38, 145],
        [-32, 115], [-22, 114]
      ];

      // ANTARCTICA
      const antarctica: Array<[number, number]> = [
        [-65, -180], [-65, -90], [-65, 0], [-65, 90], [-65, 180],
        [-90, 180], [-90, -180]
      ];

      ctx.shadowBlur = 0;

      // Draw Base Continents in Satellite Terrain Tones
      drawPolygon(antarctica, '#dbeafe');
      drawPolygon(northAmerica, '#2d5a3f');
      drawPolygon(eurasia, '#2d5a3f');
      drawPolygon(africa, '#5c4a30');
      drawPolygon(australia, '#6b5333');

      // Draw South America with Special High Detail
      drawPolygon(southAmerica, '#1e4d2b');

      // E. Detailed Amazon Rainforest & Andes Range overlay for South America
      // Amazon Basin (Lush Green)
      const amazonPoly: Array<[number, number]> = [
        [5, -65], [2, -52], [-5, -48], [-12, -55], [-10, -70], [-2, -73]
      ];
      drawPolygon(amazonPoly, '#14532d');

      // Andes Mountain Chain (Earth Brown Running along West Coast)
      const andesPoly: Array<[number, number]> = [
        [10, -73], [2, -78], [-8, -78], [-15, -74], [-22, -70], [-35, -71],
        [-52, -73], [-50, -75], [-35, -73], [-20, -72], [-12, -77], [1, -79]
      ];
      drawPolygon(andesPoly, '#785d3f');

      // F. Peru & Venezuela Highlighted Territories on Map
      // Venezuela
      const venezuelaPoly: Array<[number, number]> = [
        [12.2, -71.5], [10.8, -62.0], [6.0, -61.0], [1.5, -66.5], [6.0, -73.0]
      ];
      drawPolygon(venezuelaPoly, 'rgba(16, 185, 129, 0.45)', '#10b981');

      // Peru
      const peruPoly: Array<[number, number]> = [
        [-0.0, -75.2], [-3.5, -70.0], [-12.5, -68.7], [-18.3, -70.3], [-15.5, -75.0], [-4.0, -81.3]
      ];
      drawPolygon(peruPoly, 'rgba(59, 130, 246, 0.45)', '#3b82f6');

      // G. Glowing Golden City Lights at Night
      const cityLights: Array<{ lat: number; lon: number; r: number }> = [
        // Peru & Venezuela Primary Lights
        { lat: -12.043, lon: -77.028, r: 6 }, // Lima
        { lat: 10.480, lon: -66.903, r: 6 },  // Caracas
        { lat: 10.162, lon: -67.994, r: 4 },  // Valencia VE
        { lat: -16.409, lon: -71.537, r: 4 }, // Arequipa PE
        { lat: -8.111, lon: -79.028, r: 4 },  // Trujillo PE

        // Other Major World Lights
        { lat: 4.711, lon: -74.072, r: 4 },   // Bogota
        { lat: -23.550, lon: -46.633, r: 5 }, // Sao Paulo
        { lat: -34.603, lon: -58.381, r: 4 }, // Buenos Aires
        { lat: 40.712, lon: -74.006, r: 5 },  // NYC
        { lat: 25.761, lon: -80.191, r: 4 },  // Miami
        { lat: 51.507, lon: -0.127, r: 5 },   // London
        { lat: 35.676, lon: 139.650, r: 5 }   // Tokyo
      ];

      cityLights.forEach((city) => {
        const cx = toX(city.lon);
        const cy = toY(city.lat);

        const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, city.r * 2.5);
        radial.addColorStop(0, '#fef08a');
        radial.addColorStop(0.3, '#f59e0b');
        radial.addColorStop(1, 'rgba(245, 158, 11, 0)');

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(cx, cy, city.r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // H. High-Tech Navigation Graticule Grid (Latitude/Longitude Lines)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;

      // Latitudes
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        ctx.moveTo(0, toY(lat));
        ctx.lineTo(w, toY(lat));
        ctx.stroke();
      }
      // Longitudes
      for (let lon = -150; lon <= 150; lon += 30) {
        ctx.beginPath();
        ctx.moveTo(toX(lon), 0);
        ctx.lineTo(toX(lon), h);
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    };

    // 2. Generate Cloud Layer Texture
    const createCloudTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.CanvasTexture(canvas);

      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw realistic soft cloud wisps
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const rad = 20 + Math.random() * 60;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      return new THREE.CanvasTexture(canvas);
    };

    // Scene & Camera setup
    const scene = new THREE.Scene();
    const isMobileInit = window.innerWidth < 640;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, isMobileInit ? 10.2 : 8.2);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentContainer.appendChild(renderer.domElement);

    // Group for entire rotating Earth system
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    groupRef.current = globeGroup;

    // A. Main Photorealistic Earth Sphere
    const sphereRadius = 2.8;
    const earthGeom = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const earthTexture = createEarthTexture();

    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 25,
      specular: new THREE.Color(0x38bdf8),
      bumpScale: 0.05
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    globeGroup.add(earthMesh);

    // B. Rotating Cloud Shell Layer
    const cloudGeom = new THREE.SphereGeometry(sphereRadius * 1.015, 48, 48);
    const cloudTexture = createCloudTexture();
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
    globeGroup.add(cloudMesh);

    // C. Atmosphere Outer Blue Glow Halo
    const atmosphereGeom = new THREE.SphereGeometry(sphereRadius * 1.08, 48, 48);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeom, atmosphereMat);
    globeGroup.add(atmosphereMesh);

    // 3. Coordinate Conversion Math: Lat/Long -> 3D Point on Sphere
    const latLongToVector3 = (lat: number, lon: number, radius: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);

      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);

      return new THREE.Vector3(x, y, z);
    };

    // Coords: Lima, Peru & Caracas, Venezuela
    const posPeru = latLongToVector3(-12.043, -77.028, sphereRadius * 1.01);
    const posVenezuela = latLongToVector3(10.480, -66.903, sphereRadius * 1.01);

    // 4. Country Pins & Pulsing Radar Targets
    const createMarkerPin = (position: THREE.Vector3, colorHex: number, label: string) => {
      // Glowing Pin Head
      const pinGeom = new THREE.SphereGeometry(0.09, 16, 16);
      const pinMat = new THREE.MeshPhongMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.9
      });
      const pinMesh = new THREE.Mesh(pinGeom, pinMat);
      pinMesh.position.copy(position);
      globeGroup.add(pinMesh);

      // Radar Pulse Ring
      const ringGeom = new THREE.RingGeometry(0.1, 0.28, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(position);
      ringMesh.lookAt(position.clone().multiplyScalar(2));
      globeGroup.add(ringMesh);

      return { pinMesh, ringMesh };
    };

    const peruMarker = createMarkerPin(posPeru, 0x3b82f6, 'PERÚ');       // Blue
    const venMarker = createMarkerPin(posVenezuela, 0x10b981, 'VENEZUELA'); // Emerald

    // 5. Elevated Curved Bezier Arc (Transnational Money Flow)
    const distance = posPeru.distanceTo(posVenezuela);
    const midPoint = posPeru.clone().add(posVenezuela).multiplyScalar(0.5);
    const midLength = midPoint.length();
    midPoint.normalize();
    midPoint.multiplyScalar(midLength + distance * 0.48);

    const curve = new THREE.QuadraticBezierCurve3(posPeru, midPoint, posVenezuela);
    const arcPoints = curve.getPoints(80);
    const lineGeom = new THREE.BufferGeometry().setFromPoints(arcPoints);

    // Main Glowing Arc Line
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      linewidth: 3
    });
    const arcLine = new THREE.Line(lineGeom, lineMat);
    globeGroup.add(arcLine);

    // Secondary Cyan/Gold Ambient Trail Line
    const arcLineGlow = new THREE.Line(
      lineGeom,
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.4 })
    );
    arcLineGlow.scale.set(1.02, 1.02, 1.02);
    globeGroup.add(arcLineGlow);

    // 6. Flowing Energy Particles Along the Arc
    const particleCount = 5;
    const particles: { mesh: THREE.Mesh; progress: number; speed: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const pGeom = new THREE.SphereGeometry(0.06, 12, 12);
      const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      globeGroup.add(pMesh);

      particles.push({
        mesh: pMesh,
        progress: i / particleCount,
        speed: 0.007 + Math.random() * 0.003
      });
    }

    // Realistic Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(6, 4, 8);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-6, -2, -6);
    scene.add(rimLight);

    // Initial Globe Orientation Facing Peru & Venezuela
    globeGroup.rotation.x = 0.22;
    globeGroup.rotation.y = 5.968;

    // Mouse & Touch Drag Rotation Handling
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !groupRef.current) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      groupRef.current.rotation.y += deltaX * 0.005;
      groupRef.current.rotation.x += deltaY * 0.005;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let lastTime = clock.getElapsedTime();
    let pauseTimeRemaining = 2.5; // Initial 2.5s pause on Peru-Venezuela view on load
    let hasPausedThisCycle = true;

    const TARGET_Y = (Math.PI * 2) - 0.315; // ~5.968 rad - Angle centering Peru (-77° lon) & Venezuela (-67° lon)
    const PAUSE_DURATION = 4.5; // Pause 4.5 seconds on Peru - Venezuela route
    const SPIN_SPEED = 0.018; // Fast spin speed across rest of the globe

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const delta = Math.min(elapsedTime - lastTime, 0.1);
      lastTime = elapsedTime;

      // Auto rotation if enabled and not being manually dragged
      if (autoRotate && !isDragging && groupRef.current) {
        // Smoothly bring rotation.x back to default tilt
        groupRef.current.rotation.x += (0.22 - groupRef.current.rotation.x) * 0.05;

        const TWO_PI = Math.PI * 2;

        if (pauseTimeRemaining > 0) {
          // Lock globe rotation while paused on Peru - Venezuela connection view
          pauseTimeRemaining -= delta;
          if (pauseTimeRemaining <= 0) {
            pauseTimeRemaining = 0;
            hasPausedThisCycle = true;
          }
        } else {
          const currentY = groupRef.current.rotation.y;
          const normY = ((currentY % TWO_PI) + TWO_PI) % TWO_PI;

          // Calculate distance to TARGET_Y in forward rotation direction
          let dist = TARGET_Y - normY;
          if (dist < 0) dist += TWO_PI;

          if (hasPausedThisCycle) {
            // Unflag once we have rotated away from target
            if (dist < TWO_PI - 0.8) {
              hasPausedThisCycle = false;
            }
            groupRef.current.rotation.y += SPIN_SPEED;
          } else {
            // Approaching Peru-Venezuela target view
            if (dist < 0.4) {
              if (dist <= SPIN_SPEED * 1.5) {
                // Snap directly to exact Peru-Venezuela angle and pause
                const base = currentY - normY;
                groupRef.current.rotation.y = base + TARGET_Y;
                pauseTimeRemaining = PAUSE_DURATION;
              } else {
                // Decelerate smoothly as we lock onto Peru-Venezuela view
                const speed = Math.max(0.002, SPIN_SPEED * (dist / 0.4));
                groupRef.current.rotation.y += speed;
              }
            } else {
              // Fast rotation speed around the rest of the world
              groupRef.current.rotation.y += SPIN_SPEED;
            }
          }
        }
      }

      // Rotate cloud layer slightly faster for realistic depth effect
      cloudMesh.rotation.y += 0.0006;

      // Pulse Radar Rings
      const scaleVal = 1 + Math.sin(elapsedTime * 3.5) * 0.25;
      peruMarker.ringMesh.scale.set(scaleVal, scaleVal, scaleVal);
      venMarker.ringMesh.scale.set(scaleVal, scaleVal, scaleVal);

      // Advance particles along arc trajectory
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const currentPos = curve.getPointAt(p.progress);
        p.mesh.position.copy(currentPos);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Responsive Resize Listener
    const handleResize = () => {
      if (!currentContainer) return;
      const w = currentContainer.clientWidth;
      const h = currentContainer.clientHeight;
      camera.aspect = w / h;
      camera.position.z = w < 640 ? 10.2 : 8.2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animationFrameId);
      if (currentContainer && renderer.domElement) {
        currentContainer.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate]);

  // Camera Preset Views
  const handlePresetChange = (preset: 'route' | 'peru' | 'venezuela') => {
    setActivePreset(preset);
    if (!groupRef.current) return;

    setAutoRotate(false);
    if (preset === 'route') {
      groupRef.current.rotation.x = 0.22;
      groupRef.current.rotation.y = 1.35;
    } else if (preset === 'peru') {
      groupRef.current.rotation.x = 0.25;
      groupRef.current.rotation.y = 1.2;
    } else if (preset === 'venezuela') {
      groupRef.current.rotation.x = -0.12;
      groupRef.current.rotation.y = 1.52;
    }
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-4 pt-24 pb-16 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Dynamic Background Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415515_1px,transparent_1px),linear-gradient(to_bottom,#33415515_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Headline & Hero Copy */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold uppercase tracking-wider text-blue-400 shadow-lg shadow-blue-500/10">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>REMESAS AUTOMÁTIZADAS PERÚ - VENEZUELA</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black italic uppercase leading-none tracking-tighter text-white">
            INTEGRACIÓN AUTOMÁTICA <br className="hidden sm:inline" />
            <span className="text-blue-500">SIN FRONTERAS</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
            Control total de operaciones transnacionales entre Perú y Venezuela en tiempo real. Digitaliza tu negocio de remesas con automatización, notificaciones instantáneas y perfil multi-operador.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer border border-blue-400/30"
            >
              <Smartphone className="w-5 h-5" />
              <span>Solicita Demo Gratis (7 Días)</span>
            </button>

            <a
              href={`https://wa.me/51960442025?text=${encodeURIComponent("Hola!, deseo ingresar a la Plaforma Remesas PERÚ-VENEZUELA  con la prueba gratuita por 7 días.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Contactar por WhatsApp</span>
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </a>
          </div>

          {/* Security Features List */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-400 pt-2 font-mono">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" /> Automatizaciones eficientes
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-400" /> Sincronización Cloud 24/7
            </span>
          </div>
        </div>

        {/* Right Interactive Realistic 3D Globe Container */}
        <div className="lg:col-span-6 relative w-full h-[450px] sm:h-[480px] lg:h-[520px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl flex flex-col justify-between p-3 sm:p-4 card-beam-highlight info-card-interactive">
          {/* Header Controls Overlay */}
          <div className="relative z-20 flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800 backdrop-blur-md shadow-md">
            <div className="flex items-center gap-1.5 min-w-0">
              <GlobeIcon className="w-4 h-4 text-blue-400 animate-spin-slow shrink-0" />
              <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-200 tracking-wider uppercase truncate">
                PLANETA 3D PE ↔ VE
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => handlePresetChange('route')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activePreset === 'route' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Ruta
              </button>
              <button
                onClick={() => handlePresetChange('peru')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activePreset === 'peru' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🇵🇪 Perú
              </button>
              <button
                onClick={() => handlePresetChange('venezuela')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activePreset === 'venezuela' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                }`}
              >
                🇻🇪 Vzla
              </button>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-1 sm:p-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  autoRotate ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-800/80 border-slate-700 text-slate-500'
                }`}
                title="Giro automático del planeta"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Three.js Canvas Container */}
          <div ref={mountRef} className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Floating HUD Cards on Canvas */}
          <div className="relative z-20 pointer-events-none grid grid-cols-2 gap-2 mt-auto">
            {/* Peru Node Badge */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-blue-500/40 backdrop-blur-md shadow-lg flex items-center gap-2 pointer-events-auto card-beam-highlight info-card-interactive">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs sm:text-sm font-bold text-blue-400 shrink-0">
                🇵🇪
              </div>
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[9px] font-mono uppercase font-bold text-blue-400 tracking-wider truncate">NODO PERÚ</div>
                <div className="text-[10px] sm:text-xs font-bold text-white truncate">Perú (Soles)</div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 font-mono truncate hidden sm:block">Yape / Plin / Bancos</div>
              </div>
            </div>

            {/* Venezuela Node Badge */}
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 backdrop-blur-md shadow-lg flex items-center gap-2 pointer-events-auto card-beam-highlight info-card-interactive">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs sm:text-sm font-bold text-emerald-400 shrink-0">
                🇻🇪
              </div>
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[9px] font-mono uppercase font-bold text-emerald-400 tracking-wider truncate">NODO VENEZUELA</div>
                <div className="text-[10px] sm:text-xs font-bold text-white truncate">Venezuela (Bs)</div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 font-mono truncate hidden sm:block">Pago Móvil / Bancos</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

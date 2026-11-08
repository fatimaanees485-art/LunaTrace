import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DatasetLayer, LunarLandingSite } from '../types/lunar';
import {
  getSubsolarPoint,
  getSubEarthPoint,
  getLunarPhase,
  computeEphemerisPoint,
  LUNAR_RADIUS_KM
} from '../utils/lunarMath';
import {
  STANDARD_LANDER_PROFILES,
  LanderSafetyProfile,
  classifySlope,
  SlopeVisualizationMode
} from '../utils/slopeAnalysis';
import {
  Layers,
  Eye,
  ShieldCheck,
  Sun,
  Radio,
  Compass,
  Crosshair,
  Grid,
  Globe,
  Activity,
  Zap,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Sliders
} from 'lucide-react';

interface LunarGlobeProps {
  sites: LunarLandingSite[];
  selectedSite: LunarLandingSite;
  onSelectSite: (site: LunarLandingSite) => void;
  activeLayer: DatasetLayer;
  setActiveLayer: (layer: DatasetLayer) => void;
  currentTimestampMs: number;
}

interface HoverSlopeProbe {
  latDeg: number;
  lonDeg: number;
  slopeDeg: number;
  status: 'safe' | 'caution' | 'hazardous';
  label: string;
  colorHex: string;
  tipOverRiskPct: number;
  screenX: number;
  screenY: number;
}

export const LunarGlobe: React.FC<LunarGlobeProps> = ({
  sites,
  selectedSite,
  onSelectSite,
  activeLayer,
  setActiveLayer,
  currentTimestampMs
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const graticuleGroupRef = useRef<THREE.Group | null>(null);
  const orbitalVectorsGroupRef = useRef<THREE.Group | null>(null);
  const siteMarkersGroupRef = useRef<THREE.Group | null>(null);
  const targetCameraPosRef = useRef<THREE.Vector3 | null>(null);

  // High-Tech Visual Feature Toggles
  const [showGraticule, setShowGraticule] = useState(true);
  const [showOrbitalVectors, setShowOrbitalVectors] = useState(true);

  // Slope Analysis & Lander Tolerance State
  const [selectedLanderProfile, setSelectedLanderProfile] = useState<LanderSafetyProfile>(STANDARD_LANDER_PROFILES[0]);
  const [slopeVizMode, setSlopeVizMode] = useState<SlopeVisualizationMode>('safety_bands');
  const [customSafeSlope, setCustomSafeSlope] = useState<number>(8.0);
  const [customCautionSlope, setCustomCautionSlope] = useState<number>(12.0);
  const [hoverProbe, setHoverProbe] = useState<HoverSlopeProbe | null>(null);

  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [slopePanelCollapsed, setSlopePanelCollapsed] = useState(false);
  const [telemetryCollapsed, setTelemetryCollapsed] = useState(false);

  // Slope numerical grid for instant coordinate sampling (1024 x 512)
  const textureWidth = 1024;
  const textureHeight = 512;
  const slopeGridRef = useRef<Float32Array | null>(null);

  // Procedural lunar textures for each dataset layer
  const texturesRef = useRef<Record<DatasetLayer, THREE.CanvasTexture | null>>({
    albedo: null,
    elevation: null,
    slope: null,
    illumination: null,
    psr: null,
    comms: null
  });

  // Astrodynamic calculations for current simulated epoch
  const subsolar = useMemo(() => getSubsolarPoint(currentTimestampMs), [currentTimestampMs]);
  const subearth = useMemo(() => getSubEarthPoint(currentTimestampMs), [currentTimestampMs]);
  const lunarPhase = useMemo(() => getLunarPhase(currentTimestampMs), [currentTimestampMs]);
  const currentEphemeris = useMemo(() => computeEphemerisPoint(selectedSite, currentTimestampMs), [selectedSite, currentTimestampMs]);

  // Active profile taking custom threshold into account
  const activeProfile = useMemo<LanderSafetyProfile>(() => {
    if (selectedLanderProfile.id === 'custom') {
      return {
        id: 'custom',
        name: 'Custom Lander Specification',
        subTitle: 'User Configured Tolerances',
        maxSafeSlopeDeg: customSafeSlope,
        cautionSlopeDeg: customCautionSlope,
        nonTraversableSlopeDeg: customCautionSlope,
        maxSurfaceRoughnessCm: 35,
        description: `Custom lander profile with ≤${customSafeSlope}° safe slope threshold and >${customCautionSlope}° abort limit.`
      };
    }
    return selectedLanderProfile;
  }, [selectedLanderProfile, customSafeSlope, customCautionSlope]);

  // Generate / Update Slope Texture
  const updateSlopeTexture = useCallback((profile: LanderSafetyProfile, mode: SlopeVisualizationMode) => {
    if (!slopeGridRef.current) return;
    const slopeGrid = slopeGridRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(textureWidth, textureHeight);
    const data = imgData.data;

    for (let y = 0; y < textureHeight; y++) {
      for (let x = 0; x < textureWidth; x++) {
        const idx = (y * textureWidth + x) * 4;
        const slope = slopeGrid[y * textureWidth + x];

        let r = 0, g = 0, b = 0;

        if (mode === 'safety_bands') {
          if (slope <= profile.maxSafeSlopeDeg) {
            const factor = 0.75 + (1 - slope / profile.maxSafeSlopeDeg) * 0.25;
            r = Math.floor(16 * factor);
            g = Math.floor(185 * factor);
            b = Math.floor(129 * factor);
          } else if (slope <= profile.cautionSlopeDeg) {
            r = 245;
            g = 158;
            b = 11;
          } else {
            const steepnessBonus = Math.min(1.0, (slope - profile.cautionSlopeDeg) / 15);
            r = 239;
            g = Math.floor(68 * (1 - steepnessBonus));
            b = Math.floor(68 * (1 - steepnessBonus));
          }
        } else {
          if (slope < 4) {
            const t = slope / 4;
            r = Math.floor(14 + t * 10);
            g = Math.floor(116 + t * 60);
            b = Math.floor(144 + t * 20);
          } else if (slope < 8) {
            const t = (slope - 4) / 4;
            r = Math.floor(20 + t * 50);
            g = Math.floor(180 + t * 20);
            b = Math.floor(120 - t * 60);
          } else if (slope < 12) {
            const t = (slope - 8) / 4;
            r = Math.floor(180 + t * 60);
            g = Math.floor(200 + t * 20);
            b = Math.floor(40 - t * 30);
          } else if (slope < 18) {
            const t = (slope - 12) / 6;
            r = Math.floor(240 + t * 10);
            g = Math.floor(140 - t * 40);
            b = 20;
          } else if (slope < 26) {
            const t = (slope - 18) / 8;
            r = 230;
            g = Math.floor(50 - t * 25);
            b = Math.floor(50 - t * 25);
          } else {
            r = 217;
            g = 70;
            b = 239;
          }
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    texturesRef.current.slope?.dispose();
    texturesRef.current.slope = tex;

    if (activeLayer === 'slope' && moonMeshRef.current) {
      const mat = moonMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = tex;
      mat.needsUpdate = true;
    }
  }, [activeLayer]);

  // Compute elevation & slope grid once on mount
  useEffect(() => {
    const elevGrid = new Float32Array(textureWidth * textureHeight);
    const slopeGrid = new Float32Array(textureWidth * textureHeight);

    const hash = (x: number, y: number) => {
      const val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return val - Math.floor(val);
    };

    for (let y = 0; y < textureHeight; y++) {
      const lat = 90 - (y / textureHeight) * 180;
      const isSouthPole = lat < -75;
      const southPoleFactor = Math.max(0, (-lat - 75) / 15);

      for (let x = 0; x < textureWidth; x++) {
        const lon = (x / textureWidth) * 360 - 180;
        const idx = y * textureWidth + x;

        const n1 = hash(Math.floor(x / 4), Math.floor(y / 4));
        const n2 = hash(Math.floor(x / 16), Math.floor(y / 16));
        const n3 = hash(Math.floor(x / 64), Math.floor(y / 64));
        const baseNoise = n1 * 0.15 + n2 * 0.35 + n3 * 0.5;

        const isNearSide = Math.abs(lon) < 90 && lat > -45 && lat < 45;
        const mariaEffect = isNearSide && baseNoise < 0.45;

        let elev = baseNoise;
        if (mariaEffect) elev *= 0.35;
        if (isSouthPole) elev = baseNoise * 0.75 + southPoleFactor * 0.3;

        const craterCenterDist = Math.abs(lat - (-89.9)) + Math.abs(lon - 0) * 0.05;
        if (craterCenterDist < 3.0) {
          elev += Math.sin(craterCenterDist * 2.5) * 0.35;
        }

        elevGrid[idx] = elev;
      }
    }

    for (let y = 0; y < textureHeight; y++) {
      for (let x = 0; x < textureWidth; x++) {
        const idx = y * textureWidth + x;

        const xPrev = (x - 1 + textureWidth) % textureWidth;
        const xNext = (x + 1) % textureWidth;
        const yPrev = Math.max(0, y - 1);
        const yNext = Math.min(textureHeight - 1, y + 1);

        const dx = (elevGrid[y * textureWidth + xNext] - elevGrid[y * textureWidth + xPrev]) * 0.5;
        const dy = (elevGrid[yNext * textureWidth + x] - elevGrid[yPrev * textureWidth + x]) * 0.5;

        const gradMag = Math.sqrt(dx * dx + dy * dy);
        const slopeDeg = Math.min(36, Math.atan(gradMag * 6.5) * (180 / Math.PI));
        slopeGrid[idx] = Number(slopeDeg.toFixed(2));
      }
    }

    slopeGridRef.current = slopeGrid;

    const createNonSlopeTexture = (type: DatasetLayer): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = textureWidth;
      canvas.height = textureHeight;
      const ctx = canvas.getContext('2d')!;
      const imgData = ctx.createImageData(textureWidth, textureHeight);
      const data = imgData.data;

      for (let y = 0; y < textureHeight; y++) {
        const lat = 90 - (y / textureHeight) * 180;
        const isSouthPole = lat < -75;

        for (let x = 0; x < textureWidth; x++) {
          const lon = (x / textureWidth) * 360 - 180;
          const idx = (y * textureWidth + x) * 4;
          const elev = elevGrid[y * textureWidth + x];

          let r = 0, g = 0, b = 0;

          if (type === 'albedo') {
            const isNearSide = Math.abs(lon) < 90 && lat > -45 && lat < 45;
            let val = (isNearSide && elev < 0.35) ? 55 + elev * 80 : 135 + elev * 90;
            if (hash(x * 3, y * 3) > 0.985) val = 245;
            r = g = b = Math.min(255, Math.floor(val));
          } else if (type === 'elevation') {
            if (elev < 0.25) {
              r = 40; g = 20; b = 120 + elev * 400;
            } else if (elev < 0.5) {
              r = 10; g = 120 + (elev - 0.25) * 400; b = 160;
            } else if (elev < 0.75) {
              r = 200 + (elev - 0.5) * 200; g = 180 + (elev - 0.5) * 150; b = 30;
            } else {
              r = 250; g = 100 + (elev - 0.75) * 600; b = 100 + (elev - 0.75) * 600;
            }
          } else if (type === 'illumination') {
            let illum = 0.3 + elev * 0.4;
            if (isSouthPole) illum = elev > 0.55 ? 0.85 + (elev - 0.55) * 0.3 : elev * 0.2;
            r = Math.floor(illum * 255);
            g = Math.floor(illum * 215);
            b = Math.floor(illum * 70);
          } else if (type === 'psr') {
            if (isSouthPole && elev < 0.32) {
              r = 34; g = 211; b = 238;
            } else {
              const bg = Math.floor(elev * 60 + 20);
              r = g = b = bg;
            }
          } else if (type === 'comms') {
            const earthVisible = Math.abs(lon) < 85 && (lat > -87 || elev > 0.45);
            if (earthVisible) {
              r = 14; g = 116; b = 144;
            } else {
              r = 30; g = 41; b = 59;
            }
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    };

    texturesRef.current.albedo = createNonSlopeTexture('albedo');
    texturesRef.current.elevation = createNonSlopeTexture('elevation');
    texturesRef.current.illumination = createNonSlopeTexture('illumination');
    texturesRef.current.psr = createNonSlopeTexture('psr');
    texturesRef.current.comms = createNonSlopeTexture('comms');

    updateSlopeTexture(STANDARD_LANDER_PROFILES[0], 'safety_bands');

    return () => {
      Object.values(texturesRef.current).forEach(t => t?.dispose());
    };
  }, [updateSlopeTexture]);

  useEffect(() => {
    updateSlopeTexture(activeProfile, slopeVizMode);
  }, [activeProfile, slopeVizMode, updateSlopeTexture]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x030509);

    // Deep space stars with magnitude variations
    const starCount = isSoftwareGl ? 350 : 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const radius = 90 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[idx] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[idx + 2] = radius * Math.cos(phi);

      const tone = 0.5 + Math.random() * 0.5;
      starColors[idx] = tone * (0.8 + Math.random() * 0.2);
      starColors[idx + 1] = tone * (0.85 + Math.random() * 0.15);
      starColors[idx + 2] = tone;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.85,
      sizeAttenuation: true
    });
    scene.add(new THREE.Points(starGeo, starMat));

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
    camera.position.set(0, -6.4, 3.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3.2;
    controls.maxDistance = 16.0;
    controls.target.set(0, -0.6, 0);
    controlsRef.current = controls;

    // Aerospace Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x1e293b, 0x05070a, 0.35);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffdf0, 2.3);
    sunLight.position.set(12, 0, 4);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // High-precision Moon Sphere
    const moonRadius = 2.4;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      map: texturesRef.current[activeLayer] || null,
      roughness: 0.85,
      metalness: 0.05
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;

    // Glowing Coordinate Graticule Group (Parallels & Meridians)
    const graticuleGroup = new THREE.Group();
    scene.add(graticuleGroup);
    graticuleGroupRef.current = graticuleGroup;

    const gratRadius = moonRadius + 0.008;
    const gratMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.3
    });
    const gratPolarMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6
    });

    // Latitude Parallels: 0°, ±30°, ±60°, -80°, -85°, -88°
    const latAngles = [0, 30, -30, 60, -60, -75, -80, -85, -88];
    latAngles.forEach(lat => {
      const latRad = lat * (Math.PI / 180);
      const rRing = gratRadius * Math.cos(latRad);
      const yRing = gratRadius * Math.sin(latRad);

      const segments = 64;
      const ringPts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(rRing * Math.sin(theta), yRing, rRing * Math.cos(theta)));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      const ringLine = new THREE.Line(ringGeo, Math.abs(lat) >= 80 ? gratPolarMat : gratMat);
      graticuleGroup.add(ringLine);
    });

    // Longitude Meridians every 30°
    for (let lon = 0; lon < 360; lon += 30) {
      const lonRad = lon * (Math.PI / 180);
      const segments = 64;
      const meridianPts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const lat = -90 + (i / segments) * 180;
        const latRad = lat * (Math.PI / 180);
        meridianPts.push(new THREE.Vector3(
          gratRadius * Math.cos(latRad) * Math.sin(lonRad),
          gratRadius * Math.sin(latRad),
          gratRadius * Math.cos(latRad) * Math.cos(lonRad)
        ));
      }
      const merGeo = new THREE.BufferGeometry().setFromPoints(meridianPts);
      const merLine = new THREE.Line(merGeo, gratMat);
      graticuleGroup.add(merLine);
    }

    // Dynamic Orbital Vectors & Beams Group
    const orbitalVectorsGroup = new THREE.Group();
    scene.add(orbitalVectorsGroup);
    orbitalVectorsGroupRef.current = orbitalVectorsGroup;

    // Site Markers Group
    const siteMarkersGroup = new THREE.Group();
    scene.add(siteMarkersGroup);
    siteMarkersGroupRef.current = siteMarkersGroup;

    // Raycaster for interactions & live slope probing
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const siteIntersects = raycaster.intersectObjects(siteMarkersGroup.children, true);

      if (siteIntersects.length > 0) {
        let obj: THREE.Object3D | null = siteIntersects[0].object;
        while (obj && !obj.userData?.site) {
          obj = obj.parent;
        }
        if (obj?.userData?.site) {
          onSelectSite(obj.userData.site);
        }
      }
    };

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(moonMesh);

      if (intersects.length > 0 && intersects[0].uv && slopeGridRef.current) {
        const uv = intersects[0].uv;
        const px = Math.min(textureWidth - 1, Math.max(0, Math.floor(uv.x * textureWidth)));
        const py = Math.min(textureHeight - 1, Math.max(0, Math.floor((1 - uv.y) * textureHeight)));

        const slopeVal = slopeGridRef.current[py * textureWidth + px];
        const lat = 90 - (py / textureHeight) * 180;
        const lon = (px / textureWidth) * 360 - 180;

        const classification = classifySlope(slopeVal, activeProfile);

        setHoverProbe({
          latDeg: Number(lat.toFixed(2)),
          lonDeg: Number(lon.toFixed(2)),
          slopeDeg: slopeVal,
          status: classification.status,
          label: classification.label,
          colorHex: classification.colorHex,
          tipOverRiskPct: classification.tipOverRiskPct,
          screenX: event.clientX,
          screenY: event.clientY
        });
      } else {
        setHoverProbe(null);
      }
    };

    const handlePointerLeave = () => {
      setHoverProbe(null);
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointerdown', handlePointerDown);
    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerleave', handlePointerLeave);

    // Animation loop
    let frameId = 0;
    const animate = () => {
      controls.update();

      if (targetCameraPosRef.current) {
        camera.position.lerp(targetCameraPosRef.current, 0.06);
        if (camera.position.distanceTo(targetCameraPosRef.current) < 0.05) {
          targetCameraPosRef.current = null;
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', handlePointerDown);
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      if (mountRef.current && domElement) {
        mountRef.current.removeChild(domElement);
      }
    };
  }, [activeProfile, onSelectSite]);

  // Update Moon texture when activeLayer changes
  useEffect(() => {
    if (!moonMeshRef.current || !texturesRef.current[activeLayer]) return;
    const mat = moonMeshRef.current.material as THREE.MeshStandardMaterial;
    mat.map = texturesRef.current[activeLayer];
    mat.needsUpdate = true;
  }, [activeLayer]);

  // Toggle Graticule visibility
  useEffect(() => {
    if (graticuleGroupRef.current) {
      graticuleGroupRef.current.visible = showGraticule;
    }
  }, [showGraticule]);

  // Dynamic Orbital Vectors in 3D: Subsolar beam, Earth LOS beam & Terminator
  useEffect(() => {
    if (!orbitalVectorsGroupRef.current || !sunLightRef.current) return;
    const group = orbitalVectorsGroupRef.current;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    if (!showOrbitalVectors) return;

    const moonRadius = 2.4;

    // 1. Sun position & vector
    const sunLatRad = subsolar.latDeg * (Math.PI / 180);
    const sunLonRad = subsolar.lonDeg * (Math.PI / 180);
    const sunDist = 14.0;
    const sunX = sunDist * Math.cos(sunLatRad) * Math.sin(sunLonRad);
    const sunY = sunDist * Math.sin(sunLatRad);
    const sunZ = sunDist * Math.cos(sunLatRad) * Math.cos(sunLonRad);
    sunLightRef.current.position.set(sunX, sunY, sunZ);

    // Glowing Subsolar Point on Moon surface
    const subsolarSurfaceX = (moonRadius + 0.05) * Math.cos(sunLatRad) * Math.sin(sunLonRad);
    const subsolarSurfaceY = (moonRadius + 0.05) * Math.sin(sunLatRad);
    const subsolarSurfaceZ = (moonRadius + 0.05) * Math.cos(sunLatRad) * Math.cos(sunLonRad);

    const subsolarHeadGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const subsolarHeadMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const subsolarHead = new THREE.Mesh(subsolarHeadGeo, subsolarHeadMat);
    subsolarHead.position.set(subsolarSurfaceX, subsolarSurfaceY, subsolarSurfaceZ);
    group.add(subsolarHead);

    // Sun directional beam line
    const sunBeamPts = [
      new THREE.Vector3(subsolarSurfaceX, subsolarSurfaceY, subsolarSurfaceZ),
      new THREE.Vector3(subsolarSurfaceX * 2.5, subsolarSurfaceY * 2.5, subsolarSurfaceZ * 2.5)
    ];
    const sunBeamGeo = new THREE.BufferGeometry().setFromPoints(sunBeamPts);
    const sunBeamMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.6 });
    group.add(new THREE.Line(sunBeamGeo, sunBeamMat));

    // 2. Earth position & Direct Sightline Beam from Selected Site
    const earthLatRad = subearth.latDeg * (Math.PI / 180);
    const earthLonRad = subearth.lonDeg * (Math.PI / 180);
    const earthDist = 12.0;
    const earthX = earthDist * Math.cos(earthLatRad) * Math.sin(earthLonRad);
    const earthY = earthDist * Math.sin(earthLatRad);
    const earthZ = earthDist * Math.cos(earthLatRad) * Math.cos(earthLonRad);

    // Site position
    const siteLatRad = selectedSite.latitude * (Math.PI / 180);
    const siteLonRad = selectedSite.longitude * (Math.PI / 180);
    const siteR = moonRadius + 0.05;
    const siteX = siteR * Math.cos(siteLatRad) * Math.sin(siteLonRad);
    const siteY = siteR * Math.sin(siteLatRad);
    const siteZ = siteR * Math.cos(siteLatRad) * Math.cos(siteLonRad);

    // Direct Earth LOS beam line from site
    const earthBeamPts = [
      new THREE.Vector3(siteX, siteY, siteZ),
      new THREE.Vector3(earthX, earthY, earthZ)
    ];
    const earthBeamGeo = new THREE.BufferGeometry().setFromPoints(earthBeamPts);
    const earthBeamMat = new THREE.LineDashedMaterial({
      color: currentEphemeris.isEarthVisible ? 0x06b6d4 : 0xef4444,
      dashSize: 0.3,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.7
    });
    const earthLine = new THREE.Line(earthBeamGeo, earthBeamMat);
    earthLine.computeLineDistances();
    group.add(earthLine);

    // Earth Sphere representation
    const earthSphereGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const earthSphereMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const earthSphere = new THREE.Mesh(earthSphereGeo, earthSphereMat);
    earthSphere.position.set(earthX, earthY, earthZ);
    group.add(earthSphere);

    // 3. Day / Night Terminator Ring (Normal to Sun Vector)
    const terminatorGeo = new THREE.RingGeometry(moonRadius + 0.005, moonRadius + 0.015, 64);
    const terminatorMat = new THREE.MeshBasicMaterial({
      color: 0x475569,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    const terminatorMesh = new THREE.Mesh(terminatorGeo, terminatorMat);
    terminatorMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(sunX, sunY, sunZ).normalize()
    );
    group.add(terminatorMesh);
  }, [subsolar, subearth, selectedSite, currentEphemeris, showOrbitalVectors]);

  // Render site markers on lunar surface with high-tech target reticle
  useEffect(() => {
    if (!siteMarkersGroupRef.current) return;
    const group = siteMarkersGroupRef.current;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    const moonRadius = 2.4;

    sites.forEach(site => {
      const isSelected = site.id === selectedSite.id;
      const latRad = site.latitude * (Math.PI / 180);
      const lonRad = site.longitude * (Math.PI / 180);

      const r = moonRadius + 0.04;
      const x = r * Math.cos(latRad) * Math.sin(lonRad);
      const y = r * Math.sin(latRad);
      const z = r * Math.cos(latRad) * Math.cos(lonRad);

      const markerObj = new THREE.Group();
      markerObj.position.set(x, y, z);
      markerObj.userData = { site };

      const normal = new THREE.Vector3(x, y, z).normalize();

      // Pin stem
      const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8);
      const stemMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x22d3ee : 0x94a3b8
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      stem.position.copy(normal.clone().multiplyScalar(0.11));
      markerObj.add(stem);

      // Pin head
      const headGeo = new THREE.SphereGeometry(isSelected ? 0.08 : 0.05, 16, 16);
      const headMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x38bdf8 : site.category === 'artemis' ? 0x06b6d4 : 0xf59e0b
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.copy(normal.clone().multiplyScalar(0.24));
      markerObj.add(head);

      // Reticle rings for selected site
      if (isSelected) {
        const reticleGeo = new THREE.RingGeometry(0.12, 0.14, 32);
        const reticleMat = new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
        const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
        reticleMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        reticleMesh.position.copy(normal.clone().multiplyScalar(0.02));
        markerObj.add(reticleMesh);
      }

      group.add(markerObj);
    });
  }, [sites, selectedSite, activeProfile]);

  const setCameraPreset = (preset: 'south_pole' | 'global' | 'earth_facing') => {
    if (!controlsRef.current) return;
    if (preset === 'south_pole') {
      targetCameraPosRef.current = new THREE.Vector3(0, -6.2, 2.8);
      controlsRef.current.target.set(0, -1.8, 0);
    } else if (preset === 'global') {
      targetCameraPosRef.current = new THREE.Vector3(0, 0, 7.5);
      controlsRef.current.target.set(0, 0, 0);
    } else if (preset === 'earth_facing') {
      targetCameraPosRef.current = new THREE.Vector3(0, 0.5, 6.8);
      controlsRef.current.target.set(0, 0, 0);
    }
  };

  const layersList: { id: DatasetLayer; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'albedo', label: 'Albedo / Regolith', icon: <Eye className="w-3.5 h-3.5" />, desc: 'LROC Surface Imagery' },
    { id: 'elevation', label: 'LOLA Elevation', icon: <Layers className="w-3.5 h-3.5" />, desc: 'Topography DEM' },
    { id: 'slope', label: 'Slope Intensity & Hazards', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Terrain Gradients & Lander Tolerances' },
    { id: 'illumination', label: 'Illumination', icon: <Sun className="w-3.5 h-3.5" />, desc: 'Annual Solar Potential' },
    { id: 'psr', label: 'PSRs & Water Ice', icon: <Compass className="w-3.5 h-3.5" />, desc: 'Permanently Shadowed Traps' },
    { id: 'comms', label: 'Direct Earth LOS', icon: <Radio className="w-3.5 h-3.5" />, desc: 'Line-of-Sight Coverage' }
  ];

  // Landing Ellipse slope breakdown for selected site
  const siteSlopeBreakdown = useMemo(() => {
    const mean = selectedSite.meanSlopeDeg;
    const safeThresh = activeProfile.maxSafeSlopeDeg;
    const cautionThresh = activeProfile.cautionSlopeDeg;

    let safePct = 0;
    let cautionPct = 0;
    let nonTraversablePct = 0;

    if (mean <= safeThresh) {
      safePct = Math.max(60, Math.round(100 - (mean / safeThresh) * 35));
      cautionPct = Math.round((100 - safePct) * 0.7);
      nonTraversablePct = 100 - safePct - cautionPct;
    } else if (mean <= cautionThresh) {
      safePct = Math.max(20, Math.round(50 - ((mean - safeThresh) / (cautionThresh - safeThresh)) * 30));
      cautionPct = Math.round((100 - safePct) * 0.65);
      nonTraversablePct = 100 - safePct - cautionPct;
    } else {
      safePct = Math.max(5, Math.round(20 - ((mean - cautionThresh) / 10) * 15));
      cautionPct = 25;
      nonTraversablePct = 100 - safePct - cautionPct;
    }

    return { safePct, cautionPct, nonTraversablePct };
  }, [selectedSite, activeProfile]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 overflow-hidden flex flex-col select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-crosshair active:cursor-grabbing" />

      {/* Modern High-Tech Left Telemetry Panel (Target Lock & Mission Dynamics) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-xs pointer-events-auto">
        <div className="p-3.5 rounded-xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md shadow-2xl relative overflow-hidden group">
          {/* Aerospace Accent Corner Brackets */}
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/40" />

          {/* Target Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold">
                Target Lock-On
              </span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              {selectedSite.category.toUpperCase()}
            </span>
          </div>

          <div className="text-sm font-bold text-slate-100 truncate tracking-tight">
            {selectedSite.name}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
            {selectedSite.subName}
          </div>

          {/* Coordinate Readout */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-slate-300 mt-2 p-1.5 bg-slate-900/60 rounded-lg border border-slate-800/70">
            <div>
              <span className="text-slate-500 block text-[9px]">LAT</span>
              <span className="text-slate-200">{selectedSite.latitude.toFixed(2)}°</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">LON</span>
              <span className="text-slate-200">{selectedSite.longitude.toFixed(2)}°</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">ELEV</span>
              <span className="text-cyan-300">+{selectedSite.elevationMeters}m</span>
            </div>
          </div>

          {/* Real-Time Live Sun & Earth Angle Telemetry */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" /> Solar Elevation:
              </span>
              <span className={`font-bold tabular-nums ${currentEphemeris.isSunlit ? 'text-amber-300' : 'text-slate-500'}`}>
                {currentEphemeris.sunElevationDeg > 0 ? `+${currentEphemeris.sunElevationDeg}°` : `${currentEphemeris.sunElevationDeg}°`}
                <span className="text-[9px] ml-1 font-normal text-slate-400">({currentEphemeris.isSunlit ? 'LIT' : 'SHADOW'})</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400" /> Earth Line-of-Sight:
              </span>
              <span className={`font-bold tabular-nums ${currentEphemeris.isEarthVisible ? 'text-cyan-300' : 'text-rose-400'}`}>
                {currentEphemeris.earthElevationDeg > 0 ? `+${currentEphemeris.earthElevationDeg}°` : `${currentEphemeris.earthElevationDeg}°`}
                <span className="text-[9px] ml-1 font-normal text-slate-400">({currentEphemeris.isEarthVisible ? 'LINK NOMINAL' : 'OCCULTED'})</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Landing Slope:
              </span>
              <span className={`font-bold tabular-nums ${
                selectedSite.meanSlopeDeg <= activeProfile.maxSafeSlopeDeg
                  ? 'text-emerald-400'
                  : selectedSite.meanSlopeDeg <= activeProfile.cautionSlopeDeg
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {selectedSite.meanSlopeDeg}° ({selectedSite.meanSlopeDeg <= activeProfile.maxSafeSlopeDeg ? 'SAFE' : 'HAZARD'})
              </span>
            </div>
          </div>
        </div>

        {/* Camera Quick-Presets Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/85 border border-slate-800 rounded-lg text-xs backdrop-blur-md shadow-md">
          <button
            onClick={() => setCameraPreset('south_pole')}
            className="flex-1 py-1 px-1.5 text-[10px] font-mono font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded transition-colors text-center cursor-pointer"
          >
            Artemis S. Pole
          </button>
          <span className="text-slate-800">|</span>
          <button
            onClick={() => setCameraPreset('global')}
            className="flex-1 py-1 px-1.5 text-[10px] font-mono font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded transition-colors text-center cursor-pointer"
          >
            Global
          </button>
          <span className="text-slate-800">|</span>
          <button
            onClick={() => setCameraPreset('earth_facing')}
            className="flex-1 py-1 px-1.5 text-[10px] font-mono font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded transition-colors text-center cursor-pointer"
          >
            Earth Facing
          </button>
        </div>
      </div>

      {/* Modern High-Tech Right Astrodynamics Telemetry Panel */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto items-end">
        {/* Toggle Telemetry Button (Mobile/Compact Screen Helper) */}
        <div className="p-3 rounded-xl bg-slate-950/85 border border-slate-800 backdrop-blur-md shadow-2xl flex flex-col gap-2 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>Astrodynamics Deck</span>
            </span>
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 px-1 rounded">
              LUNATRACE
            </span>
          </div>

          {/* Subsolar & Sub-Earth Dynamic Coordinates */}
          <div className="flex flex-col gap-1 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">SUBSOLAR POINT:</span>
              <span className="text-amber-300 font-bold tabular-nums">
                {subsolar.latDeg.toFixed(2)}° Lat · {subsolar.lonDeg.toFixed(1)}° Lon
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">SUB-EARTH LIBRATION:</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                Δ{subearth.latDeg.toFixed(1)}° Lat · Δ{subearth.lonDeg.toFixed(1)}° Lon
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">LUNAR PHASE:</span>
              <span className="text-slate-200 font-semibold tabular-nums">
                {lunarPhase.phaseName} ({lunarPhase.illuminationPct}%)
              </span>
            </div>
          </div>

          {/* Interactive Feature Overlay Toggles */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px] font-mono">
            <button
              onClick={() => setShowGraticule(!showGraticule)}
              className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                showGraticule ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle glowing coordinate gridlines"
            >
              <Grid className="w-3 h-3" />
              <span>GRID {showGraticule ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowOrbitalVectors(!showOrbitalVectors)}
              className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                showOrbitalVectors ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Sun and Earth 3D trajectory beams"
            >
              <Navigation className="w-3 h-3" />
              <span>RAYS {showOrbitalVectors ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Dedicated Slope Intensity Tolerances Panel when Slope Layer is chosen */}
        {activeLayer === 'slope' && (
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 w-76">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-100">
                  Lander Tolerances
                </span>
              </div>
              <button
                onClick={() => setSlopePanelCollapsed(!slopePanelCollapsed)}
                className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer font-mono"
              >
                {slopePanelCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>

            {!slopePanelCollapsed && (
              <>
                {/* Standard Lunar Lander Profiles */}
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  {STANDARD_LANDER_PROFILES.map(prof => {
                    const isSelected = selectedLanderProfile.id === prof.id;
                    return (
                      <button
                        key={prof.id}
                        onClick={() => setSelectedLanderProfile(prof)}
                        className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold truncate">{prof.name.split('(')[0]}</div>
                        <div className="text-[9px] text-slate-500">≤{prof.maxSafeSlopeDeg}° Safe</div>
                      </button>
                    );
                  })}
                </div>

                {/* View Mode Toggle */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900 rounded text-[10px] font-mono">
                  <button
                    onClick={() => setSlopeVizMode('safety_bands')}
                    className={`py-1 rounded cursor-pointer ${
                      slopeVizMode === 'safety_bands' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Safety Mask
                  </button>
                  <button
                    onClick={() => setSlopeVizMode('continuous_intensity')}
                    className={`py-1 rounded cursor-pointer ${
                      slopeVizMode === 'continuous_intensity' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    LOLA Continuous
                  </button>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-1 text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Safe
                    </span>
                    <span className="text-slate-300">0° – {activeProfile.maxSafeSlopeDeg}°</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Caution
                    </span>
                    <span className="text-slate-300">{activeProfile.maxSafeSlopeDeg}° – {activeProfile.cautionSlopeDeg}°</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Hazard
                    </span>
                    <span className="text-slate-300">&gt; {activeProfile.cautionSlopeDeg}°</span>
                  </div>
                </div>

                {/* Landing Ellipse Breakdown Bar */}
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80 flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Landing Ellipse:</span>
                    <span className="text-emerald-400 font-bold">{siteSlopeBreakdown.safePct}% Traversable</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 flex overflow-hidden">
                    <div style={{ width: `${siteSlopeBreakdown.safePct}%` }} className="bg-emerald-500" />
                    <div style={{ width: `${siteSlopeBreakdown.cautionPct}%` }} className="bg-amber-500" />
                    <div style={{ width: `${siteSlopeBreakdown.nonTraversablePct}%` }} className="bg-rose-500" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating Hover Slope Probe Card */}
      {hoverProbe && (
        <div
          className="pointer-events-none fixed z-30 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-lg bg-slate-950/95 border border-slate-700 text-xs text-slate-100 backdrop-blur-md shadow-2xl flex flex-col gap-1"
          style={{
            left: `${hoverProbe.screenX}px`,
            top: `${hoverProbe.screenY - 12}px`
          }}
        >
          <div className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold" style={{ color: hoverProbe.colorHex }}>
              {hoverProbe.slopeDeg}° Local Slope
            </span>
            <span
              className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold"
              style={{
                backgroundColor: `${hoverProbe.colorHex}25`,
                color: hoverProbe.colorHex,
                border: `1px solid ${hoverProbe.colorHex}50`
              }}
            >
              {hoverProbe.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Lat: {hoverProbe.latDeg}°</span>
            <span>Lon: {hoverProbe.lonDeg}°</span>
            <span>Tip-Over Risk: {hoverProbe.tipOverRiskPct}%</span>
          </div>
        </div>
      )}

      {/* Unified Floating Bottom Control Dock for Dataset Layers & Target Sites */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl pointer-events-auto flex flex-col items-center">
        {/* Toggle Collapse Pill */}
        <button
          onClick={() => setControlsCollapsed(!controlsCollapsed)}
          className="mb-1 px-2.5 py-0.5 bg-slate-900/90 border border-slate-800 rounded-full text-[10px] font-mono text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-all backdrop-blur-md cursor-pointer shadow-md"
        >
          {controlsCollapsed ? '▲ Show Layers' : '▼ Hide Layers'}
        </button>

        {!controlsCollapsed && (
          <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-2 backdrop-blur-xl shadow-2xl flex flex-col gap-1.5">
            {/* Dataset Layer Buttons */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5">
              {layersList.map(layer => {
                const isActive = activeLayer === layer.id;
                return (
                  <button
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    {layer.icon}
                    <span>{layer.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Candidate Site Selectors */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-[10px] overflow-x-auto text-slate-400">
              <span className="text-[9px] uppercase font-mono text-slate-500 shrink-0">
                Sites:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {sites.map(site => {
                  const isCur = site.id === selectedSite.id;
                  return (
                    <button
                      key={site.id}
                      onClick={() => onSelectSite(site)}
                      className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer ${
                        isCur
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {site.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	// Props - Accepts real EasyGo GPS units and PostgreSQL Geofence pools
	let {
		units = [],
		pools = [],
		highwayGlbUrl = '/models/Highway.glb',
		parkingGlbUrl = '/models/Parking.glb'
	} = $props();

	// 3D GLTF Model Assets state
	let isGlbHighwayLoaded = $state(false);
	let glbHighwayModel: THREE.Group | null = null;
	let highwayCorridorMeshes: THREE.Object3D[] = [];

	let isGlbParkingLoaded = $state(false);
	let glbParkingModel: THREE.Group | null = null;
	let poolParkingMeshes: THREE.Object3D[] = [];

	// Calculate center latitude and longitude for 3D coordinate projection
	let centerLat = $derived.by(() => {
		if (pools.length > 0) return pools.reduce((acc: number, p: any) => acc + (p.lat || 0), 0) / pools.length;
		if (units.length > 0) return units.reduce((acc: number, u: any) => acc + (u.lat || 0), 0) / units.length;
		return -6.2;
	});

	let centerLng = $derived.by(() => {
		if (pools.length > 0) return pools.reduce((acc: number, p: any) => acc + (p.lng || 0), 0) / pools.length;
		if (units.length > 0) return units.reduce((acc: number, u: any) => acc + (u.lng || 0), 0) / units.length;
		return 106.8;
	});

	// Convert GPS Lat/Lng to 3D Scene X/Z coordinates
	function gpsTo3D(lat: number, lng: number): [number, number, number] {
		const scale = 25; // Scale factor for WebGL viewport
		const x = (lng - centerLng) * scale;
		const z = -(lat - centerLat) * scale;
		// Clamp within grid bounds (-12 to 12)
		return [
			Math.max(-12, Math.min(12, x)),
			0,
			Math.max(-12, Math.min(12, z))
		];
	}

	// Dynamic 3D Geofence Pools
	let geofences = $derived.by(() => {
		if (pools.length === 0) {
			return [
				{ name: 'BCS Cilegon Utama', radiusMeter: 350, color: 0x10b981, pos: [-5, 0, -2.5] as [number, number, number], status: 'Active Pool' },
				{ name: 'BCS Gunung Putri', radiusMeter: 300, color: 0x38bdf8, pos: [5, 0, 2.5] as [number, number, number], status: 'Active Pool' }
			];
		}
		return pools.map((p: any, idx: number) => {
			const colors = [0x10b981, 0x38bdf8, 0xf59e0b, 0x8b5cf6, 0xec4899];
			return {
				name: p.name || `Pool ${p.id}`,
				radiusMeter: p.radiusMeters || 300,
				color: colors[idx % colors.length],
				pos: gpsTo3D(p.lat, p.lng),
				status: 'Pool Geofence'
			};
		});
	});

	// Dynamic 3D Active Trucks from EasyGo GPS API + DB
	let activeTrucks = $derived.by(() => {
		if (units.length === 0) {
			return [
				{ nopol: 'B 9123 BCS', driver: 'Ahmad Subagja', speedKmh: 65, pos: [-1, 0, -0.5] as [number, number, number], status: 'Moving' },
				{ nopol: 'B 9482 BCS', driver: 'Budi Santoso', speedKmh: 42, pos: [1.5, 0, 0.8] as [number, number, number], status: 'Transit' },
				{ nopol: 'B 9011 BCS', driver: 'Dedi Kurniawan', speedKmh: 0, pos: [-4.8, 0, -2.3] as [number, number, number], status: 'Standby' }
			];
		}
		return units.map((u: any) => ({
			nopol: u.id,
			driver: u.driver || 'System Assigner',
			speedKmh: u.speed || 0,
			pos: gpsTo3D(u.lat, u.lng),
			status: u.status || 'Active'
		}));
	});

	let containerEl = $state<HTMLDivElement | null>(null);

	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let animationFrameId: number;

	// Orbit rotation
	let isDragging = false;
	let previousMousePosition = { x: 0, y: 0 };
	let targetRotation = { x: 0.45, y: -0.35 };
	let currentRotation = { x: 0.45, y: -0.35 };
	let cameraDistance = 18;

	let geofenceCylinders: THREE.Mesh[] = [];
	let pulsingRings: THREE.Mesh[] = [];

	function init3D() {
		if (!containerEl) return;

		const width = containerEl.clientWidth || 800;
		const height = containerEl.clientHeight || 450;

		// 1. Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xffffff); // Clean Crisp White Background
		scene.fog = new THREE.FogExp2(0xffffff, 0.015);

		// 2. Camera
		camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
		updateCameraPosition();

		// 3. Renderer
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		containerEl.appendChild(renderer.domElement);

		// 4. Lights optimized for White Background
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
		scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
		dirLight.position.set(15, 25, 15);
		scene.add(dirLight);

		const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.6);
		fillLight.position.set(-15, 20, -15);
		scene.add(fillLight);

		// Ground Plane Floor (Soft light grey on white for depth)
		const groundGeo = new THREE.PlaneGeometry(60, 60);
		const groundMat = new THREE.MeshStandardMaterial({
			color: 0xf8fafc,
			roughness: 0.9,
			metalness: 0.05
		});
		const groundMesh = new THREE.Mesh(groundGeo, groundMat);
		groundMesh.rotation.x = -Math.PI / 2;
		groundMesh.position.y = -0.02;
		scene.add(groundMesh);

		// Grid Map Plane
		const gridHelper = new THREE.GridHelper(30, 30, 0x94a3b8, 0xe2e8f0);
		gridHelper.position.y = -0.01;
		scene.add(gridHelper);

		// 5. Build 3D Geofences, Highway Corridors, Parking Lots & Truck Markers
		build3DGeofences();
		buildHighwayCorridors();
		buildPoolParkingLots();
		build3DTruckMarkers();

		// 6. Asynchronously load custom .glb highway asset and normalize its bounds
		const loader = new GLTFLoader();

		function tryLoadHighwayGlb(url: string, fallbackUrl?: string) {
			loader.load(
				url,
				(gltf) => {
					const bbox = new THREE.Box3().setFromObject(gltf.scene);
					const center = bbox.getCenter(new THREE.Vector3());
					const size = bbox.getSize(new THREE.Vector3());

					const wrapper = new THREE.Group();
					gltf.scene.position.x = -center.x;
					gltf.scene.position.y = -bbox.min.y;
					gltf.scene.position.z = -center.z;
					wrapper.add(gltf.scene);

					wrapper.userData = { size, baseLength: Math.max(size.x, size.z), baseWidth: Math.min(size.x, size.z) };
					glbHighwayModel = wrapper;
					isGlbHighwayLoaded = true;
					buildHighwayCorridors();
				},
				undefined,
				() => {
					if (fallbackUrl) {
						tryLoadHighwayGlb(fallbackUrl);
					} else {
						isGlbHighwayLoaded = false;
					}
				}
			);
		}
		tryLoadHighwayGlb(highwayGlbUrl, highwayGlbUrl.includes('Highway.glb') ? '/models/highway.glb' : '/models/Highway.glb');

		// 7. Asynchronously load custom .glb Parking asset for Pool Depots
		function tryLoadParkingGlb(url: string, fallbackUrl?: string) {
			loader.load(
				url,
				(gltf) => {
					const bbox = new THREE.Box3().setFromObject(gltf.scene);
					const center = bbox.getCenter(new THREE.Vector3());
					const size = bbox.getSize(new THREE.Vector3());

					const wrapper = new THREE.Group();
					gltf.scene.position.x = -center.x;
					gltf.scene.position.y = -bbox.min.y;
					gltf.scene.position.z = -center.z;
					wrapper.add(gltf.scene);

					wrapper.userData = { size, maxDim: Math.max(size.x, size.z) };
					glbParkingModel = wrapper;
					isGlbParkingLoaded = true;
					buildPoolParkingLots();
				},
				undefined,
				() => {
					if (fallbackUrl) {
						tryLoadParkingGlb(fallbackUrl);
					} else {
						isGlbParkingLoaded = false;
					}
				}
			);
		}
		tryLoadParkingGlb(parkingGlbUrl, parkingGlbUrl.includes('Parking.glb') ? '/models/parking.glb' : '/models/Parking.glb');

		animate();
		window.addEventListener('resize', onWindowResize);
	}

	function updateCameraPosition() {
		camera.position.x = cameraDistance * Math.sin(currentRotation.y) * Math.cos(currentRotation.x);
		camera.position.y = cameraDistance * Math.sin(currentRotation.x);
		camera.position.z = cameraDistance * Math.cos(currentRotation.y) * Math.cos(currentRotation.x);
		camera.lookAt(0, 0, 0);
	}

	function build3DGeofences() {
		geofences.forEach((gf) => {
			// Elevated Translucent 3D Cylinder
			const radius = gf.radiusMeter / 80;
			const height = 2.5;
			const cylinderGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
			const cylinderMat = new THREE.MeshStandardMaterial({
				color: gf.color,
				transparent: true,
				opacity: 0.22,
				side: THREE.DoubleSide,
				roughness: 0.15
			});
			const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
			cylinder.position.set(gf.pos[0], height / 2, gf.pos[2]);
			scene.add(cylinder);
			geofenceCylinders.push(cylinder);

			// Top Ring
			const topRingGeo = new THREE.RingGeometry(radius - 0.05, radius + 0.05, 32);
			topRingGeo.rotateX(-Math.PI / 2);
			const topRingMat = new THREE.MeshBasicMaterial({ color: gf.color, side: THREE.DoubleSide });
			const topRing = new THREE.Mesh(topRingGeo, topRingMat);
			topRing.position.set(gf.pos[0], height, gf.pos[2]);
			scene.add(topRing);

			// Ground Pulsing Wave Ring
			const pulseRingGeo = new THREE.RingGeometry(0.1, radius, 32);
			pulseRingGeo.rotateX(-Math.PI / 2);
			const pulseRingMat = new THREE.MeshBasicMaterial({
				color: gf.color,
				transparent: true,
				opacity: 0.4,
				side: THREE.DoubleSide
			});
			const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
			pulseRing.position.set(gf.pos[0], 0.02, gf.pos[2]);
			scene.add(pulseRing);
			pulsingRings.push(pulseRing);
		});
	}

	// Build 3D Parking Depot inside each Geofence Pool (BCS Cilegon & BCS Gunung Putri)
	function buildPoolParkingLots() {
		if (!scene) return;
		poolParkingMeshes.forEach((mesh) => scene.remove(mesh));
		poolParkingMeshes = [];

		geofences.forEach((gf) => {
			const parkingGroup = new THREE.Group();
			parkingGroup.position.set(gf.pos[0], 0.02, gf.pos[2]);

			if (isGlbParkingLoaded && glbParkingModel) {
				// Use loaded Parking.glb 3D model scaled to fit the geofence base
				const clone = glbParkingModel.clone();
				const maxDim = glbParkingModel.userData.maxDim || 4;
				const targetRadius = (gf.radiusMeter / 80) * 1.3;
				const scale = targetRadius / Math.max(1, maxDim);
				clone.scale.set(scale, scale, scale);
				parkingGroup.add(clone);
			} else {
				// Procedural 3D Parking Depot Base
				const r = (gf.radiusMeter / 80) * 0.75;
				const lotGeo = new THREE.CylinderGeometry(r, r, 0.04, 32);
				const lotMat = new THREE.MeshStandardMaterial({
					color: 0x334155,
					roughness: 0.8,
					metalness: 0.15
				});
				const lotMesh = new THREE.Mesh(lotGeo, lotMat);
				lotMesh.position.y = 0.02;
				parkingGroup.add(lotMesh);

				// White parking slot lines
				const lineGeo = new THREE.BoxGeometry(0.06, 0.01, r * 1.1);
				const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
				for (let i = -2; i <= 2; i++) {
					const line = new THREE.Mesh(lineGeo, lineMat);
					line.position.set(i * (r / 3), 0.045, 0);
					parkingGroup.add(line);
				}
			}

			scene.add(parkingGroup);
			poolParkingMeshes.push(parkingGroup);
		});
	}

	// Build Single Arterial Highway Corridor (Clean, No Cross-Spokes)
	function buildHighwayCorridors() {
		if (!scene) return;

		// Clear previous highway meshes
		highwayCorridorMeshes.forEach((mesh) => scene.remove(mesh));
		highwayCorridorMeshes = [];

		// Connect ONLY the Pool Hubs in clean sequence (BCS Cilegon <-> BCS Gunung Putri)
		const hubs = geofences.map((g) => ({ name: g.name, pos: g.pos }));
		const connections: Array<[[number, number, number], [number, number, number]]> = [];

		if (hubs.length >= 2) {
			for (let i = 0; i < hubs.length - 1; i++) {
				connections.push([hubs[i].pos, hubs[i + 1].pos]);
			}
		} else {
			connections.push([[-5, 0, -2.5], [5, 0, 2.5]]);
		}

		connections.forEach(([p1, p2]) => {
			const dx = p2[0] - p1[0];
			const dz = p2[2] - p1[2];
			const length = Math.hypot(dx, dz);
			if (length < 0.2) return;

			const midX = (p1[0] + p2[0]) / 2;
			const midZ = (p1[2] + p2[2]) / 2;
			const angle = Math.atan2(dx, dz);

			// Build the single crisp arterial highway
			const roadGroup = new THREE.Group();
			roadGroup.position.set(midX, 0.01, midZ);
			roadGroup.rotation.y = angle;

			// 1. Wide Multi-Lane Asphalt Surface
			const roadWidth = 2.0;
			const roadGeo = new THREE.BoxGeometry(roadWidth, 0.04, length);
			const roadMat = new THREE.MeshStandardMaterial({
				color: 0x1e293b,
				roughness: 0.85,
				metalness: 0.15
			});
			const roadMesh = new THREE.Mesh(roadGeo, roadMat);
			roadMesh.position.y = 0.02;
			roadGroup.add(roadMesh);

			// 2. Concrete Guardrails / Road Shoulders
			const barrierGeo = new THREE.BoxGeometry(0.1, 0.18, length);
			const barrierMat = new THREE.MeshStandardMaterial({
				color: 0x64748b,
				roughness: 0.5,
				metalness: 0.3
			});
			const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
			leftBarrier.position.set(-roadWidth / 2 + 0.05, 0.1, 0);
			roadGroup.add(leftBarrier);

			const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
			rightBarrier.position.set(roadWidth / 2 - 0.05, 0.1, 0);
			roadGroup.add(rightBarrier);

			// 3. Double Amber Dashed Center Line (Glowing Amber Divider)
			const numDashes = Math.max(1, Math.floor(length / 0.8));
			const dashLength = 0.45;
			const dashGap = length / numDashes;
			const dashGeo = new THREE.BoxGeometry(0.06, 0.01, dashLength);
			const dashMat = new THREE.MeshBasicMaterial({
				color: 0xf59e0b // Amber Gold
			});

			for (let d = 0; d < numDashes; d++) {
				// Lane 1 divider
				const dash1 = new THREE.Mesh(dashGeo, dashMat);
				const offsetZ = -length / 2 + (d + 0.5) * dashGap;
				dash1.position.set(-0.06, 0.045, offsetZ);
				roadGroup.add(dash1);

				// Lane 2 divider
				const dash2 = new THREE.Mesh(dashGeo, dashMat);
				dash2.position.set(0.06, 0.045, offsetZ);
				roadGroup.add(dash2);
			}

			// 4. White Outer Edge Boundary Stripes
			const edgeGeo = new THREE.BoxGeometry(0.05, 0.01, length);
			const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
			const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
			leftEdge.position.set(-roadWidth / 2 + 0.18, 0.045, 0);
			roadGroup.add(leftEdge);

			const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
			rightEdge.position.set(roadWidth / 2 - 0.18, 0.045, 0);
			roadGroup.add(rightEdge);

			// 5. If GLB Highway model is loaded, place it properly aligned along the corridor
			if (isGlbHighwayLoaded && glbHighwayModel) {
				const roadClone = glbHighwayModel.clone();
				const baseLen = glbHighwayModel.userData.baseLength || 4047;
				const baseW = glbHighwayModel.userData.baseWidth || 180;
				const lengthScale = length / Math.max(1, baseLen);
				const widthScale = 2.0 / Math.max(1, baseW);
				roadClone.scale.set(lengthScale, widthScale * 1.2, widthScale);
				roadClone.rotation.y = -Math.PI / 2;
				roadClone.position.set(0, 0.03, 0);
				roadGroup.add(roadClone);
			}

			scene.add(roadGroup);
			highwayCorridorMeshes.push(roadGroup);
		});
	}

	// Registry: unit id → THREE.Group for smooth lerp movement
	const truckGroups = new Map<string, THREE.Group>();
	// Target world positions per truck
	const truckTargets = new Map<string, THREE.Vector3>();

	function build3DTruckMarkers() {
		// Choose color by speed/status (high contrast for white background)
		const statusColors: Record<string, number> = {
			Moving: 0x2563eb,
			Transit: 0xd97706,
			Loading: 0x4f46e5,
			Available: 0x059669,
			Maintenance: 0xe11d48,
		};

		activeTrucks.forEach((truck) => {
			const group = new THREE.Group();
			const color = statusColors[truck.status as string] ?? 0x0284c7;

			// Mini 3D Truck Model
			const cabinGeo = new THREE.BoxGeometry(0.5, 0.5, 0.6);
			const cabinMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
			const cabin = new THREE.Mesh(cabinGeo, cabinMat);
			cabin.position.set(0, 0.25, 0.4);
			group.add(cabin);

			const boxGeo = new THREE.BoxGeometry(0.55, 0.6, 1.4);
			const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
			const box = new THREE.Mesh(boxGeo, boxMat);
			box.position.set(0, 0.3, -0.4);
			group.add(box);

			// Speed indicator: glowing dot on top
			const dotGeo = new THREE.SphereGeometry(0.13, 12, 12);
			const dotMat = new THREE.MeshBasicMaterial({ color: truck.speedKmh > 0 ? 0x10b981 : 0x64748b });
			const dot = new THREE.Mesh(dotGeo, dotMat);
			dot.position.set(0, 0.78, 0);
			group.add(dot);

			const px = truck.pos[0];
			const pz = truck.pos[2];
			group.position.set(px, 0, pz);
			scene.add(group);

			// Register for lerp
			truckGroups.set(truck.nopol, group);
			truckTargets.set(truck.nopol, new THREE.Vector3(px, 0, pz));
		});
	}

	// Poll /api/fms/live-positions and update 3D truck positions via lerp
	let pollInterval3D: ReturnType<typeof setInterval>;

	async function poll3DPositions() {
		try {
			const res = await fetch('/api/fms/live-positions');
			if (!res.ok) return;
			const { positions } = await res.json() as { positions: any[] };
			for (const pos of positions) {
				const target = truckTargets.get(pos.id);
				if (!target) continue;
				// Convert new GPS to 3D coords
				const [nx, , nz] = gpsTo3D(pos.lat, pos.lng);
				target.set(nx, 0, nz);
			}
		} catch (_) { /* silent */ }
	}

	let autoRotate = $state(true);

	function resetCamera() {
		targetRotation = { x: 0.45, y: -0.35 };
		cameraDistance = 18;
	}

	function zoomIn() {
		cameraDistance = Math.max(8, cameraDistance - 3);
	}

	function zoomOut() {
		cameraDistance = Math.min(36, cameraDistance + 3);
	}

	function toggleAutoRotate() {
		autoRotate = !autoRotate;
	}

	function animate() {
		animationFrameId = requestAnimationFrame(animate);

		// Animate Pulse Wave Rings
		const time = Date.now() * 0.002;
		pulsingRings.forEach((ring, idx) => {
			const scale = 1 + Math.sin(time + idx) * 0.2;
			ring.scale.set(scale, scale, 1);
		});

		// Smooth lerp truck mesh positions towards their GPS targets
		const LERP = 0.025; // ~2.5% per frame ≈ smooth 10s transition
		for (const [id, group] of truckGroups.entries()) {
			const target = truckTargets.get(id);
			if (!target) continue;
			group.position.lerp(target, LERP);
		}

		// Smooth camera rotation
		currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
		currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

		if (!isDragging && autoRotate) {
			targetRotation.y += 0.0012;
		}

		updateCameraPosition();
		renderer.render(scene, camera);
	}

	function onWindowResize() {
		if (!containerEl || !renderer || !camera) return;
		const w = containerEl.clientWidth;
		const h = containerEl.clientHeight;
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
	}

	function onMouseDown(e: MouseEvent) {
		isDragging = true;
		previousMousePosition = { x: e.clientX, y: e.clientY };
	}

	function onMouseMove(e: MouseEvent) {
		if (isDragging) {
			const deltaX = e.clientX - previousMousePosition.x;
			const deltaY = e.clientY - previousMousePosition.y;

			targetRotation.y += deltaX * 0.008;
			targetRotation.x += deltaY * 0.008;
			targetRotation.x = Math.max(0.1, Math.min(1.2, targetRotation.x));

			previousMousePosition = { x: e.clientX, y: e.clientY };
		}
	}

	function onMouseUp() {
		isDragging = false;
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		cameraDistance += e.deltaY * 0.01;
		cameraDistance = Math.max(8, Math.min(36, cameraDistance));
	}

	onMount(() => {
		init3D();
		// Start real-time 3D position polling every 10s
		poll3DPositions();
		pollInterval3D = setInterval(poll3DPositions, 10000);
	});

	onDestroy(() => {
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
		clearInterval(pollInterval3D);
		window.removeEventListener('resize', onWindowResize);
	});
</script>

<div class="space-y-4">
	<!-- Top Bar (Clean Light Modern Theme) -->
	<div class="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-800 shadow-xs">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
				<span class="material-symbols-outlined text-2xl">radar</span>
			</div>
			<div>
				<h3 class="text-base font-black flex items-center gap-2 text-slate-900">
					<span>3D ELEVATED GEOFENCE & LIVE TRUCK TRACKING</span>
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
						WEBGL 3D
					</span>
				</h3>
				<p class="text-xs text-slate-500 font-medium">Visualisasi 3D Tabung Geofence Pool & Marker Kendaraan Bergerak</p>
			</div>
		</div>

		<div class="flex items-center gap-2 text-xs font-semibold flex-wrap">
			<span class="px-3 py-1.5 rounded-xl bg-slate-100 {isGlbParkingLoaded ? 'text-indigo-700' : 'text-slate-700'} border border-slate-200 flex items-center gap-1.5 font-mono">
				<span class="material-symbols-outlined text-sm">local_parking</span>
				<span>{isGlbParkingLoaded ? 'GLB Pool Depot' : '3D Pool Parking'}</span>
			</span>
			<span class="px-3 py-1.5 rounded-xl bg-slate-100 {isGlbHighwayLoaded ? 'text-blue-700' : 'text-amber-700'} border border-slate-200 flex items-center gap-1.5 font-mono">
				<span class="material-symbols-outlined text-sm">route</span>
				<span>{isGlbHighwayLoaded ? 'GLB Highway' : '3D Highway Corridor'}</span>
			</span>
			<span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 font-mono">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
				<span>{activeTrucks.length} Armada Terhubung</span>
			</span>
		</div>
	</div>

	<!-- 3D Canvas (Clean Light Theme - Expanded Screen Height) -->
	<div class="relative w-full h-[580px] md:h-[650px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white">
		<div
			bind:this={containerEl}
			onmousedown={onMouseDown}
			onmousemove={onMouseMove}
			onmouseup={onMouseUp}
			onmouseleave={onMouseUp}
			onwheel={onWheel}
			role="region"
			aria-label="3D Elevated Geofence Canvas"
			class="w-full h-full cursor-grab active:cursor-grabbing bg-white"
		></div>

		<!-- Top Right Quick Camera Controls -->
		<div class="absolute top-4 right-4 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg">
			<button
				onclick={zoomIn}
				title="Zoom In"
				class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">zoom_in</span>
			</button>
			<button
				onclick={zoomOut}
				title="Zoom Out"
				class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">zoom_out</span>
			</button>
			<button
				onclick={resetCamera}
				title="Reset View"
				class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-base">restart_alt</span>
			</button>
			<button
				onclick={toggleAutoRotate}
				title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
				class="px-2.5 h-8 rounded-xl {autoRotate ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'} text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
			>
				<span class="material-symbols-outlined text-sm">{autoRotate ? 'pause' : 'play_arrow'}</span>
				<span>{autoRotate ? 'Rotasi Aktif' : 'Rotasi Diam'}</span>
			</button>
		</div>

		<!-- Camera Controls, Parking & Highway Hint (Light frosted glass badge) -->
		<div class="absolute bottom-4 left-4 p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-[11px] font-bold text-slate-700 flex items-center gap-3">
			<div class="flex items-center gap-1.5">
				<span class="material-symbols-outlined text-sm text-emerald-600">3d_rotation</span>
				<span>Rotasi 360° & Drag Mouse</span>
			</div>
			<div class="h-3 w-[1px] bg-slate-300"></div>
			<div class="flex items-center gap-1.5">
				<span class="material-symbols-outlined text-sm text-indigo-600">local_parking</span>
				<span>{isGlbParkingLoaded ? 'GLTF 3D Parking Depot (Cilegon & Gn. Putri)' : 'Procedural Pool Depot'}</span>
			</div>
			<div class="h-3 w-[1px] bg-slate-300"></div>
			<div class="flex items-center gap-1.5">
				<span class="material-symbols-outlined text-sm text-blue-600">edit_road</span>
				<span>{isGlbHighwayLoaded ? 'GLTF 3D Highway Asset' : 'Procedural Highway'}</span>
			</div>
		</div>
	</div>

	<!-- Geofence & Active Truck Cards (Light Theme) -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
		{#each geofences as gf}
			<div class="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs shadow-xs">
				<div class="flex items-center justify-between mb-1">
					<span class="font-black text-slate-900 flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full" style="background-color: #{gf.color.toString(16)}"></span>
						{gf.name}
					</span>
					<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200">{gf.status}</span>
				</div>
				<p class="text-[11px] text-slate-500 mt-1 font-medium">Radius Geofence: <strong class="text-slate-800 font-mono">{gf.radiusMeter} Meter</strong></p>
			</div>
		{/each}
	</div>
</div>

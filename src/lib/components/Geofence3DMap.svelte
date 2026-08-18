<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	// Props - Accepts real EasyGo GPS units and PostgreSQL Geofence pools
	let {
		units = [],
		pools = [],
		highwayGlbUrl = '/models/Highway.glb'
	} = $props();

	// Highway 3D GLTF state
	let isGlbHighwayLoaded = $state(false);
	let glbHighwayModel: THREE.Group | null = null;
	let highwayCorridorMeshes: THREE.Object3D[] = [];

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
				{ name: 'Pool Cilegon Utama', radiusMeter: 300, color: 0x10b981, pos: [-4, 0, -2] as [number, number, number], status: 'Active Pool' },
				{ name: 'Rest Area KM 68 Tol Merak', radiusMeter: 150, color: 0x38bdf8, pos: [3, 0, 3] as [number, number, number], status: 'Rest Area' },
				{ name: 'Kawasan Industri Cilegon', radiusMeter: 250, color: 0xf59e0b, pos: [5, 0, -4] as [number, number, number], status: 'Loading Zone' }
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
				{ nopol: 'B 9123 BCS', driver: 'Ahmad Subagja', speedKmh: 65, pos: [-1, 0, -1] as [number, number, number], status: 'Moving' },
				{ nopol: 'B 9482 BCS', driver: 'Budi Santoso', speedKmh: 42, pos: [2, 0, 1] as [number, number, number], status: 'Transit' },
				{ nopol: 'B 9011 BCS', driver: 'Dedi Kurniawan', speedKmh: 0, pos: [-3.8, 0, -1.8] as [number, number, number], status: 'Standby' }
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
	let targetRotation = { x: 0.5, y: -0.4 };
	let currentRotation = { x: 0.5, y: -0.4 };
	let cameraDistance = 16;

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
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
		scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
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

		// 5. Build 3D Geofences, Highway Corridors & Truck Markers
		build3DGeofences();
		buildHighwayCorridors();
		build3DTruckMarkers();

		// 6. Asynchronously load custom .glb highway asset and normalize its bounds
		const loader = new GLTFLoader();
		function tryLoadGlb(url: string, fallbackUrl?: string) {
			loader.load(
				url,
				(gltf) => {
					// Normalize GLTF geometry bounds to origin (0, 0, 0)
					const bbox = new THREE.Box3().setFromObject(gltf.scene);
					const center = bbox.getCenter(new THREE.Vector3());
					const size = bbox.getSize(new THREE.Vector3());

					// Create a normalized wrapper group centered at origin
					const wrapper = new THREE.Group();
					gltf.scene.position.x = -center.x;
					gltf.scene.position.y = -bbox.min.y; // Sit on ground
					gltf.scene.position.z = -center.z;
					wrapper.add(gltf.scene);

					// Store normalized size and model
					wrapper.userData = { size, baseLength: Math.max(size.x, size.z), baseWidth: Math.min(size.x, size.z) };
					glbHighwayModel = wrapper;
					isGlbHighwayLoaded = true;
					buildHighwayCorridors();
				},
				undefined,
				() => {
					if (fallbackUrl) {
						tryLoadGlb(fallbackUrl);
					} else {
						// Seamless fallback to procedural 3D highway mesh
						isGlbHighwayLoaded = false;
					}
				}
			);
		}
		tryLoadGlb(highwayGlbUrl, highwayGlbUrl.includes('Highway.glb') ? '/models/highway.glb' : '/models/Highway.glb');

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
			const height = 3;
			const cylinderGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
			const cylinderMat = new THREE.MeshStandardMaterial({
				color: gf.color,
				transparent: true,
				opacity: 0.28,
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
				opacity: 0.45,
				side: THREE.DoubleSide
			});
			const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
			pulseRing.position.set(gf.pos[0], 0.02, gf.pos[2]);
			scene.add(pulseRing);
			pulsingRings.push(pulseRing);
		});
	}

	function buildHighwayCorridors() {
		if (!scene) return;

		// Clear previous highway meshes
		highwayCorridorMeshes.forEach((mesh) => scene.remove(mesh));
		highwayCorridorMeshes = [];

		// Connect nodes (Geofence Pools & active routes)
		const hubs = geofences.map((g) => ({ name: g.name, pos: g.pos }));
		const connections: Array<[[number, number, number], [number, number, number]]> = [];

		if (hubs.length >= 2) {
			for (let i = 0; i < hubs.length - 1; i++) {
				connections.push([hubs[i].pos, hubs[i + 1].pos]);
			}
			if (hubs.length > 2) {
				connections.push([hubs[hubs.length - 1].pos, hubs[0].pos]);
			}
		} else {
			connections.push(
				[[-4, 0, -2], [0, 0, 0]],
				[[0, 0, 0], [3, 0, 3]],
				[[3, 0, 3], [5, 0, -4]]
			);
		}

		// Connect active moving trucks to nearest highway hub
		activeTrucks
			.filter((t) => t.speedKmh > 0)
			.forEach((truck) => {
				if (hubs.length > 0) {
					let closest = hubs[0];
					let minDist = Infinity;
					hubs.forEach((h) => {
						const dist = Math.hypot(truck.pos[0] - h.pos[0], truck.pos[2] - h.pos[2]);
						if (dist < minDist) {
							minDist = dist;
							closest = h;
						}
					});
					connections.push([truck.pos, closest.pos]);
				}
			});

		connections.forEach(([p1, p2]) => {
			const dx = p2[0] - p1[0];
			const dz = p2[2] - p1[2];
			const length = Math.hypot(dx, dz);
			if (length < 0.2) return;

			const midX = (p1[0] + p2[0]) / 2;
			const midZ = (p1[2] + p2[2]) / 2;
			const angle = Math.atan2(dx, dz);

			// Always build the high-contrast procedural asphalt road base for rock-solid visibility
			const roadGroup = new THREE.Group();
			roadGroup.position.set(midX, 0.01, midZ);
			roadGroup.rotation.y = angle;

			// 1. Asphalt Surface (Dark crisp slate contrasting on white)
			const roadWidth = 1.6;
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
			const barrierGeo = new THREE.BoxGeometry(0.09, 0.16, length);
			const barrierMat = new THREE.MeshStandardMaterial({
				color: 0x64748b,
				roughness: 0.5,
				metalness: 0.25
			});
			const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
			leftBarrier.position.set(-roadWidth / 2 + 0.045, 0.09, 0);
			roadGroup.add(leftBarrier);

			const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
			rightBarrier.position.set(roadWidth / 2 - 0.045, 0.09, 0);
			roadGroup.add(rightBarrier);

			// 3. Glowing Center Line (Dashed Markings - Amber Gold)
			const numDashes = Math.max(1, Math.floor(length / 0.8));
			const dashLength = 0.4;
			const dashGap = length / numDashes;
			const dashGeo = new THREE.BoxGeometry(0.07, 0.01, dashLength);
			const dashMat = new THREE.MeshBasicMaterial({
				color: 0xf59e0b // High-visibility Amber
			});

			for (let d = 0; d < numDashes; d++) {
				const dashMesh = new THREE.Mesh(dashGeo, dashMat);
				const offsetZ = -length / 2 + (d + 0.5) * dashGap;
				dashMesh.position.set(0, 0.045, offsetZ);
				roadGroup.add(dashMesh);
			}

			// 4. White Outer Edge Lines
			const edgeGeo = new THREE.BoxGeometry(0.04, 0.01, length);
			const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
			const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
			leftEdge.position.set(-roadWidth / 2 + 0.14, 0.045, 0);
			roadGroup.add(leftEdge);

			const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
			rightEdge.position.set(roadWidth / 2 - 0.14, 0.045, 0);
			roadGroup.add(rightEdge);

			// 5. If GLB Highway is loaded, also place the custom 3D model on the corridor
			if (isGlbHighwayLoaded && glbHighwayModel) {
				const roadClone = glbHighwayModel.clone();
				const baseLen = glbHighwayModel.userData.baseLength || 10;
				const baseW = glbHighwayModel.userData.baseWidth || 2;
				const targetScaleXZ = 1.4 / Math.max(0.1, baseW);
				roadClone.scale.set(targetScaleXZ, targetScaleXZ, length / Math.max(1, baseLen));
				roadClone.position.set(0, 0.025, 0);
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

		if (!isDragging) {
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
		cameraDistance = Math.max(8, Math.min(30, cameraDistance));
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

		<div class="flex items-center gap-2 text-xs font-semibold">
			<span class="px-3 py-1.5 rounded-xl bg-slate-100 {isGlbHighwayLoaded ? 'text-blue-700' : 'text-amber-700'} border border-slate-200 flex items-center gap-1.5 font-mono">
				<span class="material-symbols-outlined text-sm">route</span>
				<span>{isGlbHighwayLoaded ? 'GLB 3D Highway' : '3D Highway Corridors'}</span>
			</span>
			<span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 font-mono">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
				<span>{activeTrucks.length} Armada Terhubung</span>
			</span>
		</div>
	</div>

	<!-- 3D Canvas (Clean Light Theme) -->
	<div class="relative w-full h-[450px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white">
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

		<!-- Camera Controls & Highway Hint (Light frosted glass badge) -->
		<div class="absolute bottom-4 left-4 p-2.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-[11px] font-bold text-slate-700 flex items-center gap-3">
			<div class="flex items-center gap-1.5">
				<span class="material-symbols-outlined text-sm text-emerald-600">3d_rotation</span>
				<span>Rotasi 360° & Zoom</span>
			</div>
			<div class="h-3 w-[1px] bg-slate-300"></div>
			<div class="flex items-center gap-1.5">
				<span class="material-symbols-outlined text-sm text-amber-600">edit_road</span>
				<span>{isGlbHighwayLoaded ? 'GLTF Custom Highway Mesh' : 'Procedural 3D Highway Mesh'}</span>
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

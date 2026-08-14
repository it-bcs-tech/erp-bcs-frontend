<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';

	// Props - Accepts real EasyGo GPS units and PostgreSQL Geofence pools
	let {
		units = [],
		pools = []
	} = $props();

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
				{ name: 'Pool Cilegon Utama', radiusMeter: 300, color: 0x10b981, pos: [-4, 0, -2], status: 'Active Pool' },
				{ name: 'Rest Area KM 68 Tol Merak', radiusMeter: 150, color: 0x38bdf8, pos: [3, 0, 3], status: 'Rest Area' },
				{ name: 'Kawasan Industri Cilegon', radiusMeter: 250, color: 0xf59e0b, pos: [5, 0, -4], status: 'Loading Zone' }
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
				{ nopol: 'B 9123 BCS', driver: 'Ahmad Subagja', speedKmh: 65, pos: [-1, 0, -1], status: 'Moving' },
				{ nopol: 'B 9482 BCS', driver: 'Budi Santoso', speedKmh: 42, pos: [2, 0, 1], status: 'Transit' },
				{ nopol: 'B 9011 BCS', driver: 'Dedi Kurniawan', speedKmh: 0, pos: [-3.8, 0, -1.8], status: 'Standby' }
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
		scene.background = new THREE.Color(0x0a0f1d);
		scene.fog = new THREE.FogExp2(0x0a0f1d, 0.03);

		// 2. Camera
		camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
		updateCameraPosition();

		// 3. Renderer
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		containerEl.appendChild(renderer.domElement);

		// 4. Lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
		scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
		dirLight.position.set(10, 20, 10);
		scene.add(dirLight);

		// Grid Map Plane
		const gridHelper = new THREE.GridHelper(30, 30, 0x334155, 0x1e293b);
		gridHelper.position.y = -0.01;
		scene.add(gridHelper);

		// 5. Build 3D Elevated Geofence Cylinders & Truck Markers
		build3DGeofences();
		build3DTruckMarkers();

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
				opacity: 0.35,
				side: THREE.DoubleSide,
				roughness: 0.2
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
				opacity: 0.5,
				side: THREE.DoubleSide
			});
			const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
			pulseRing.position.set(gf.pos[0], 0.02, gf.pos[2]);
			scene.add(pulseRing);
			pulsingRings.push(pulseRing);
		});
	}

	function build3DTruckMarkers() {
		activeTrucks.forEach((truck) => {
			const group = new THREE.Group();

			// Mini 3D Truck Model
			const cabinGeo = new THREE.BoxGeometry(0.5, 0.5, 0.6);
			const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
			const cabin = new THREE.Mesh(cabinGeo, cabinMat);
			cabin.position.set(0, 0.25, 0.4);
			group.add(cabin);

			const boxGeo = new THREE.BoxGeometry(0.55, 0.6, 1.4);
			const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
			const box = new THREE.Mesh(boxGeo, boxMat);
			box.position.set(0, 0.3, -0.4);
			group.add(box);

			group.position.set(truck.pos[0], 0, truck.pos[2]);
			scene.add(group);
		});
	}

	function animate() {
		animationFrameId = requestAnimationFrame(animate);

		// Animate Pulse Wave Rings
		const time = Date.now() * 0.002;
		pulsingRings.forEach((ring, idx) => {
			const scale = 1 + Math.sin(time + idx) * 0.2;
			ring.scale.set(scale, scale, 1);
		});

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
	});

	onDestroy(() => {
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
		window.removeEventListener('resize', onWindowResize);
	});
</script>

<div class="space-y-4">
	<!-- Top Bar -->
	<div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
				<span class="material-symbols-outlined text-2xl">radar</span>
			</div>
			<div>
				<h3 class="text-base font-bold flex items-center gap-2">
					<span>3D ELEVATED GEOFENCE & LIVE TRUCK TRACKING</span>
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
						REAL-TIME WEBGL
					</span>
				</h3>
				<p class="text-xs text-slate-400">Visualisasi 3D Tabung Geofence Pool & Marker Kendaraan Bergerak</p>
			</div>
		</div>

		<div class="flex items-center gap-2 text-xs font-semibold text-slate-300">
			<span class="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 flex items-center gap-1.5 font-mono">
				<span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
				<span>{activeTrucks.length} Armada Terhubung</span>
			</span>
		</div>
	</div>

	<!-- 3D Canvas -->
	<div class="relative w-full h-[450px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
		<div
			bind:this={containerEl}
			onmousedown={onMouseDown}
			onmousemove={onMouseMove}
			onmouseup={onMouseUp}
			onmouseleave={onMouseUp}
			onwheel={onWheel}
			role="region"
			aria-label="3D Elevated Geofence Canvas"
			class="w-full h-full cursor-grab active:cursor-grabbing"
		></div>

		<!-- Camera Controls Hint -->
		<div class="absolute bottom-4 left-4 p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-xs border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-2">
			<span class="material-symbols-outlined text-sm text-emerald-400">3d_rotation</span>
			<span>Rotasi Peta 3D 360° Drag & Scroll Zoom</span>
		</div>
	</div>

	<!-- Geofence & Active Truck Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
		{#each geofences as gf}
			<div class="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
				<div class="flex items-center justify-between mb-1">
					<span class="font-bold text-white flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full" style="background-color: #{gf.color.toString(16)}"></span>
						{gf.name}
					</span>
					<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">{gf.status}</span>
				</div>
				<p class="text-[11px] text-slate-400 mt-1">Radius Geofence: <strong class="text-white font-mono">{gf.radiusMeter} Meter</strong></p>
			</div>
		{/each}
	</div>
</div>

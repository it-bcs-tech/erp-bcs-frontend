<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

	// Props with Hybrid 3D support
	let {
		vehicleNumber = 'B 9123 BCS',
		vehicleModel = 'Hino Ranger Tronton 6x4',
		status = 'active',
		glbUrl = '', // Optional .glb model asset URL
		onCreateWorkOrder
	} = $props();

	let containerEl = $state<HTMLDivElement | null>(null);
	let isGlbLoaded = $state(false);
	let glbLoadError = $state<string | null>(null);

	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let animationFrameId: number;

	// Orbit controls manual logic for smooth drag & zoom
	let isDragging = false;
	let previousMousePosition = { x: 0, y: 0 };
	let targetRotation = { x: 0.3, y: -0.6 };
	let currentRotation = { x: 0.3, y: -0.6 };
	let cameraDistance = 14;

	// Component Health States (Sample/Real-time data)
	let componentHealth = $state({
		engine: { name: 'Mesin Utama (Engine)', status: 'good', healthPct: 92, icon: 'settings' },
		frontTires: { name: 'Ban Depan (Steer Tires)', status: 'warning', healthPct: 68, icon: 'tire_repair' },
		rearTires: { name: 'Ban Belakang (Drive Tires)', status: 'good', healthPct: 88, icon: 'tire_repair' },
		brakes: { name: 'Sistem Rem & ABS', status: 'critical', healthPct: 42, icon: 'brake_warning' },
		containerBox: { name: 'Box Kontainer 40ft', status: 'good', healthPct: 95, icon: 'inventory_2' }
	});

	// Raycasting for interactive click
	let raycaster = new THREE.Raycaster();
	let mouse = new THREE.Vector2();
	let interactiveMeshes: { mesh: THREE.Mesh; componentKey: string }[] = [];
	let hoveredComponent = $state<string | null>(null);
	let selectedComponentForWO = $state<any>(null);
	let showWOModal = $state(false);

	// Work order form inputs
	let woTitle = $state('');
	let woNotes = $state('');
	let woUrgency = $state('high');

	function init3D() {
		if (!containerEl) return;

		const width = containerEl.clientWidth || 800;
		const height = containerEl.clientHeight || 500;

		// 1. Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0f172a); // Dark slate bg
		scene.fog = new THREE.FogExp2(0x0f172a, 0.03);

		// 2. Camera
		camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
		updateCameraPosition();

		// 3. Renderer
		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(width, height);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		containerEl.appendChild(renderer.domElement);

		// 4. Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
		scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
		dirLight.position.set(10, 20, 10);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.width = 1024;
		dirLight.shadow.mapSize.height = 1024;
		scene.add(dirLight);

		const blueLight = new THREE.PointLight(0x0284c7, 2, 20);
		blueLight.position.set(-5, 5, -5);
		scene.add(blueLight);

		// Grid floor
		const gridHelper = new THREE.GridHelper(30, 30, 0x334155, 0x1e293b);
		gridHelper.position.y = -1.5;
		scene.add(gridHelper);

		// Shadow receiving plane
		const planeGeo = new THREE.PlaneGeometry(30, 30);
		const planeMat = new THREE.ShadowMaterial({ opacity: 0.3 });
		const plane = new THREE.Mesh(planeGeo, planeMat);
		plane.rotation.x = -Math.PI / 2;
		plane.position.y = -1.51;
		plane.receiveShadow = true;
		scene.add(plane);

		// 5. Construct 3D Model (Hybrid: GLTF or Procedural Fallback)
		if (glbUrl) {
			loadGLTFModel(glbUrl);
		} else {
			buildTruck3D();
		}

		// Event listeners for dragging / zoom
		window.addEventListener('resize', onWindowResize);
	}

	function loadGLTFModel(url: string) {
		const loader = new GLTFLoader();
		loader.load(
			url,
			(gltf) => {
				const model = gltf.scene;
				model.scale.set(1.5, 1.5, 1.5);
				model.position.set(0, -1.5, 0);
				model.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});
				scene.add(model);
				isGlbLoaded = true;
			},
			undefined,
			(err) => {
				console.warn('Gagal memuat file .glb asset, menggunakan Procedural 3D Mesh fallback:', err);
				glbLoadError = 'File .glb tidak dapat diakses. Menggunakan Procedural 3D Mesh.';
				buildTruck3D();
			}
		);
	}

	function updateCameraPosition() {
		camera.position.x = cameraDistance * Math.sin(currentRotation.y) * Math.cos(currentRotation.x);
		camera.position.y = cameraDistance * Math.sin(currentRotation.x);
		camera.position.z = cameraDistance * Math.cos(currentRotation.y) * Math.cos(currentRotation.x);
		camera.lookAt(0, 0.5, 0);
	}

	function buildTruck3D() {
		const truckGroup = new THREE.Group();

		// --- CHASSIS (Rangka) ---
		const chassisGeo = new THREE.BoxGeometry(1.6, 0.4, 8);
		const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
		const chassis = new THREE.Mesh(chassisGeo, chassisMat);
		chassis.position.set(0, -0.6, 0);
		chassis.castShadow = true;
		truckGroup.add(chassis);

		// --- CABIN (Kepala Truk) ---
		const cabinGeo = new THREE.BoxGeometry(2, 2.2, 2.2);
		const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.2 }); // BCS Blue
		const cabin = new THREE.Mesh(cabinGeo, cabinMat);
		cabin.position.set(0, 0.5, 2.8);
		cabin.castShadow = true;
		truckGroup.add(cabin);

		// Windshield (Kaca Depan)
		const glassGeo = new THREE.BoxGeometry(1.8, 1, 0.1);
		const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transmission: 0.8, opacity: 1, transparent: true, roughness: 0.1 });
		const windshield = new THREE.Mesh(glassGeo, glassMat);
		windshield.position.set(0, 0.8, 3.91);
		truckGroup.add(windshield);

		// --- ENGINE BLOCK (Mesin ⚙️) ---
		const engineGeo = new THREE.BoxGeometry(1.2, 1.2, 1.4);
		const engineMat = new THREE.MeshStandardMaterial({
			color: componentHealth.engine.status === 'good' ? 0x10b981 : 0xf59e0b,
			emissive: componentHealth.engine.status === 'good' ? 0x059669 : 0xd97706,
			emissiveIntensity: 0.2,
			roughness: 0.4
		});
		const engineMesh = new THREE.Mesh(engineGeo, engineMat);
		engineMesh.position.set(0, -0.2, 2.8);
		truckGroup.add(engineMesh);
		interactiveMeshes.push({ mesh: engineMesh, componentKey: 'engine' });

		// --- CONTAINER BOX (Box Kontainer 40ft) ---
		const boxGeo = new THREE.BoxGeometry(2.3, 2.5, 5.8);
		const boxMat = new THREE.MeshStandardMaterial({
			color: 0x0f172a,
			roughness: 0.6,
			metalness: 0.3
		});
		const containerBox = new THREE.Mesh(boxGeo, boxMat);
		containerBox.position.set(0, 0.8, -1);
		containerBox.castShadow = true;
		truckGroup.add(containerBox);

		// Stripes / BCS Decal on Container Box
		const stripeGeo = new THREE.BoxGeometry(2.32, 0.4, 5.82);
		const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
		const stripe = new THREE.Mesh(stripeGeo, stripeMat);
		stripe.position.set(0, 0.8, -1);
		truckGroup.add(stripe);
		interactiveMeshes.push({ mesh: containerBox, componentKey: 'containerBox' });

		// --- WHEELS / TIRES (Ban 🛞 & Rem 🛑) ---
		const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 24);
		wheelGeo.rotateZ(Math.PI / 2);

		const frontTireMat = new THREE.MeshStandardMaterial({
			color: componentHealth.frontTires.status === 'warning' ? 0xf59e0b : 0x1e293b,
			roughness: 0.8
		});

		const rearTireMat = new THREE.MeshStandardMaterial({
			color: componentHealth.rearTires.status === 'good' ? 0x10b981 : 0x1e293b,
			roughness: 0.8
		});

		const brakeMat = new THREE.MeshStandardMaterial({
			color: componentHealth.brakes.status === 'critical' ? 0xef4444 : 0x10b981,
			emissive: componentHealth.brakes.status === 'critical' ? 0xdc2626 : 0x000000,
			emissiveIntensity: 0.5
		});

		// Wheel Positions (Front, Middle, Rear)
		const wheelPositions = [
			{ x: 1.1, y: -0.9, z: 2.8, isFront: true },
			{ x: -1.1, y: -0.9, z: 2.8, isFront: true },
			{ x: 1.1, y: -0.9, z: -0.5, isFront: false },
			{ x: -1.1, y: -0.9, z: -0.5, isFront: false },
			{ x: 1.1, y: -0.9, z: -2.2, isFront: false },
			{ x: -1.1, y: -0.9, z: -2.2, isFront: false }
		];

		wheelPositions.forEach((pos, idx) => {
			const mat = pos.isFront ? frontTireMat : rearTireMat;
			const wheel = new THREE.Mesh(wheelGeo, mat);
			wheel.position.set(pos.x, pos.y, pos.z);
			wheel.castShadow = true;
			truckGroup.add(wheel);

			// Brake Disc inside wheel
			const brakeGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
			brakeGeo.rotateZ(Math.PI / 2);
			const brake = new THREE.Mesh(brakeGeo, brakeMat);
			brake.position.set(pos.x * 0.7, pos.y, pos.z);
			truckGroup.add(brake);

			interactiveMeshes.push({ mesh: wheel, componentKey: pos.isFront ? 'frontTires' : 'rearTires' });
			interactiveMeshes.push({ mesh: brake, componentKey: 'brakes' });
		});

		scene.add(truckGroup);

		// Animation Loop
		animate();
	}

	function animate() {
		animationFrameId = requestAnimationFrame(animate);

		// Smooth rotation damping
		currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
		currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

		// Idle subtle rotation when not dragging
		if (!isDragging) {
			targetRotation.y += 0.002;
		}

		updateCameraPosition();
		renderer.render(scene, camera);
	}

	function onWindowResize() {
		if (!containerEl || !renderer || !camera) return;
		const width = containerEl.clientWidth;
		const height = containerEl.clientHeight;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
	}

	// Mouse Drag Rotation Controls
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

			// Limit vertical pitch angle
			targetRotation.x = Math.max(-0.2, Math.min(1.2, targetRotation.x));

			previousMousePosition = { x: e.clientX, y: e.clientY };
		} else if (containerEl) {
			// Raycaster Hover check
			const rect = containerEl.getBoundingClientRect();
			mouse.x = ((e.clientX - rect.left) / containerEl.clientWidth) * 2 - 1;
			mouse.y = -((e.clientY - rect.top) / containerEl.clientHeight) * 2 + 1;

			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(interactiveMeshes.map(m => m.mesh));

			if (intersects.length > 0) {
				const found = interactiveMeshes.find(m => m.mesh === intersects[0].object);
				if (found) {
					hoveredComponent = found.componentKey;
					containerEl.style.cursor = 'pointer';
					return;
				}
			}
			hoveredComponent = null;
			containerEl.style.cursor = 'grab';
		}
	}

	function onMouseUp() {
		isDragging = false;
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		cameraDistance += e.deltaY * 0.01;
		cameraDistance = Math.max(6, Math.min(25, cameraDistance));
	}

	function onCanvasClick(e: MouseEvent) {
		if (!containerEl) return;
		const rect = containerEl.getBoundingClientRect();
		mouse.x = ((e.clientX - rect.left) / containerEl.clientWidth) * 2 - 1;
		mouse.y = -((e.clientY - rect.top) / containerEl.clientHeight) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);
		const intersects = raycaster.intersectObjects(interactiveMeshes.map(m => m.mesh));

		if (intersects.length > 0) {
			const found = interactiveMeshes.find(m => m.mesh === intersects[0].object);
			if (found) {
				const key = found.componentKey as keyof typeof componentHealth;
				openWOModal(key);
			}
		}
	}

	function openWOModal(componentKey: keyof typeof componentHealth) {
		selectedComponentForWO = componentHealth[componentKey];
		woTitle = `Maintenance: ${selectedComponentForWO.name} (${vehicleNumber})`;
		woNotes = `Indikator kesehatan komponen ${selectedComponentForWO.name} saat ini ${selectedComponentForWO.healthPct}% (Status: ${selectedComponentForWO.status.toUpperCase()}).`;
		showWOModal = true;
	}

	function submitWorkOrder() {
		if (onCreateWorkOrder) {
			onCreateWorkOrder({
				vehicleNumber,
				componentName: selectedComponentForWO.name,
				urgency: woUrgency,
				notes: woNotes
			});
		}

		showWOModal = false;
		alert(`✅ Tiket Work Order Maintenance berhasil dibuat untuk ${selectedComponentForWO.name}!`);
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
	<!-- 3D Canvas Header Controls -->
	<div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
				<span class="material-symbols-outlined text-2xl">view_in_ar</span>
			</div>
			<div>
				<h3 class="text-base font-bold text-white flex items-center gap-2">
					<span>DIGITAL TWIN 3D</span>
					<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
						REAL-TIME 60FPS
					</span>
				</h3>
				<p class="text-xs text-slate-400">{vehicleNumber} — {vehicleModel}</p>
			</div>
		</div>

		<div class="flex items-center gap-2 text-xs font-semibold text-slate-300">
			<span class="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl">
				<span class="material-symbols-outlined text-sm text-primary">drag_pan</span>
				<span>Geser 360° Rotasi</span>
			</span>
			<span class="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl">
				<span class="material-symbols-outlined text-sm text-primary">zoom_in</span>
				<span>Scroll Zoom</span>
			</span>
		</div>
	</div>

	<!-- 3D Canvas Container -->
	<div class="relative w-full h-[450px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
		<div
			bind:this={containerEl}
			onmousedown={onMouseDown}
			onmousemove={onMouseMove}
			onmouseup={onMouseUp}
			onmouseleave={onMouseUp}
			onwheel={onWheel}
			onclick={onCanvasClick}
			role="region"
			aria-label="3D Truck Digital Twin Model Canvas"
			class="w-full h-full cursor-grab active:cursor-grabbing"
		></div>

		<!-- Hover Component Indicator Overlay -->
		{#if hoveredComponent}
			{@const comp = componentHealth[hoveredComponent as keyof typeof componentHealth]}
			<div class="absolute top-4 left-4 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white shadow-xl flex items-center gap-3 animate-fade-in">
				<div class="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
					<span class="material-symbols-outlined text-lg">{comp.icon}</span>
				</div>
				<div>
					<p class="text-xs font-bold">{comp.name}</p>
					<p class="text-[10px] text-slate-400">Health: <span class="font-mono text-emerald-400 font-bold">{comp.healthPct}%</span> — Klik untuk tiket Work Order</p>
				</div>
			</div>
		{/if}

		<!-- Health Status Legend overlay bottom right -->
		<div class="absolute bottom-4 right-4 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs font-semibold text-slate-300 space-y-1.5 shadow-lg">
			<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Komponen Truk:</p>
			<div class="flex items-center gap-2 text-[11px]">
				<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
				<span>Bagus (Good Condition)</span>
			</div>
			<div class="flex items-center gap-2 text-[11px]">
				<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
				<span>Peringatan (Maintenance Warning)</span>
			</div>
			<div class="flex items-center gap-2 text-[11px]">
				<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
				<span>Perbaikan Urgent (Critical Brakes)</span>
			</div>
		</div>
	</div>

	<!-- Component Health Grid Cards (Interactive) -->
	<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
		{#each Object.entries(componentHealth) as [key, comp]}
			<button
				onclick={() => openWOModal(key as keyof typeof componentHealth)}
				class="p-3.5 rounded-2xl border text-left transition-all cursor-pointer hover:scale-105 {comp.status === 'good' ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' : comp.status === 'warning' ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10' : 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10'}"
			>
				<div class="flex items-center justify-between mb-1">
					<span class="material-symbols-outlined text-lg {comp.status === 'good' ? 'text-emerald-500' : comp.status === 'warning' ? 'text-amber-500' : 'text-rose-500'}">{comp.icon}</span>
					<span class="text-xs font-mono font-bold {comp.status === 'good' ? 'text-emerald-500' : comp.status === 'warning' ? 'text-amber-500' : 'text-rose-500'}">{comp.healthPct}%</span>
				</div>
				<h4 class="text-xs font-bold text-on-surface truncate">{comp.name}</h4>
				<p class="text-[10px] text-on-surface-variant mt-0.5 uppercase font-extrabold">{comp.status}</p>
			</button>
		{/each}
	</div>
</div>

<!-- Modal Quick Work Order Ticket -->
{#if showWOModal && selectedComponentForWO}
	<div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-surface rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
			<div class="bg-slate-900 text-white p-5 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
						<span class="material-symbols-outlined text-2xl">build</span>
					</div>
					<div>
						<h3 class="font-bold text-sm">BUAT TIKET WORK ORDER</h3>
						<p class="text-xs text-slate-400">{selectedComponentForWO.name}</p>
					</div>
				</div>
				<button onclick={() => (showWOModal = false)} class="text-slate-400 hover:text-white cursor-pointer">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="p-5 space-y-4 text-xs">
				<div class="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300">
					<p class="font-bold text-white">Armada: {vehicleNumber}</p>
					<p class="text-[11px] text-slate-400">Komponen Target 3D: {selectedComponentForWO.name} (Kesehatan {selectedComponentForWO.healthPct}%)</p>
				</div>

				<div class="space-y-1">
					<label for="wo_title_input" class="font-bold text-on-surface block">Judul Tiket Work Order:</label>
					<input id="wo_title_input" type="text" bind:value={woTitle} class="w-full bg-surface border border-slate-700 rounded-xl p-2.5 font-semibold text-on-surface" />
				</div>

				<div class="space-y-1">
					<label for="wo_urgency_select" class="font-bold text-on-surface block">Tingkat Urgensi:</label>
					<select id="wo_urgency_select" bind:value={woUrgency} class="w-full bg-surface border border-slate-700 rounded-xl p-2.5 font-semibold text-on-surface">
						<option value="critical">🔴 Kritis (Mogok / Bahaya Keselamatan)</option>
						<option value="high">🟠 Tinggi (Perbaikan Sebelum Jalan)</option>
						<option value="medium">🟡 Sedang (Maintenance Rutin Bengkel)</option>
					</select>
				</div>

				<div class="space-y-1">
					<label for="wo_notes_input" class="font-bold text-on-surface block">Catatan Keluhan & Diagnosa Montir:</label>
					<textarea id="wo_notes_input" rows="3" bind:value={woNotes} class="w-full bg-surface border border-slate-700 rounded-xl p-2.5 text-on-surface"></textarea>
				</div>

				<div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
					<button onclick={() => (showWOModal = false)} class="px-4 py-2 rounded-xl border border-slate-700 font-bold text-on-surface">Batal</button>
					<button onclick={submitWorkOrder} class="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold shadow-md">Kirim ke Bengkel</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';

	// Props
	let {
		containerNumber = 'BCSU 401923-8',
		containerType = '40ft High Cube (12.1m x 2.4m x 2.6m)',
		maxPayloadKg = 28000,
		items = [
			{ name: 'Kargo Baja Coil - PT Krakatau', weightKg: 8500, color: 0x0284c7, qty: 2, size: [1.8, 1.8, 1.8] },
			{ name: 'Palet Semen Gresik 50kg', weightKg: 6200, color: 0x10b981, qty: 8, size: [1.2, 1.0, 1.0] },
			{ name: 'Kemasan Botol B3 - PT Chemical', weightKg: 4300, color: 0xf59e0b, qty: 4, size: [1.4, 1.2, 1.2] }
		]
	} = $props();

	let containerEl = $state<HTMLDivElement | null>(null);

	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let animationFrameId: number;

	// Orbit controls manual drag
	let isDragging = false;
	let previousMousePosition = { x: 0, y: 0 };
	let targetRotation = { x: 0.25, y: -0.5 };
	let currentRotation = { x: 0.25, y: -0.5 };
	let cameraDistance = 18;

	// Calculated stats
	let totalWeightKg = $derived(
		items.reduce((sum, item) => sum + item.weightKg * item.qty, 0)
	);

	let payloadPct = $derived(
		Math.min(100, Math.round((totalWeightKg / maxPayloadKg) * 100))
	);

	let isOverload = $derived(totalWeightKg > maxPayloadKg);

	function init3D() {
		if (!containerEl) return;

		const width = containerEl.clientWidth || 800;
		const height = containerEl.clientHeight || 450;

		// 1. Scene
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x090d16);
		scene.fog = new THREE.FogExp2(0x090d16, 0.025);

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

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
		dirLight.position.set(10, 20, 10);
		scene.add(dirLight);

		const blueLight = new THREE.PointLight(0x38bdf8, 2, 25);
		blueLight.position.set(-10, 5, 0);
		scene.add(blueLight);

		// Grid floor
		const gridHelper = new THREE.GridHelper(30, 30, 0x1e293b, 0x0f172a);
		gridHelper.position.y = -1.5;
		scene.add(gridHelper);

		// 5. Construct 3D Wireframe 40ft Container
		build3DContainerWithCargo();

		animate();
		window.addEventListener('resize', onWindowResize);
	}

	function updateCameraPosition() {
		camera.position.x = cameraDistance * Math.sin(currentRotation.y) * Math.cos(currentRotation.x);
		camera.position.y = cameraDistance * Math.sin(currentRotation.x);
		camera.position.z = cameraDistance * Math.cos(currentRotation.y) * Math.cos(currentRotation.x);
		camera.lookAt(0, 0, 0);
	}

	function build3DContainerWithCargo() {
		const group = new THREE.Group();

		// Container dimensions (scaled to 3D scene): L=12m, W=2.4m, H=2.6m
		const length = 10;
		const width = 2.4;
		const height = 2.6;

		// --- Container Wireframe Enclosure ---
		const containerBoxGeo = new THREE.BoxGeometry(width, height, length);
		const wireframeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
		const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(containerBoxGeo), wireframeMat);
		group.add(wireframe);

		// Translucent floor
		const floorGeo = new THREE.PlaneGeometry(width, length);
		const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, side: THREE.DoubleSide, roughness: 0.8 });
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.rotation.x = Math.PI / 2;
		floor.position.y = -height / 2 + 0.01;
		group.add(floor);

		// --- Stack 3D Cargo Boxes Inside Container ---
		let startZ = -length / 2 + 1.2;
		let currentY = -height / 2 + 0.6;
		let currentX = -width / 2 + 0.6;

		items.forEach((item) => {
			const boxGeo = new THREE.BoxGeometry(item.size[0], item.size[1], item.size[2]);
			const boxMat = new THREE.MeshStandardMaterial({
				color: item.color,
				roughness: 0.4,
				metalness: 0.1
			});

			for (let i = 0; i < item.qty; i++) {
				const cargoMesh = new THREE.Mesh(boxGeo, boxMat);
				cargoMesh.position.set(currentX, currentY, startZ);

				// Add wireframe edge to cargo box for crisp 3D look
				const edgesGeo = new THREE.EdgesGeometry(boxGeo);
				const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
				const edges = new THREE.LineSegments(edgesGeo, edgesMat);
				cargoMesh.add(edges);

				group.add(cargoMesh);

				// Advance packing grid position
				currentX += item.size[0] + 0.2;
				if (currentX + item.size[0] / 2 > width / 2) {
					currentX = -width / 2 + 0.6;
					startZ += item.size[2] + 0.2;
					if (startZ + item.size[2] / 2 > length / 2) {
						startZ = -length / 2 + 1.2;
						currentY += item.size[1] + 0.2;
					}
				}
			}
		});

		scene.add(group);
	}

	function animate() {
		animationFrameId = requestAnimationFrame(animate);

		// Smooth rotation
		currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
		currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

		if (!isDragging) {
			targetRotation.y += 0.0015;
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
			targetRotation.x = Math.max(-0.2, Math.min(1.2, targetRotation.x));

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
	<!-- Top Bar Stats -->
	<div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
				<span class="material-symbols-outlined text-2xl">inventory_2</span>
			</div>
			<div>
				<h3 class="text-base font-bold flex items-center gap-2">
					<span>SIMULASI MUATAN 3D (CARGO PACKING)</span>
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
						40FT CONTAINER
					</span>
				</h3>
				<p class="text-xs text-slate-400">{containerNumber} — {containerType}</p>
			</div>
		</div>

		<!-- Capacity Utilization Gauge -->
		<div class="flex items-center gap-4">
			<div class="text-right">
				<p class="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Tonase Kargo:</p>
				<p class="text-lg font-black font-mono {isOverload ? 'text-rose-500' : 'text-emerald-400'}">
					{(totalWeightKg / 1000).toFixed(1)} Ton <span class="text-xs text-slate-400 font-normal">/ {(maxPayloadKg / 1000).toFixed(0)} Ton</span>
				</p>
			</div>

			<div class="w-32 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
				<div
					class="h-full transition-all duration-500 {isOverload ? 'bg-rose-500' : payloadPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}"
					style="width: {payloadPct}%"
				></div>
			</div>
			<span class="text-xs font-mono font-bold {isOverload ? 'text-rose-500' : 'text-emerald-400'}">{payloadPct}%</span>
		</div>
	</div>

	{#if isOverload}
		<div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
			<span class="material-symbols-outlined text-base">warning</span>
			<span>PERINGATAN OVERLOAD: Tonase kargo melebihi kapasitas maksimum kontainer (Maks {maxPayloadKg} kg)!</span>
		</div>
	{/if}

	<!-- 3D Canvas Container -->
	<div class="relative w-full h-[400px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
		<div
			bind:this={containerEl}
			onmousedown={onMouseDown}
			onmousemove={onMouseMove}
			onmouseup={onMouseUp}
			onmouseleave={onMouseUp}
			onwheel={onWheel}
			role="region"
			aria-label="3D Container Cargo Packing Canvas"
			class="w-full h-full cursor-grab active:cursor-grabbing"
		></div>

		<!-- Camera Controls Hint -->
		<div class="absolute bottom-4 left-4 p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-xs border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-2">
			<span class="material-symbols-outlined text-sm text-sky-400">3d_rotation</span>
			<span>Rotasi 360° Drag & Scroll Zoom 3D</span>
		</div>
	</div>

	<!-- Item Breakdown List -->
	<div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
		<h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Rincian Paket Barang 3D:</h4>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
			{#each items as item}
				<div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
					<div class="flex items-center gap-2.5">
						<span class="w-3.5 h-3.5 rounded-md" style="background-color: #{item.color.toString(16)}"></span>
						<div>
							<p class="font-bold text-white truncate">{item.name}</p>
							<p class="text-[10px] text-slate-400">{item.qty} Unit x {item.weightKg} kg</p>
						</div>
					</div>
					<span class="font-mono font-bold text-sky-400">{((item.qty * item.weightKg) / 1000).toFixed(1)} Ton</span>
				</div>
			{/each}
		</div>
	</div>
</div>

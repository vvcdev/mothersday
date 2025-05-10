import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let motherModel, sonModel, textMesh, heartMesh;
let motherMixer, sonMixer; 
const clock = new THREE.Clock(); 
let particles;
let decorations = []; // Array to hold stars and rocks
let balloons = []; // Array for balloons
let clouds = []; // Array for clouds
let sunMesh, sunLight; // For the sun
let islandMesh; // For the floating island

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xee9ca7, 100, 400); // Adjusted fog for much larger scene

    // Camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000); // Adjusted FOV & far plane
    camera.position.set(0, 40, 180); // Pulled camera back MUCH further and higher

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('motherDayCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 1000;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Adjusted ambient
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Adjusted directional
    directionalLight.position.set(30, 60, 50); // Adjusted light position
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Increase shadow map size for better quality
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500; // Increase shadow camera far plane
    directionalLight.shadow.camera.left = -150; // Adjusted shadow frustum for larger island
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    scene.add(directionalLight);

    // Sun
    const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
    const sunMaterial = new THREE.MeshStandardMaterial({
        emissive: 0xffff00, // Yellow emissive color
        emissiveIntensity: 1,
        color: 0xffff00 // Base color
    });
    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(-80, 70, -100); // Position sun in the sky
    scene.add(sunMesh);

    sunLight = new THREE.PointLight(0xffddaa, 0.7, 500); // Soft warm light from the sun
    sunLight.position.copy(sunMesh.position);
    scene.add(sunLight);

    // Font Loader for Text
    const fontLoader = new FontLoader();
    fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', function (font) {
        const textGeo = new TextGeometry("Happy Mother's Day!", {
            font: font,
            size: 10, // Text size relative to new model scale
            height: 1, 
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelOffset: 0,
            bevelSegments: 5
        });
        textGeo.computeBoundingBox();
        const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff69b4, specular: 0x555555, shininess: 30 });
        textMesh = new THREE.Mesh(textGeo, textMaterial);
        textMesh.castShadow = true;

        const textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
        textMesh.position.x = -textWidth / 2;
        textMesh.position.y = 60; // Position text even higher to accommodate larger island
        scene.add(textMesh);
    });

    // Load 3D Models
    const loader = new GLTFLoader();
    const modelScaleFactor = 12; // Increase current size by 4-5 times

    const motherModelPath = 'https://models.readyplayer.me/681fcf3c87b7e53e293c6905.glb'; 
    const sonModelPath = 'https://models.readyplayer.me/681fcec255fa435d14b61c1f.glb';     

    loader.load(motherModelPath, function (gltf) {
        motherModel = gltf.scene;
        const currentScale = 12 * modelScaleFactor; // Current scale was 12
        motherModel.scale.set(currentScale, currentScale, currentScale); 
        motherModel.position.set(-45, -60, 0); // Lowered Y position to sit on island, well below text
        motherModel.traverse(function (node) {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        scene.add(motherModel);

        if (gltf.animations && gltf.animations.length) {
            motherMixer = new THREE.AnimationMixer(motherModel);
            const action = motherMixer.clipAction(gltf.animations[0]);
            action.play();
        }
    }, undefined, function (error) {
        console.error('Failed to load mother model from:', motherModelPath, error);
    });

    loader.load(sonModelPath, function (gltf) {
        sonModel = gltf.scene;
        const currentScale = 11 * modelScaleFactor; // Current scale was 11
        sonModel.scale.set(currentScale, currentScale, currentScale); 
        sonModel.position.set(45, -55, 0);  // Lowered Y position to sit on island (slightly adjusted for variety)
        sonModel.traverse(function (node) {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        scene.add(sonModel);

        if (gltf.animations && gltf.animations.length) {
            sonMixer = new THREE.AnimationMixer(sonModel);
            const action = sonMixer.clipAction(gltf.animations[0]);
            action.play();
        }
    }, undefined, function (error) {
        console.error('Failed to load son model from:', sonModelPath, error);
    });
    
    // Floating Island (replaces ground plane)
    const islandRadius = 80;
    const islandHeight = 20;
    const islandGeometry = new THREE.CylinderGeometry(islandRadius, islandRadius * 0.9, islandHeight, 64); // Tapered cylinder
    const islandMaterial = new THREE.MeshStandardMaterial({
        color: 0xff99cc, // A rich pink
        roughness: 0.85,
        metalness: 0.1,
    });
    islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
    islandMesh.position.y = -islandHeight / 2 - 5; // Position it so top surface is around y= -5
    islandMesh.receiveShadow = true;
    islandMesh.castShadow = true; // The island itself can cast a shadow downwards if there was something below
    scene.add(islandMesh);

    // Add some "rock" details to the island for a more organic feel
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0xcc8899, roughness: 0.9 });
    for (let i = 0; i < 30; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.random() * 5 + 3, 0), rockMaterial);
        const angle = Math.random() * Math.PI * 2;
        const radius = islandRadius * (Math.random() * 0.2 + 0.85); // Place near the edge
        rock.position.set(
            Math.cos(angle) * radius,
            islandMesh.position.y + islandHeight / 2 - Math.random() * 5, // On or slightly embedded in top surface
            Math.sin(angle) * radius
        );
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
        decorations.push(rock); // Add to decorations to potentially animate slightly if desired
    }

    // Create a Heart
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0); 
    heartShape.bezierCurveTo(0, 0, -0.5, -2.5, -2.5, -2.5);
    heartShape.bezierCurveTo(-5.5, -2.5, -5.5, 1.0, -5.5, 1.0);
    heartShape.bezierCurveTo(-5.5, 3.0, -3.5, 5.2, 0, 7.0); 
    heartShape.bezierCurveTo(3.5, 5.2, 5.5, 3.0, 5.5, 1.0);
    heartShape.bezierCurveTo(5.5, 1.0, 5.5, -2.5, 2.5, -2.5);
    heartShape.bezierCurveTo(0.5, -2.5, 0, 0, 0, 0);

    const extrudeSettings = { depth: 0.8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.3, bevelThickness: 0.3 };
    const heartGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    heartGeometry.center(); 
    const heartMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x330000, shininess: 80 });
    heartMesh = new THREE.Mesh(heartGeometry, heartMaterial);
    heartMesh.scale.set(4, 4, 4); // Larger heart
    heartMesh.position.set(0, 25, 0); // Adjusted Y position for new island height
    heartMesh.rotation.x = Math.PI; // Rotate 180 degrees around X-axis to point tip down
    heartMesh.rotation.y = 0; 
    heartMesh.castShadow = true;
    scene.add(heartMesh);

    // Particle System
    const particleCount = 10000; // More particles
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const particleGeometry = new THREE.BufferGeometry();

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 400; 
        const y = Math.random() * 150 - 20;       
        const z = (Math.random() - 0.5) * 300 - 50; 

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.1 + 0.9, 0.8, Math.random() * 0.5 + 0.5);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Add More Decorations (Stars)
    const starGeometry = new THREE.SphereGeometry(0.5, 16, 16); // Slightly larger stars
    const starMaterials = [
        new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xfff0c1, roughness: 0.5, metalness: 0.1 }), // Creamy yellow
        new THREE.MeshStandardMaterial({ color: 0xffe0b2, emissive: 0xffcc80, roughness: 0.5, metalness: 0.1 }), // Light orange
        new THREE.MeshStandardMaterial({ color: 0xffecb3, emissive: 0xffe082, roughness: 0.5, metalness: 0.1 })  // Pale yellow
    ];

    for (let i = 0; i < 80; i++) { // Create 80 stars
        const star = new THREE.Mesh(starGeometry, starMaterials[i % starMaterials.length]);
        star.position.x = (Math.random() - 0.5) * 200;
        star.position.y = Math.random() * 80 + 30; // Keep stars higher up
        star.position.z = (Math.random() - 0.5) * 150 - 30;
        
        const scale = Math.random() * 0.8 + 0.6; 
        star.scale.set(scale, scale, scale);

        star.castShadow = true;
        scene.add(star);
        decorations.push(star); // Add to decorations array for animation
    }

    // Clouds
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        roughness: 0.9
    });
    for (let i = 0; i < 10; i++) {
        const cloudGroup = new THREE.Group();
        const numPuffs = Math.floor(Math.random() * 5) + 3;
        for (let j = 0; j < numPuffs; j++) {
            const puffGeometry = new THREE.SphereGeometry(Math.random() * 5 + 3, 16, 16);
            const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
            puff.position.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 5
            );
            puff.castShadow = true; // Clouds can cast soft shadows
            puff.receiveShadow = true;
            cloudGroup.add(puff);
        }
        cloudGroup.position.set(
            (Math.random() - 0.5) * 250, // Spread clouds across x
            Math.random() * 40 + 70,    // Position clouds higher
            (Math.random() - 0.5) * 150 - 70 // Spread clouds across z
        );
        const cloudScale = Math.random() * 1.5 + 1;
        cloudGroup.scale.set(cloudScale, cloudScale * 0.7, cloudScale);
        scene.add(cloudGroup);
        clouds.push(cloudGroup);
    }

    // Balloons
    const balloonColors = [0xff69b4, 0xffb6c1, 0xff1493, 0xdb7093, 0xffc0cb];
    const balloonBodyGeometry = new THREE.SphereGeometry(3, 32, 32); // Balloon body
    const balloonStringGeometry = new THREE.CylinderGeometry(0.1, 0.1, 10, 8); // String
    const stringMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });

    for (let i = 0; i < 10; i++) {
        const balloonGroup = new THREE.Group();
        const balloonMaterial = new THREE.MeshPhongMaterial({
            color: balloonColors[i % balloonColors.length],
            shininess: 60,
            specular: 0x222222
        });
        const body = new THREE.Mesh(balloonBodyGeometry, balloonMaterial);
        body.castShadow = true;
        balloonGroup.add(body);

        const string = new THREE.Mesh(balloonStringGeometry, stringMaterial);
        string.position.y = -5; // Attach string below balloon body
        balloonGroup.add(string);
        
        balloonGroup.position.set(
            (Math.random() - 0.5) * 100, // Spread balloons
            Math.random() * 30 + 15,    // Initial height, above island
            (Math.random() - 0.5) * 50 - 10
        );
        // Store initial x for sway animation
        balloonGroup.userData.initialX = balloonGroup.position.x;
        balloonGroup.userData.swaySpeed = Math.random() * 0.5 + 0.2;
        balloonGroup.userData.swayAmount = Math.random() * 3 + 2;

        scene.add(balloonGroup);
        balloons.push(balloonGroup);
    }

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta(); 
    const elapsedTime = clock.getElapsedTime();

    if (motherMixer) {
        motherMixer.update(deltaTime);
    }
    if (sonMixer) {
        sonMixer.update(deltaTime);
    }
    
    if (motherModel && !motherMixer) {
        motherModel.position.y = -4 + Math.sin(elapsedTime * 0.5) * 0.5; // Adjusted base Y for bobbing
    }
    if (sonModel && !sonMixer) {
        sonModel.position.y = -4.5 + Math.cos(elapsedTime * 0.5 + 1) * 0.5; // Adjusted base Y for bobbing
    }

    if (textMesh) {
        textMesh.rotation.y = Math.sin(elapsedTime * 0.2) * 0.02; 
    }

    if (heartMesh) {
        heartMesh.rotation.z = Math.sin(elapsedTime * 0.3) * 0.1; // Add a gentle sway on Z-axis
        heartMesh.position.y = 25 + Math.sin(elapsedTime * 0.6) * 1; 
    }

    // Animate particles
    if (particles) {
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < particles.geometry.attributes.position.count; i++) {
            positions[i * 3 + 1] -= 0.08; // Particles fall a bit faster
            if (positions[i * 3 + 1] < -20) { 
                positions[i * 3 + 1] = 120; 
                positions[i * 3] = (Math.random() - 0.5) * 400;
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate decorations (stars and now rocks on island)
    decorations.forEach(deco => {
        // Star-specific animation
        if (deco.geometry.type === 'SphereGeometry' && deco.material.emissive) { // A way to identify stars
            deco.rotation.x += 0.001 + Math.random() * 0.005;
            deco.rotation.y += 0.001 + Math.random() * 0.005;
            deco.position.y += Math.sin(elapsedTime * (Math.random() * 0.2 + 0.1) + deco.id * 0.1) * 0.02;
        }
    });

    // Animate Sun
    if (sunMesh) {
        sunMesh.rotation.y += 0.001; // Slow rotation
    }

    // Animate Clouds
    clouds.forEach(cloud => {
        cloud.position.x += 0.02 + (cloud.id % 3) * 0.005; // Drift clouds
        if (cloud.position.x > 150) { // Reset cloud position if it goes too far
            cloud.position.x = -150;
            cloud.position.y = Math.random() * 30 + 50; // Randomize y on reset
        }
        // Gentle bobbing for clouds
        cloud.position.y += Math.sin(elapsedTime * 0.1 + cloud.id) * 0.01;
    });

    // Animate Balloons
    balloons.forEach(balloon => {
        balloon.position.y += 0.05; // Float upwards
        balloon.position.x = balloon.userData.initialX + Math.sin(elapsedTime * balloon.userData.swaySpeed) * balloon.userData.swayAmount; // Sway
        balloon.rotation.z = Math.sin(elapsedTime * balloon.userData.swaySpeed * 0.5) * 0.1; // Gentle tilt

        if (balloon.position.y > 120) { // Adjusted reset height
            balloon.position.y = Math.random() * 10 + 5; // Reset near island top
            balloon.position.x = (Math.random() - 0.5) * 100;
            balloon.userData.initialX = balloon.position.x;
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

init();

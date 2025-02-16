import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.155.0/examples/jsm/controls/OrbitControls.js';

const canvasContainer = document.getElementById('canvasContainer');
const canvas = document.getElementById('mindmapCanvas');
// const ctx = canvas.getContext('2d');

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.setAnimationL
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
camera.position.set(130, 150, 100);
camera.lookAt(130, 150, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 부드러운 움직임 활성화
controls.dampingFactor = 0.05; // 감쇠 계수
controls.screenSpacePanning = false; // 화면 공간에서 팬 활성화 여부
controls.minDistance = 2; // 줌 최소 거리
controls.maxDistance = 10; // 줌 최대 거리
controls.maxPolarAngle = Math.PI / 2; // 카메라가 아래로 회전하는 각도 제한

const geometry = new THREE.SphereGeometry(30);
const cube1 = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0x00ff00 } ) );
const cube2 = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0xff0000 } ) );
cube1.position.set(68, 151.39999771118164, 10);
cube2.position.set(200, 151.39999771118164, 10);

scene.add( cube1 );
scene.add( cube2 ); 

let amount = 0.1;
let goingrightflag = true;
let th = 10;
let count = 0;

function animate() {
    if(goingrightflag) {
        count++;
    }
    else {
        count--;
    }   

    if (count >= th && goingrightflag) {
        amount *= -1;
        goingrightflag = false;
    }
    if (count <= -th && !goingrightflag) {
        amount *= -1;
        goingrightflag = true;
    }

    cube1.position.x += amount;

    let cam_x = (cube1.position.x + cube2.position.x) / 2;
    let cam_y = (cube1.position.y + cube2.position.y) / 2;
    camera.position.set(cam_x, cam_y, 100);

    // controls.update();
	renderer.render( scene, camera );
}

renderer.setAnimationLoop( animate );


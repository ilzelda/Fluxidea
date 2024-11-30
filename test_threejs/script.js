import * as THREE from 'three';

const canvasContainer = document.getElementById('canvasContainer');
const canvas = document.getElementById('mindmapCanvas');
// const ctx = canvas.getContext('2d');

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.setAnimationL
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
camera.lookAt(0, 0, 0);

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
	renderer.render( scene, camera );
}

renderer.setAnimationLoop( animate );


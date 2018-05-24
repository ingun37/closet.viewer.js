import ZRestLoader, { dataWorkerFunction, checkFileReaderSyncSupport, makeMaterialForZrest } from './lib/clo/readers/ZrestReader'
import * as Global from '@/lib/clo/utils/Global'
import * as THREE from '@/lib/threejs/three'
import '@/lib/threejs/OrbitControls'
import '@/lib/draco/DRACOLoader'
//import '@/lib/clo/UtilFunctions'

var container, states;
var camera, scene, renderer, controls;
var background_camera, background_scene;
var mouseX = 0, mouseY = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var reader;
var progress = document.querySelector('.percent');
var dataSyncWorkerURL = URL.createObjectURL(new Blob(["(" + dataWorkerFunction.toString() + ")()"], { type: 'text/javascript' }));
var timerId = 0;


checkFileReaderSyncSupport();

var cameraHeight = 1100;
var cameraDistance = 5000;

var envDiffuseMap = null;
var envSpecularMap = null;

var intProgress = 0;

export function init(data) {

    var w = data.width;
    var h = data.height;
    var setter = data.element;



    //container canvas width&height setting
    // if (w === 0 && h === 0) {
    //     w = $('#' + setter).width() + 40;
    //     h = $('#' + setter).height();
    // }
    //create container div
    container = document.createElement('div');
    //document.body.appendChild(container);

    document.getElementById(setter).innerHTML = '';
    document.getElementById(setter).appendChild(container);

    windowHalfX = w / 2;
    windowHalfY = h / 2;

    //create webgl renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xcccccc);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.sortObjects = false; // 투명 object 제대로 렌더링하려면 자동 sort 꺼야 한다
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    //create camera
    
    camera = new THREE.PerspectiveCamera(15, w / h, 100, 100000);
    camera.position.y = cameraHeight;
    camera.position.z = cameraDistance;
    
    //create camera controller
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target = new THREE.Vector3(0, cameraHeight, 0);
    controls.addEventListener('change', render);
    
    //create scenegraph
    scene = new THREE.Scene();

    // 이제 version 3 이후 파일에 대해서는 shader에서 light 설정을 hard coding해서 사용한다. 하지만 version 2 이하 파일을 위해 여기에서도 설정한다. 
    var DirLight0 = new THREE.DirectionalLight(0xd2d2d2);
    DirLight0.position.set(0, 0, 1).normalize();
    DirLight0.castShadow = false;
    // specular1 : 464646

    var DirLight1 = new THREE.DirectionalLight(0x6e6e6e);
    DirLight1.position.set(1500, 3000, 1500);
    DirLight1.castShadow = true;

    
    //Set up shadow properties for the light
    DirLight1.shadow.mapSize.width = 2048;  // default
    DirLight1.shadow.mapSize.height = 2048; // default
    DirLight1.shadow.camera.near = 2000;    // default
    DirLight1.shadow.camera.far = 7000;     // default
    DirLight1.shadow.camera.right = 1500;
    DirLight1.shadow.camera.left = -1500;
    DirLight1.shadow.camera.top = 1500;
    DirLight1.shadow.camera.bottom = -1500;
    DirLight1.shadow.bias = -0.001;

    // specular2 : 3c3c3c

    //scene.add(new THREE.AmbientLight(0x8c8c8c));// amibent light은 추가하지 않고 shader에서 하드코딩으로 처리한다. CLO와 three.js 의 light 구조가 다르므로 이렇게 하자
    scene.add(DirLight0);
    scene.add(DirLight1);

    var loader = new THREE.TextureLoader();
    var texture = loader.load(require('@/lib/clo/background/img_3dwindow_bg_Designer.png'));
    var backgroundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 0),
      new THREE.MeshBasicMaterial({
          map: texture
      })
    );

    backgroundMesh.material.depthTest = false;
    backgroundMesh.material.depthWrite = false;

    background_scene = new THREE.Scene();
    background_camera = new THREE.Camera();

    background_scene.add(background_camera);
    background_scene.add(backgroundMesh);

    // floor
   /* var planeGeometry = new THREE.PlaneBufferGeometry(10000, 10000, 2, 2);
    var planeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.2 })
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;

    let quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    plane.quaternion.copy(quaternion);

    scene.add(plane);*/
    
    //Create a helper for the shadow camera (optional)
    //var helper = new THREE.CameraHelper(light.shadow.camera);
    //scene.add(helper);

    // canvas event 
    var canvas = document.getElementById(setter);
    canvas.addEventListener("mouseout", function () { controls.noPan = true; }, false);
    canvas.addEventListener("mouseover", function () { controls.noPan = false; }, false);


    animate();

    
}

/// rendering 에 사용되는 현재 camera matrix 리턴. dll로 렌더링시 입력으로 사용되는 값.
export function getCameraMatrix()
{
    let matrix = new Array();

    matrix.push(camera.matrix.elements[0]);
    matrix.push(camera.matrix.elements[4]);
    matrix.push(camera.matrix.elements[8]);
    matrix.push(camera.matrix.elements[12]);
    matrix.push(camera.matrix.elements[1]);
    matrix.push(camera.matrix.elements[5]);
    matrix.push(camera.matrix.elements[9]);
    matrix.push(camera.matrix.elements[13]);
    matrix.push(camera.matrix.elements[2]);
    matrix.push(camera.matrix.elements[6]);
    matrix.push(camera.matrix.elements[10]);
    matrix.push(camera.matrix.elements[14]);

    return matrix;
}
function setWindowSize(w, h) {

    windowHalfX = w / 2;
    windowHalfY = h / 2;

    renderer.setSize(w, h);

    camera.aspect = w / h;
}

export function onWindowResize(datas) {
    var data = {
        width : screen.width,
        height : screen.height,
        fullscreen : false,
        marketplace : false,
        reponsive : false,
    }
    $.extend(data, datas);
    
    if (data.fullscreen || data.responsive) {
        windowHalfX = data.width / 2;
        windowHalfY = data.height - 60 / 2;

        camera.aspect = data.width / data.height;
        camera.updateProjectionMatrix();

        renderer.setSize(data.width, data.height - 60);
    } else {
        if (data.marketplace)
        {
            windowHalfX = 572;
            windowHalfY = 720;

            camera.aspect = 572 / 720;
            camera.updateProjectionMatrix();

            renderer.setSize(572, 720);
        } else {
            windowHalfX = 620;
            windowHalfY = 780;

            camera.aspect = 620 / 780;
            camera.updateProjectionMatrix();

            renderer.setSize(620, 780);
        }
    }
}

function animate() {

    requestAnimationFrame(animate);
    controls.update();
    render();

}

function render() {

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(background_scene, background_camera);
    renderer.render(scene, camera);

}

export function loadZrestUrl(url, callback) {
    // var $el = $('#detail_viewer');
    // // progress bar -- by terry
    // $el.append('<div class="closet-progress" style="position:absolute; top:50%;left:50%; margin-left:-100px; margin-top:-5px;">\
    //             <span class="progressGif"></span>\
    //             <span class="progressNumber">0%</span></div>');
    //
    // var $progressGif = $('.closet-progress').find('.progressGif');
    // var $progressNumber = $('.closet-progress').find('.progressNumber');

    var onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            var percent = Math.round(percentComplete, 2);
            //console.log(Math.round(percentComplete, 2) + '% downloaded');
            
            callback(percent)
            // var percentValue = Math.round(percentComplete, 2) + "%";
            // $progressGif.css({ width: percentValue });
            // $progressNumber.html(percentValue);
        }
    };

    var onError = function (xhr) { };

    var loader = new ZRestLoader({_scene: scene, _camera: camera, _controls: controls});
    loader.load(url, function (object) {
        // progress-bar remove
        // $el.find('.closet-progress').animate({
        //     opacity: 0.5,
        // }, 1500, function () {
        //     $el.find('.closet-progress').remove();
        // });

        // loading 이 실제로 마무리되는 곳은 ZRestLoader 의 file reader 쪽에서이므로 scene 에 추가하는 것은 그쪽으로 변경한다. 이곳에서는 실제로 scene 에 object 가 add 되긴 하지만 로딩이 끝나기 전 빈 Object3D 만 추가된다.
        //scene.add(object);

    }, onProgress, onError);
}
/*
function loadOBJ(url_OBJ,url_MTL) {
    var onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function (xhr) { };

    //THREE.Loader.Handlers.add(/\.dds$/i, new THREE.DDSLoader());

    var objLoader = new THREE.OBJLoader();
    objLoader.load(url_OBJ, function (object) {
        scene.add(object);
    }, onProgress, onError);

    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.load(url_MTL, function (materials) {
        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(url_OBJ, function (object) {
            //object.position.y = -95;
            scene.add(object);
        }, onProgress, onError);
    });
}*/

export function changeColorway(number) {
    if (Global._globalColorwaySize - 1 < number) {
        console.log("index is over colorway size");
        return;
    }

    if (Global._globalCurrentColorwayIndex === number) {
        console.log("index is same current index");
        return;
    }

    if (Global._globalZip === undefined || Global._globalZip === null) {
        console.log("zip is null");
        return;
    }
    Global._globalCurrentColorwayIndex = number;

    for (var i = 0 ; i < Global._globalMatMeshInformationList.length ; ++i) {
        var prevMaterial = Global._globalMatMeshInformationList[i].material;
        let preUseSeamPuckeringMap = false;
        if (prevMaterial.uniforms.bUseSeamPuckeringNormal !== undefined)
            preUseSeamPuckeringMap = prevMaterial.uniforms.bUseSeamPuckeringNormal.value;

        SafeDeallocation(prevMaterial, THREE.ShaderMaterial, function () {/*console.log("success deallocation");*/ }, function () {/*console.log("unsuccess deallocation");*/ });

        var id = Global._globalMatMeshInformationList[i].userData;
        Global._globalMatMeshInformationList[i].material = makeMaterialForZrest(Global._globalZip, Global._globalMaterialInformationMap.get(id), number, preUseSeamPuckeringMap, Global._gVersion);
    }
}


function SafeDeallocation(object, type, type_cb, nontype_cb){
	if(object instanceof type){type_cb(object);}
	else{nontype_cb(object);}
}
import * as THREE from 'three'
import { FlatShading } from 'three';
var dataUriToBuffer = require('data-uri-to-buffer');


var PNG = require("pngjs").PNG;

function getImages(arr) {
    const fileArr = []
    for (let face = 0; face < arr.length; face++) {
        fileArr.push(require(`@bg/${arr[face]}`))
    }
    return fileArr
}
function getTexture(file) {
    const data = getImages([file])[0];
    return PNG.sync.read(dataUriToBuffer(data));
}

const genPNGName = (level)=>(face)=>`Environment_m0${level}_c0${face}.png`

// environment map setting
let envMapLoader = new THREE.CubeTextureLoader();
var envDiffuseMap = envMapLoader.load(getImages([
    'Environment_c00.png',
    'Environment_c01.png',
    'Environment_c02.png',
    'Environment_c03.png',
    'Environment_c04.png',
    'Environment_c05.png'
]));
envDiffuseMap.format = THREE.RGBEFormat;
envDiffuseMap.generateMipmaps = false; // 이것만 부르면 텍스처가 새까맣게 나오네. 아래 nearestFilter 적용 안되서
envDiffuseMap.magFilter = THREE.NearestFilter;
envDiffuseMap.minFilter = THREE.NearestFilter;

var cubes = [0,1,2,3,4,5,6,7].map(level=>{
    var texs = [0,1,2,3,4,5].map(face=>{
        return getTexture(genPNGName(level)(face));
        // specularMap.images[face].mipmaps[level] = tex;
    })
    return new THREE.CubeTextureLoader().load(texs);
})

var envSpecularMap = cubes.shift();
envSpecularMap.mipmaps = cubes;
envSpecularMap.generateMipmaps = false;
envSpecularMap.magFilter = THREE.LinearFilter;
envSpecularMap.minFilter = THREE.LinearMipmapLinearFilter;
envSpecularMap.isCompressedTexture = true;
envSpecularMap.format = THREE.RGBEFormat;


export {
    envDiffuseMap,
    envSpecularMap
}
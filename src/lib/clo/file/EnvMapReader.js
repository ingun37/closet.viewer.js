import * as THREE from 'three'
import { FlatShading } from 'three';

function getImages(arr) {
    const fileArr = []
    for (let face = 0; face < arr.length; face++) {
        fileArr.push(require(`@bg/${arr[face]}`))
    }
    return fileArr
}

const genPNGName = (level)=>(face)=>`Environment_m0${level}_c0${face}.png`

// environment map setting
let envMapLoader = new THREE.CubeTextureLoader();
let envDiffuseMap = envMapLoader.load(getImages([
    'Environment_c00.png',
    'Environment_c01.png',
    'Environment_c02.png',
    'Environment_c03.png',
    'Environment_c04.png',
    'Environment_c05.png'
]), function (map) {
    map.format = THREE.RGBEFormat;
    map.generateMipmaps = false; // 이것만 부르면 텍스처가 새까맣게 나오네. 아래 nearestFilter 적용 안되서
    map.magFilter = THREE.NearestFilter;
    map.minFilter = THREE.NearestFilter;
});


var specularCubes = [0,1,2,3,4,5,6,7].map(level=>{
    const imgs = getImages(
        [0,1,2,3,4,5].map(face => genPNGName(level)(face))
    );
    const cube = envMapLoader.load(imgs, function (map) {
        
    });
    return cube
})

var envSpecularMap = specularCubes.shift();
envSpecularMap.mipmaps = specularCubes;
envSpecularMap.generateMipmaps = false;
envSpecularMap.magFilter = THREE.LinearFilter;
envSpecularMap.minFilter = THREE.LinearMipmapLinearFilter;
// map.isCompressedTexture = true;
envSpecularMap.format = THREE.RGBEFormat;
export {
    envDiffuseMap,
    envSpecularMap
}
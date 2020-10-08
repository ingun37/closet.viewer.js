import * as THREE from 'three'
import { FlatShading } from 'three';
var dataUriToBuffer = require('data-uri-to-buffer');

let envDiffuseMap;
let envSpecularMap;

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
envDiffuseMap = envMapLoader.load(getImages([
    'Environment_c00.png',
    'Environment_c01.png',
    'Environment_c02.png',
    'Environment_c03.png',
    'Environment_c04.png',
    'Environment_c05.png'
]));
envDiffuseMap.generateMipmaps = false; // 이것만 부르면 텍스처가 새까맣게 나오네. 아래 nearestFilter 적용 안되서
envDiffuseMap.magFilter = THREE.NearestFilter;
envDiffuseMap.minFilter = THREE.NearestFilter;

// 여기서 부르는 이미지 파일은 실제로는 의미 없다. 아래서 mipmap 으로 채워지는 이미지들이 실제로 사용되기 때문에
envSpecularMap = envMapLoader.load(getImages(['Environment_m00_c00.png', 'Environment_m00_c01.png', 'Environment_m00_c02.png', 'Environment_m00_c03.png', 'Environment_m00_c04.png', 'Environment_m00_c05.png']), function (specularMap) {

    specularMap.generateMipmaps = false;
    specularMap.magFilter = THREE.LinearFilter;
    specularMap.minFilter = THREE.LinearMipMapLinearFilter;
    specularMap.isCompressedTexture = true;

    for (let face = 0; face < 6; face++)
        specularMap.images[face].mipmaps = new Array(8);


    [0,1,2,3,4,5,6,7].forEach(level=>{
        [0,1,2,3,4,5].forEach(face=>{
            const tex = getTexture(genPNGName(level)(face));
            specularMap.images[face].mipmaps[level] = tex;
        })
    })


});

export {
    envDiffuseMap,
    envSpecularMap
}
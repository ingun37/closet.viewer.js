import * as THREE from '@/lib/threejs/three'


let envDiffuseMap;
let envSpecularMap;





function getImages(arr) {
    const fileArr = []
    for (let face = 0; face < arr.length; face++) {
        fileArr.push(require(`@bg/${arr[face]}`))
    }
    return fileArr
}

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

    let subLoader = new THREE.CubeTextureLoader();
    subLoader.load(getImages([
        'Environment_m00_c00.png',
        'Environment_m00_c01.png',
        'Environment_m00_c02.png',
        'Environment_m00_c03.png',
        'Environment_m00_c04.png',
        'Environment_m00_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[0] = texture.images[face];
        }
    });
    subLoader.load(getImages([
        'Environment_m01_c00.png',
        'Environment_m01_c01.png',
        'Environment_m01_c02.png',
        'Environment_m01_c03.png',
        'Environment_m01_c04.png',
        'Environment_m01_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[1] = texture.images[face];
        }
    });
    subLoader.load(getImages([
        'Environment_m02_c00.png',
        'Environment_m02_c01.png',
        'Environment_m02_c02.png',
        'Environment_m02_c03.png',
        'Environment_m02_c04.png',
        'Environment_m02_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[2] = texture.images[face];
        }
    });
    subLoader.load(getImages([
        'Environment_m03_c00.png',
        'Environment_m03_c01.png',
        'Environment_m03_c02.png',
        'Environment_m03_c03.png',
        'Environment_m03_c04.png',
        'Environment_m03_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[3] = texture.images[face];
        }
    });
    subLoader.load(getImages([
        'Environment_m04_c00.png',
        'Environment_m04_c01.png',
        'Environment_m04_c02.png',
        'Environment_m04_c03.png',
        'Environment_m04_c04.png',
        'Environment_m04_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[4] = texture.images[face];
        }
    });
    subLoader.load(getImages([
        'Environment_m05_c00.png',
        'Environment_m05_c01.png',
        'Environment_m05_c02.png',
        'Environment_m05_c03.png',
        'Environment_m05_c04.png',
        'Environment_m05_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[5] = texture.images[face];
        }
    });
    subLoader.load(getImages([
        'Environment_m06_c00.png',
        'Environment_m06_c01.png',
        'Environment_m06_c02.png',
        'Environment_m06_c03.png',
        'Environment_m06_c04.png',
        'Environment_m06_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[6] = texture.images[face];
        }
    });
    subLoader.load(getImages([
        'Environment_m07_c00.png',
        'Environment_m07_c01.png',
        'Environment_m07_c02.png',
        'Environment_m07_c03.png',
        'Environment_m07_c04.png',
        'Environment_m07_c05.png'
    ]), function (texture) {
        for (let face = 0; face < 6; face++) {
            specularMap.images[face].mipmaps[7] = texture.images[face];
        }
    });

});

export {
    envDiffuseMap,
    envSpecularMap
}
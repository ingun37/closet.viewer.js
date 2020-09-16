import { getPreprocessedImageDataURL } from "./index";

test('getImage(a.png)', ()=>{
    const dataURLs = getPreprocessedImageDataURL(['Environment_c00.png']);
    expect(dataURLs.length).toBe(1);
    dataURLs.forEach((dataURL)=>{
        expect(dataURL).toMatch(/^data\:image\/png;base64/);
    });
});
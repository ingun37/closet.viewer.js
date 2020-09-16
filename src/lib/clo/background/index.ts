export function getPreprocessedImageDataURL(arr: string[]):any[] {
    return arr.map(x=>require(`./${x}`));
}
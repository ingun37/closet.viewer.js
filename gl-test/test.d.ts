declare function leven(x:any, y:any):any;
declare module "imghash" {
    export function hash(x:string):Promise<string>;
}
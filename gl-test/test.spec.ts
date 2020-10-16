
import fs from "fs";
import URL from "url";
import PATH from "path"
import { hash } from "imghash";
import leven from "leven";
import puppeteer from "puppeteer";

const StaticServer = require('static-server');
var port = 8787;


const startServer = (rootPath:string) => new Promise<any>((resolve) => {
    port = port + 1;
    const server = new StaticServer({
        rootPath,
        port: port,
        cors: '*',
    });
    server.start( () => {
        console.log('Server listening to', rootPath);
        resolve(server);
    });
});
// Consider using jest-puppeteer

const casesPath = PATH.join(__dirname, 'cases')

const testCases = fs.readdirSync(casesPath).map(x => PATH.join(casesPath, x)).filter(x => fs.statSync(x).isDirectory())

var browser: puppeteer.Browser;
beforeAll(async () => {
    try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-web-security']});
    } catch (error) {
        console.log(error);
    }
})
afterAll(async () => {
    await browser.close();
})

describe.each(testCases)("validation", (casePath:string) => {

    const htmlFilePath = PATH.join(casePath, 'index.html');
    const htmlExists = fs.existsSync(htmlFilePath);
    test(`${htmlFilePath} exists`, () => expect(htmlExists).toBeTruthy());

    const expectPath = PATH.join(casePath, 'expect.png');
    const expectExists = fs.existsSync(expectPath);
    test(`${expectPath} exists`, () => expect(expectExists).toBeTruthy())
})

describe.each(testCases)("graphic", (casePath:string) => {

    const htmlFilePath = PATH.join(casePath, 'index.html');
    const htmlExists = fs.existsSync(htmlFilePath);

    const expectPath = PATH.join(casePath, 'expect.png');
    const expectExists = fs.existsSync(expectPath);
    var server:any 
    beforeEach(async ()=>{
        server = await startServer(casePath);
    })
    afterEach(async ()=> {
        server.stop();
    })
    if (htmlExists && expectExists) {
        test(`${PATH.basename(casePath)} renders as expected`, async () => {

            const page = await browser.newPage();
            // page.on('console', msg => {
            //     for (let i = 0; i < msg.args().length; ++i) console.log(`${i}: ${msg.args()[i]}`);
            // });
            await page.goto(`http://127.0.0.1:${port}`);
            await page.waitForSelector("#finish");
            const element = await page.$("canvas");
            const pngBase64 = await element.screenshot();
            const sampleImgPath = PATH.join(casePath, "result.png");
            fs.writeFileSync(sampleImgPath, pngBase64, { encoding: 'base64' });
            const difference = await calculateDifference(sampleImgPath, expectPath);
            expect(difference).toBeLessThan(1);

            const metrics = await page.metrics();
            console.log(metrics)
            await page.close();
            
        }, 40000)
    }
})

async function calculateDifference(sampleImagePath: string, expectedImagePath: string) {
    const hash1 = await hash(sampleImagePath);
    const hash2 = await hash(expectedImagePath);

    const dist = leven(hash1, hash2);

    return dist;
}

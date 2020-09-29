
import fs from "fs";
import URL from "url";
import PATH from "path"
import { hash } from "imghash";
import leven from "leven";
import puppeteer from "puppeteer";

// Consider using jest-puppeteer

const casesPath = PATH.join(__dirname, 'cases')

const testCases = fs.readdirSync(casesPath).map(x => PATH.join(casesPath, x)).filter(x => fs.statSync(x).isDirectory())

var browser: puppeteer.Browser;
beforeAll(async () => {
    browser = await puppeteer.launch();
})
afterAll(async () => {
    await browser.close();
})

describe.each(testCases)("graphic", (casePath:string) => {
    const htmlFilePath = PATH.join(casePath, 'scenario.html');
    const htmlExists = fs.existsSync(htmlFilePath);
    test(`${htmlFilePath} exists`, () => expect(htmlExists).toBeTruthy());

    const expectPath = PATH.join(casePath, 'expect.png');
    const expectExists = fs.existsSync(expectPath);
    test(`${expectPath} exists`, () => expect(expectExists).toBeTruthy())

    if (htmlExists && expectExists) {
        test(`${PATH.basename(casePath)} renders as expected`, async () => {
            const page = await browser.newPage();
            const htmlFileURL = URL.pathToFileURL(htmlFilePath);
            await page.goto(htmlFileURL.toString());
            await page.waitForSelector("#finish");
            const element = await page.$("canvas");
            const pngBase64 = await element.screenshot();
            const sampleImgPath = PATH.join(casePath, "result.png");
            fs.writeFileSync(sampleImgPath, pngBase64, { encoding: 'base64' });
            const difference = await calculateDifference(sampleImgPath, expectPath);
            expect(difference).toBeLessThan(1);

            const metrics = await page.metrics();
            console.log(metrics)
        })
    }
})

async function calculateDifference(sampleImagePath: string, expectedImagePath: string) {
    const hash1 = await hash(sampleImagePath);
    const hash2 = await hash(expectedImagePath);

    const dist = leven(hash1, hash2);

    return dist;
}

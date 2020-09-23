import { Builder, By, Key, until } from "selenium-webdriver";
import fs from "fs";
import URL from "url";
import PATH from "path"
import { hash } from "imghash";
import leven from "leven";

const casesPath = PATH.join(__dirname, 'cases')

describe('graphic', () => {
    fs.readdirSync(casesPath).map(x => PATH.join(casesPath, x)).filter(x => fs.statSync(x).isDirectory()).forEach(casePath => {

        const htmlFilePath = PATH.join(casePath, 'scenario.html');
        const htmlExists = fs.existsSync(htmlFilePath);
        test(`${htmlFilePath} exists`, () => expect(htmlExists).toBeTruthy());

        const expectPath = PATH.join(casePath, 'expect.png');
        const expectExists = fs.existsSync(expectPath);
        test(`${expectPath} exists`, () => expect(expectExists).toBeTruthy())

        if (htmlExists && expectExists) {
            test(`${PATH.basename(casePath)} renders as expected`, async () => {
                const htmlFileURL = URL.pathToFileURL(htmlFilePath);
                const pngBase64 = await readFrameBuffer(htmlFileURL);
                const sampleImgPath = PATH.join(casePath, "result.png");
                fs.writeFileSync(sampleImgPath, pngBase64, { encoding: 'base64' });
                const difference = await calculateDifference(sampleImgPath, expectPath);
                expect(difference).toBeLessThan(1);
            })
        }
    })
})


async function readFrameBuffer(htmlFileURL: URL) {
    let driver = await new Builder().forBrowser('chrome').build();
    try {
        // Navigate to Url
        await driver.get(htmlFileURL.toString());
        await driver.wait(until.elementLocated(By.id("finish")), 5000);
        const target = await driver.wait(until.elementLocated(By.css('canvas')), 5000);
        const pngBase64 = await target.takeScreenshot();
        return pngBase64;
    }
    finally {
        await driver.quit();
    }
}

async function calculateDifference(sampleImagePath: string, expectedImagePath: string) {
    const hash1 = await hash(sampleImagePath);
    const hash2 = await hash(expectedImagePath);

    const dist = leven(hash1, hash2);

    return dist;
}

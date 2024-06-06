import { launch } from "chrome-launcher";
import { connect } from "puppeteer";
import lighthouse from "lighthouse";
import config from "lighthouse/core/config/lr-desktop-config.js";
import { ReportGenerator } from "lighthouse/report/generator/report-generator.js";
import request from "request";
import { promisify } from "util";
import { writeFile } from "fs";
//import { writeFile } from 'fs-extra/lib/output/index.js';

(async () => {
  const loginURL = "https://idp.nature.com/login/natureuser";
  const logoutURL =
    "https://idp.nature.com/logout/natureuser?redirect_uri=https%3A%2F%2Fwww.nature.com";

  const opts = {
    //chromeFlags: ['--headless'],
    logLevel: "info",
    output: "json",
    disableDeviceEmulation: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    //chromeFlags: ['--disable-mobile-emulation','--no-sandbox', '--disable-setuid-sandbox']
    chromeFlags: [
      "--headless",
      "--disable-mobile-emulation",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  };

  // Launch chrome using chrome-launcher
  const chrome = await launch(opts);
  opts.port = chrome.port;

  // Connect to it using puppeteer.connect().
  const resp = await promisify(request)(
    `http://127.0.0.1:${opts.port}/json/version`
  );
  const { webSocketDebuggerUrl } = JSON.parse(resp.body);
  const browser = await connect({ browserWSEndpoint: webSocketDebuggerUrl });
  // const page = await browser.newPage();

  //Puppeteer
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(loginURL, { waitUntil: "networkidle2" });
  await page.click(
    ".cc-button.cc-button--secondary.cc-button--contrast.cc-banner__button.cc-banner__button-accept"
  );
  await page.click("#login-via-orcid-url");

  await page.waitForSelector('[id="onetrust-accept-btn-handler"]');
  await page.focus('[id="onetrust-accept-btn-handler"]');
  await page.click('[id="onetrust-accept-btn-handler"]');
  // await page.waitFor(1500);
  await page.waitForSelector('[id="username-input"]');
  await page.focus('[id="username-input"]');
  await page.focus('[id="username-input"]', "tharushi.r@intervest.lk", {
    delay: 5,
  });
  await page.type('[id="username-input"]', "tharushi.r@intervest.lk");
  await page.type('[id="password"]', "Rathnayaka@1995");
  await page.evaluate(() => {
    document.querySelector('[id="signin-button"]').click();
  });

  await page.waitForNavigation();

  console.log(page.url());

  // Run Lighthouse.
  const report = await lighthouse(page.url(), opts, config).then((results) => {
    return results;
  });

  const html = ReportGenerator.generateReport(report.lhr, "html");
  // const html = new ReportGenerator(report.lhr, 'html');
  // const reportHtml = ReportGenerator.generateReport(lighthouseResult.lhr, 'html');
  const json = ReportGenerator.generateReport(report.lhr, "json");

  // console.log(`Lighthouse score: ${report.lhr.score}`);
  await page.goto(logoutURL, { waitUntil: "networkidle2" });

  await browser.disconnect();
  chrome.kill();

  //Write report html to the file
  writeFile("report.html", html, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("HTML Report saved successfully.");
    }
  });

  //Write report json to the file
  writeFile("report.json", json, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("JSON Report saved successfully.");
    }
  });
})();

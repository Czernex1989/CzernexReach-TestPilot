const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const NAVIGATION_TIMEOUT_MS = 30000;
const LINK_CHECK_TIMEOUT_MS = 5000;
const MAX_LINKS_TO_CHECK = 25;

function normalizeUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

async function collectLinks(page, baseUrl) {
  const hrefs = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => a.getAttribute('href')).filter(Boolean)
  );

  const seen = new Set();
  const links = [];
  for (const href of hrefs) {
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;
      const normalized = resolved.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      links.push(normalized);
    } catch {
      // ignore malformed hrefs
    }
    if (links.length >= MAX_LINKS_TO_CHECK) break;
  }
  return links;
}

async function checkLink(link) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);
  try {
    let response = await fetch(link, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    if (response.status === 405) {
      response = await fetch(link, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    }
    return { href: link, status: response.status, ok: response.ok };
  } catch {
    return { href: link, status: null, ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function runTest(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const consoleErrors = [];
  let browser;
  let screenshotFile = null;
  let httpStatus = null;
  let title = null;
  let loadTimeMs = null;
  let navigationError = null;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const start = Date.now();
    try {
      const response = await page.goto(url, {
        waitUntil: 'load',
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      loadTimeMs = Date.now() - start;
      httpStatus = response ? response.status() : null;
      title = await page.title();
    } catch (err) {
      loadTimeMs = Date.now() - start;
      navigationError = err.message;
    }

    let brokenLinks = [];
    if (!navigationError) {
      const links = await collectLinks(page, url);
      const results = await Promise.all(links.map(checkLink));
      brokenLinks = results.filter((r) => !r.ok);
    }

    const failed = Boolean(navigationError) || httpStatus === null || httpStatus >= 400;
    const hasWarnings = consoleErrors.length > 0 || brokenLinks.length > 0;

    let status = 'PASS';
    if (failed) status = 'FAIL';
    else if (hasWarnings) status = 'WARNING';

    if (status === 'FAIL') {
      if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      }
      screenshotFile = `${Date.now()}.png`;
      try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotFile), fullPage: true });
      } catch {
        screenshotFile = null;
      }
    }

    return {
      url,
      status,
      httpStatus,
      loadTimeMs,
      title,
      consoleErrors,
      brokenLinks,
      screenshot: screenshotFile,
      error: navigationError,
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { runTest, normalizeUrl };

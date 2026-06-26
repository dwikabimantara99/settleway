// Audit-only browser runner. It does not modify application source or app behavior.
// It launches isolated Microsoft Edge profiles and collects screenshots, console logs,
// network summaries, DOM control inventories, and selected real click outcomes.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Settleway/docs/active/product-recovery-audit';
const EDGE_PATHS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const MAIN_BASE = 'http://127.0.0.1:3100';
const INT_BASE = 'http://127.0.0.1:3101';

const ROUTES = [
  '/',
  '/marketplace',
  '/marketplace/listing-cabai-001',
  '/buyer-requests',
  '/buyer-requests/req-spice-001',
  '/offers/offer-demo-cabai-001',
  '/deals/demo-cabai-001',
  '/notifications',
  '/profiles/buyer-surabaya-restaurant',
  '/profiles/buyer-surabaya-restaurant/reputation',
  '/profiles/seller-probolinggo-cabai',
  '/demo',
  '/dev/deal-state-gallery',
  '/dev/design-lab',
  '/dev/custody-v2-browser-setup',
];

function edgePath() {
  const found = EDGE_PATHS.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Microsoft Edge executable was not found.');
  return found;
}

async function delay(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${url} failed: ${res.status}`);
  return res.json();
}

async function waitForVersion(port) {
  for (let i = 0; i < 50; i += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await delay(200);
    }
  }
  throw new Error(`CDP port ${port} did not become ready.`);
}

async function launchEdge({ port, profile }) {
  await mkdir(profile, { recursive: true });
  const child = spawn(edgePath(), [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=msEdgeSidebarV2',
    'about:blank',
  ], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  await waitForVersion(port);
  return child;
}

async function newCdpPage(port, url = 'about:blank') {
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result ?? {});
      return;
    }
    if (message.method) events.push(message);
  });
  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  return { ws, send, events };
}

async function navigate(page, url) {
  await page.send('Page.navigate', { url });
  for (let i = 0; i < 80; i += 1) {
    const ready = await page.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    });
    if (ready.result?.value === 'complete') break;
    await delay(100);
  }
  await delay(300);
}

async function evaluate(page, expression) {
  const result = await page.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

async function screenshot(page, file) {
  const data = await page.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  await writeFile(file, Buffer.from(data.data, 'base64'));
}

async function snapshot(page) {
  return evaluate(page, `(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const textOf = (el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim();
    const controls = Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[role="menuitem"]'))
      .filter(visible)
      .slice(0, 160)
      .map((el, index) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          index,
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          role: el.getAttribute('role'),
          label: textOf(el).slice(0, 160),
          ariaLabel: el.getAttribute('aria-label'),
          href: el.href || el.getAttribute('href'),
          disabled: Boolean(el.disabled),
          ariaDisabled: el.getAttribute('aria-disabled'),
          pointerEvents: cs.pointerEvents,
          zIndex: cs.zIndex,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        };
      });
    return {
      url: location.href,
      title: document.title,
      bodyTextSample: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 2000),
      controls,
      cookie: document.cookie,
    };
  })()`);
}

async function elementCenter(page, matcher) {
  return evaluate(page, `(() => {
    const matcher = ${JSON.stringify(matcher)};
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none';
    };
    const textOf = (el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim();
    const nodes = Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"],[role="menuitem"]')).filter(visible);
    const found = nodes.find((el) => {
      const text = textOf(el);
      const href = el.href || el.getAttribute('href') || '';
      const aria = el.getAttribute('aria-label') || '';
      return (matcher.text && text.includes(matcher.text)) || (matcher.href && href.includes(matcher.href)) || (matcher.aria && aria.includes(matcher.aria));
    });
    if (!found) return null;
    const r = found.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), tag: found.tagName.toLowerCase(), text: textOf(found), href: found.href || found.getAttribute('href') };
  })()`);
}

async function realClick(page, matcher) {
  const center = await elementCenter(page, matcher);
  if (!center) return { clicked: false, reason: 'target not found', matcher };
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: center.x, y: center.y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: center.x, y: center.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: center.x, y: center.y, button: 'left', clickCount: 1 });
  await delay(500);
  return { clicked: true, center, urlAfter: await evaluate(page, 'location.href') };
}

function summarizeEvents(events) {
  return events
    .filter((event) => ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded', 'Network.responseReceived', 'Network.loadingFailed', 'Network.requestWillBeSent'].includes(event.method))
    .map((event) => {
      if (event.method === 'Network.requestWillBeSent') {
        return { method: event.method, url: event.params.request?.url, requestMethod: event.params.request?.method };
      }
      if (event.method === 'Network.responseReceived') {
        return { method: event.method, url: event.params.response?.url, status: event.params.response?.status };
      }
      if (event.method === 'Network.loadingFailed') {
        return { method: event.method, requestId: event.params.requestId, errorText: event.params.errorText };
      }
      if (event.method === 'Runtime.consoleAPICalled') {
        return { method: event.method, type: event.params.type, text: event.params.args?.map((arg) => arg.value ?? arg.description).join(' ') };
      }
      if (event.method === 'Runtime.exceptionThrown') {
        return { method: event.method, text: event.params.exceptionDetails?.text, url: event.params.exceptionDetails?.url };
      }
      return event;
    });
}

async function auditRoutes(label, base, port) {
  const page = await newCdpPage(port);
  const routeResults = [];
  for (const route of ROUTES) {
    const safe = route.replaceAll('/', '_').replaceAll('[', '').replaceAll(']', '').replace(/^_$/, 'home');
    try {
      await navigate(page, `${base}${route}`);
      const snap = await snapshot(page);
      await screenshot(page, `${ROOT}/screenshots/${label}-${safe}.png`);
      routeResults.push({ branch: label, route, status: 'loaded', ...snap });
    } catch (error) {
      routeResults.push({ branch: label, route, status: 'failed', error: error.message });
    }
  }
  await writeFile(`${ROOT}/console/${label}-browser-events.json`, JSON.stringify(summarizeEvents(page.events), null, 2));
  await writeFile(`${ROOT}/network/${label}-network-summary.json`, JSON.stringify(summarizeEvents(page.events).filter((e) => e.method?.startsWith('Network.')), null, 2));
  await writeFile(`${ROOT}/runtime/${label}-route-control-inventory.json`, JSON.stringify(routeResults, null, 2));
  return { page, routeResults };
}

async function auditCoreClicks(label, base, page) {
  const results = [];
  async function step(name, url, matcher) {
    await navigate(page, url);
    const before = await snapshot(page);
    const click = await realClick(page, matcher);
    const after = await snapshot(page);
    results.push({ branch: label, name, url, matcher, beforeUrl: before.url, click, afterUrl: after.url, afterText: after.bodyTextSample, controlsBefore: before.controls });
  }

  await step('landing-marketplace-dropdown', `${base}/`, { text: 'Marketplace' });
  await screenshot(page, `${ROOT}/screenshots/${label}-click-landing-marketplace-dropdown.png`);
  await step('landing-explore-marketplace', `${base}/`, { text: 'Explore Marketplace' });
  await step('marketplace-view-details', `${base}/marketplace`, { text: 'View Details' });
  await step('listing-submit-offer', `${base}/marketplace/listing-cabai-001`, { text: 'Submit Offer' });
  await step('role-switcher-open', `${base}/marketplace`, { aria: 'Open demo role switcher' });
  await screenshot(page, `${ROOT}/screenshots/${label}-click-role-switcher-open.png`);
  await step('deal-room-primary-action', `${base}/deals/demo-cabai-001`, { text: 'Fund' });

  await writeFile(`${ROOT}/runtime/${label}-core-clicks.json`, JSON.stringify(results, null, 2));
  return results;
}

async function auditIntegrationCustodySetup(page) {
  const result = { setup: null, buyerDealRoom: null, sellerDealRoom: null };
  await navigate(page, `${INT_BASE}/dev/custody-v2-browser-setup`);
  await screenshot(page, `${ROOT}/screenshots/integration-dev-custody-v2-browser-setup.png`);
  const setupSnap = await snapshot(page);
  result.setup = setupSnap;

  const sdk = await import('file:///D:/Settleway-audit-integration/web/node_modules/@stellar/stellar-sdk/lib/index.js');
  const buyer = sdk.Keypair.random().publicKey();
  const seller = sdk.Keypair.random().publicKey();

  const apiResult = await evaluate(page, `fetch('/api/dev/custody-v2-browser-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyer_address: '${buyer}', seller_address: '${seller}' })
  }).then(async (res) => ({ status: res.status, body: await res.json() }))`);
  result.apiResult = apiResult;
  const dealUrl = apiResult.body?.data?.deal_room_url;

  if (dealUrl) {
    await navigate(page, dealUrl);
    await screenshot(page, `${ROOT}/screenshots/integration-custody-v2-deal-buyer.png`);
    result.buyerDealRoom = await snapshot(page);

    const sellerPage = await newCdpPage(9334);
    await navigate(sellerPage, INT_BASE);
    await evaluate(sellerPage, `document.cookie = 'mock_actor=seller-probolinggo-cabai; path=/; max-age=86400'; true`);
    await navigate(sellerPage, dealUrl);
    await screenshot(sellerPage, `${ROOT}/screenshots/integration-custody-v2-deal-seller.png`);
    result.sellerDealRoom = await snapshot(sellerPage);
    result.sellerEvents = summarizeEvents(sellerPage.events);
  }

  await writeFile(`${ROOT}/runtime/integration-custody-v2-setup-and-deal.json`, JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  await mkdir(`${ROOT}/screenshots`, { recursive: true });
  await mkdir(`${ROOT}/console`, { recursive: true });
  await mkdir(`${ROOT}/network`, { recursive: true });
  await mkdir(`${ROOT}/runtime`, { recursive: true });

  await launchEdge({ port: 9333, profile: 'D:/Settleway/.audit-edge-main' });
  await launchEdge({ port: 9334, profile: 'D:/Settleway/.audit-edge-integration' });

  const mainAudit = await auditRoutes('main', MAIN_BASE, 9333);
  const intAudit = await auditRoutes('integration', INT_BASE, 9334);
  const mainClicks = await auditCoreClicks('main', MAIN_BASE, mainAudit.page);
  const intClicks = await auditCoreClicks('integration', INT_BASE, intAudit.page);
  const custody = await auditIntegrationCustodySetup(intAudit.page);

  const summary = {
    auditedAt: new Date().toISOString(),
    mainBase: MAIN_BASE,
    integrationBase: INT_BASE,
    routeCountPerBranch: ROUTES.length,
    mainControls: mainAudit.routeResults.reduce((sum, r) => sum + (r.controls?.length ?? 0), 0),
    integrationControls: intAudit.routeResults.reduce((sum, r) => sum + (r.controls?.length ?? 0), 0),
    mainClickCount: mainClicks.length,
    integrationClickCount: intClicks.length,
    custodySetupCreatedDeal: Boolean(custody.apiResult?.body?.data?.deal_room_url),
    custodyDealUrl: custody.apiResult?.body?.data?.deal_room_url ?? null,
  };
  await writeFile(`${ROOT}/runtime/audit-browser-summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

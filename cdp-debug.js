const http = require('http');
const WebSocket = require('ws');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, response => {
      let data = '';
      response.on('data', chunk => {
        data += chunk;
      });
      response.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  const tabs = await getJson('http://localhost:9223/json');
  const tab = tabs.find(item => item.url.includes('/editor/2')) || tabs[0];
  console.log('TAB', tab.url);

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.on('message', message => {
    const msg = JSON.parse(message);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(
        'CONSOLE',
        msg.params.type,
        msg.params.args.map(arg => arg.value || arg.description).join(' ')
      );
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION', msg.params.exceptionDetails.text);
    }
  });

  await new Promise(resolve => ws.on('open', resolve));
  const send = (method, params = {}) =>
    new Promise(resolve => {
      const requestId = ++id;
      pending.set(requestId, resolve);
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:4200/editor/2' });
  await new Promise(resolve => setTimeout(resolve, 8000));

  const expression = `(() => {
    const rect = o => {
      if (!o) return null;
      const r = o.getBoundingClientRect();
      const cs = getComputedStyle(o);
      return {
        tag: o.tagName,
        cls: String(o.className),
        id: o.id,
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        overflow: cs.overflow,
        position: cs.position,
        z: cs.zIndex,
        bg: cs.backgroundColor
      };
    };
    const canvases = [...document.querySelectorAll('canvas')];
    const pages = [...document.querySelectorAll('.page')];
    const sample = canvases.slice(0, 3).map((canvas, i) => {
      let pixel = null;
      let err = null;
      try {
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        pixel = [...data];
      } catch (e) {
        err = e.message;
      }
      return { i, width: canvas.width, height: canvas.height, rect: rect(canvas), pixel, err };
    });
    return {
      url: location.href,
      body: rect(document.body),
      appViewer: rect(document.querySelector('app-pdf-viewer')),
      wrap: rect(document.querySelector('.wrap')),
      ngx: rect(document.querySelector('ngx-extended-pdf-viewer')),
      outer: rect(document.querySelector('#outerContainer')),
      viewerContainer: rect(document.querySelector('#viewerContainer')),
      viewer: rect(document.querySelector('#viewer')),
      pages: pages.map(rect),
      canvasCount: canvases.length,
      canvases: sample,
      text: document.body.innerText.slice(0, 500)
    };
  })()`;

  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  console.log(JSON.stringify(result.result.result.value, null, 2));
  ws.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

import * as vscode from "vscode"
import { StreamDaemon } from "./streamDaemon"

function getNonce() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let n = ""
  for (let i = 0; i < 32; i++) n += chars[Math.floor(Math.random() * chars.length)]
  return n
}

export class ViewportPanel {
  private panel: vscode.WebviewPanel
  private daemon: StreamDaemon | null = null
  private disposables: vscode.Disposable[] = []

  constructor(context: vscode.ExtensionContext) {
    this.panel = vscode.window.createWebviewPanel(
      "argon.viewport",
      "Argon Viewport",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [],
      }
    )

    this.panel.webview.html = this.buildHtml()

    this.panel.webview.onDidReceiveMessage(
      (msg: { type: string }) => this.handleMessage(msg),
      undefined,
      this.disposables
    )

    this.panel.onDidDispose(() => this.dispose(), undefined, this.disposables)
    context.subscriptions.push(this.panel)
  }

  private async handleMessage(msg: { type: string }) {
    if (msg.type === "connect") {
      await this.startStream()
    } else if (msg.type === "disconnect") {
      this.stopDaemon()
    }
  }

  private async startStream() {
    this.stopDaemon()
    this.daemon = new StreamDaemon()
    try {
      const port = await this.daemon.start()
      const { token } = this.daemon
      this.panel.webview.postMessage({ type: "ready", port, token })
    } catch (err) {
      this.daemon = null
      this.panel.webview.postMessage({
        type: "error",
        message: String(err),
      })
    }
  }

  private stopDaemon() {
    this.daemon?.stop()
    this.daemon = null
  }

  dispose() {
    this.stopDaemon()
    this.disposables.forEach((d) => d.dispose())
  }

  private buildHtml(): string {
    const nonce = getNonce()
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  img-src blob: data:;
  style-src 'unsafe-inline';
  script-src 'nonce-${nonce}';
  connect-src ws://127.0.0.1:*;
">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1e1e1e;color:#ccc;font-family:var(--vscode-font-family,sans-serif);
  display:flex;flex-direction:column;height:100vh;overflow:hidden;user-select:none}
#toolbar{display:flex;align-items:center;gap:8px;padding:5px 10px;
  background:#252526;border-bottom:1px solid #3c3c3c;flex-shrink:0;font-size:12px}
#status{opacity:.7;flex:1}
button{padding:3px 10px;font-size:12px;border:none;border-radius:2px;cursor:pointer}
#connectBtn{background:#0e639c;color:#fff}
#connectBtn:hover{background:#1177bb}
#connectBtn:disabled{opacity:.5;cursor:default}
#disconnectBtn{background:#5a1d1d;color:#fff;display:none}
#disconnectBtn:hover{background:#7a2929}
#canvasWrap{flex:1;position:relative;background:#000;overflow:hidden;
  display:flex;align-items:center;justify-content:center}
canvas{display:block;max-width:100%;max-height:100%;cursor:crosshair}
#hint{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
  font-size:11px;color:rgba(255,255,255,.35);pointer-events:none;white-space:nowrap}
#overlay{position:absolute;inset:0;display:flex;align-items:center;
  justify-content:center;color:#555;font-size:14px}
#overlay.hidden{display:none}
</style>
</head>
<body>
<div id="toolbar">
  <button id="connectBtn">Connect</button>
  <button id="disconnectBtn">Disconnect</button>
  <span id="status">Not connected</span>
</div>
<div id="canvasWrap">
  <canvas id="canvas"></canvas>
  <div id="hint">Click canvas to capture input</div>
  <div id="overlay">Connect to start streaming</div>
</div>
<script nonce="${nonce}">(function(){
const vscode = acquireVsCodeApi();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const hint = document.getElementById('hint');
const statusEl = document.getElementById('status');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');

let streamWs = null, inputWs = null, locked = false;
let robloxW = 0, robloxH = 0;  // native Roblox window dims from frame header
let cssW = 0, cssH = 0;        // canvas CSS rendered size, kept accurate by ResizeObserver
let pendingFrame = null;        // ImageData | ImageBitmap waiting for next rAF

// ── Canvas sizing ─────────────────────────────────────────────────────────
// Set pixel buffer to half-res; CSS aspect-ratio handles letterboxing.
function initCanvas(w, h) {
  if (robloxW === w && robloxH === h) return;
  robloxW = w; robloxH = h;
  canvas.width  = w >> 1;
  canvas.height = h >> 1;
  canvas.style.aspectRatio = w + ' / ' + h;
}

// ResizeObserver keeps cssW/cssH in sync after every reflow so mouse scaling
// always reads the correct rendered size, not a stale clientWidth.
new ResizeObserver(entries => {
  for (const e of entries) {
    cssW = e.contentRect.width;
    cssH = e.contentRect.height;
  }
}).observe(canvas);

// ── Draw loop ─────────────────────────────────────────────────────────────
(function draw() {
  if (pendingFrame) {
    const f = pendingFrame; pendingFrame = null;
    if (f instanceof ImageData) {
      ctx.putImageData(f, 0, 0);           // raw RGBA: sync, ~0.5 ms, no decode
    } else {
      ctx.drawImage(f, 0, 0, canvas.width, canvas.height);
      f.close();
    }
  }
  requestAnimationFrame(draw);
})();

// ── Input send ────────────────────────────────────────────────────────────
function send(obj) {
  if (inputWs && inputWs.readyState === 1) inputWs.send(JSON.stringify(obj));
}

// Canvas-local CSS px → Roblox window px using ResizeObserver dimensions.
function scaleCoords(ox, oy) {
  if (!robloxW || !robloxH || !cssW || !cssH) return [Math.round(ox), Math.round(oy)];
  return [Math.round(ox * robloxW / cssW), Math.round(oy * robloxH / cssH)];
}

// ── Pointer lock ─────────────────────────────────────────────────────────
canvas.addEventListener('click', () => { if (streamWs) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  hint.textContent = locked ? 'Esc to release pointer' : 'Click canvas to capture input';
  send({ type: locked ? 'lock' : 'unlock' });
});

// ── Keyboard ─────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => { if (!streamWs) return; e.preventDefault(); send({ type: 'keydown', key: e.code }); });
window.addEventListener('keyup',   e => { if (!streamWs) return; send({ type: 'keyup',   key: e.code }); });

// ── Mouse ────────────────────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (!streamWs) return;
  if (locked) {
    send({ type: 'mousedelta', dx: e.movementX, dy: e.movementY });
  } else {
    const [x, y] = scaleCoords(e.offsetX, e.offsetY);
    send({ type: 'mousemove', x, y });
  }
});
canvas.addEventListener('mousedown', e => {
  if (!streamWs) return;
  const [x, y] = scaleCoords(e.offsetX, e.offsetY);
  send({ type: 'mousedown', button: e.button, x, y });
});
canvas.addEventListener('mouseup', e => {
  if (!streamWs) return;
  const [x, y] = scaleCoords(e.offsetX, e.offsetY);
  send({ type: 'mouseup', button: e.button, x, y });
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ── Connect / disconnect ─────────────────────────────────────────────────
function onConnected() {
  statusEl.textContent = 'Connected';
  overlay.classList.add('hidden');
  connectBtn.style.display = 'none';
  disconnectBtn.style.display = '';
}

function disconnect() {
  if (!streamWs && !inputWs) return;
  streamWs?.close(); inputWs?.close();
  streamWs = null; inputWs = null; locked = false;
  statusEl.textContent = 'Disconnected';
  overlay.classList.remove('hidden');
  connectBtn.style.display = ''; connectBtn.disabled = false;
  disconnectBtn.style.display = 'none';
  hint.textContent = 'Click canvas to capture input';
  vscode.postMessage({ type: 'disconnect' });
}

function connect(port, token) {
  statusEl.textContent = 'Connecting…';

  streamWs = new WebSocket('ws://127.0.0.1:' + port + '/stream');
  streamWs.binaryType = 'arraybuffer';
  streamWs.addEventListener('open', () => streamWs.send(JSON.stringify({ token })));
  streamWs.addEventListener('message', ev => {
    if (!(ev.data instanceof ArrayBuffer) || ev.data.byteLength < 10) return;
    const dv = new DataView(ev.data);
    const fw = dv.getUint16(0, false), fh = dv.getUint16(2, false);
    const fmt = dv.getUint8(4);
    initCanvas(fw, fh);
    const hw = fw >> 1, hh = fh >> 1;
    if (fmt === 1) {
      // Raw RGBA (fmt=1): no decode, just wrap — putImageData in next rAF
      const expected = 10 + hw * hh * 4;
      if (ev.data.byteLength < expected) return;
      pendingFrame = new ImageData(new Uint8ClampedArray(ev.data, 10, hw * hh * 4), hw, hh);
    } else {
      // JPEG fallback (fmt=0)
      const blob = new Blob([new Uint8Array(ev.data, 10)], { type: 'image/jpeg' });
      createImageBitmap(blob).then(bmp => { pendingFrame = bmp; });
    }
  });
  streamWs.addEventListener('close', disconnect);
  streamWs.addEventListener('error', disconnect);

  inputWs = new WebSocket('ws://127.0.0.1:' + port + '/input');
  inputWs.addEventListener('open', () => { inputWs.send(JSON.stringify({ token })); onConnected(); });
  inputWs.addEventListener('close', disconnect);
  inputWs.addEventListener('error', disconnect);
}

connectBtn.addEventListener('click', () => {
  statusEl.textContent = 'Starting daemon…';
  connectBtn.disabled = true;
  vscode.postMessage({ type: 'connect' });
});
disconnectBtn.addEventListener('click', disconnect);

// ── Messages from extension host ─────────────────────────────────────────
window.addEventListener('message', ev => {
  const msg = ev.data;
  if (msg.type === 'ready') connect(msg.port, msg.token);
  else if (msg.type === 'error') { statusEl.textContent = 'Error: ' + msg.message; connectBtn.disabled = false; }
});
})();</script>
</body>
</html>`
  }
}

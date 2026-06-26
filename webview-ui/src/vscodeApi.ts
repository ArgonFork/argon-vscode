declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
};

// acquireVsCodeApi can only be called once per webview lifetime
const api = acquireVsCodeApi();

export function postMessage(msg: unknown): void {
  api.postMessage(msg);
}

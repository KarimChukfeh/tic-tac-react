import { runBrowserPrimitiveProbe } from './runBrowserPrimitiveProbe';

const output = document.querySelector('#result');

if (!['127.0.0.1', 'localhost'].includes(globalThis.location.hostname)) {
  output.textContent = JSON.stringify({ status: 'blocked', reason: 'local-only' });
} else {
  runBrowserPrimitiveProbe()
    .then((result) => {
      output.textContent = JSON.stringify({ status: 'passed', ...result }, null, 2);
    })
    .catch((error) => {
      output.textContent = JSON.stringify({
        status: 'failed',
        errorCode: error?.name || 'BrowserProbeError',
      }, null, 2);
    });
}

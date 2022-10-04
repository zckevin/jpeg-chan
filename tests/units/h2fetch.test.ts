import { NodeH2Fetch, defaultNodeH2Client, FetchConfig, defaultFetchConfig } from "../../src/h2fetch"
import { AbortSignal, AbortController } from "fetch-h2";
import { Subject, of, delay, takeUntil } from "rxjs";
import http2 from "node:http2"
import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const HTTP1_PORT = 6790;
const HTTP2_PORT = 6789;
const HTTP1_ONLY_URL = `http://localhost:${HTTP1_PORT}`;
const HTTP2_40x_URL = `https://localhost:${HTTP2_PORT}/status/404`;
const HTTP2_50x_URL = `https://localhost:${HTTP2_PORT}/status/501`;
const HTTP2_TIMEOUT_URL = `https://localhost:${HTTP2_PORT}/delay/10`;
const testFetchConfig = new FetchConfig(1, 0, 10_000, defaultFetchConfig.user_agent);

let http2server: http2.Http2SecureServer;
let http1server: http.Server;
const serverDelayCancelSubjects = [];

function spawnHTTP1Server(port: number) {
  http1server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Connection': 'close' });
    res.end("Hello");
  })
  http1server.listen(port);
}

function spawnHTTP2Server(port: number) {
  const server = http2.createSecureServer({
    key: fs.readFileSync(path.resolve(__dirname, '../localhost-privkey.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, '../localhost-cert.pem')),
  });
  server.on('error', (err) => console.error(err));
  server.on('stream', (stream, headers) => {
    const [_, cmd, v] = headers[':path']?.split('/');
    switch (cmd) {
      case 'status': {
        stream.respond({
          'content-type': 'text/plain',
          ':status': parseInt(v) || 200,
        });
        stream.end('Hello');
        break;
      }
      case 'delay': {
        // shutdown all timers to make sure jest would exit after all tests
        const cancelSub = new Subject();
        of(1).pipe(
          delay(parseInt(v) * 1000),
          takeUntil(cancelSub),
        ).subscribe({
          next: () => {
            stream.respond({
              'content-type': 'text/html; charset=utf-8',
              ':status': 200,
            });
            stream.end('Hello');
          }
        });
        serverDelayCancelSubjects.push(cancelSub);
        break;
      }
      default:
        throw new Error(`Unknown path: ${headers[':path']}`);
    }
  });
  http2server = server;
  server.listen(port);
}

async function fetchTest(
  url: string,
  errRegex: RegExp,
  expectedFetchN: number,
  abortSignal: AbortSignal = null,
  fetchConfig = testFetchConfig,
) {
  let fetchN = 0;
  defaultNodeH2Client.onDoFetch = async (url, _) => {
    fetchN += 1;
  }
  await expect(NodeH2Fetch(url, abortSignal, fetchConfig)).rejects.toThrow(errRegex);
  expect(fetchN).toBe(expectedFetchN);
}

beforeAll(() => {
  defaultNodeH2Client.enableSelfSignedCert();
  spawnHTTP1Server(HTTP1_PORT);
  spawnHTTP2Server(HTTP2_PORT);
});

afterAll(async () => {
  await defaultNodeH2Client.disconnectAll();
  serverDelayCancelSubjects.map(s => {
    s.next(1);
    s.complete();
  });
  http1server.close();
  http2server.close();
});

test("Non-http2 website should fail immediately", async () => {
  await fetchTest(HTTP1_ONLY_URL, /.*site does not support HTTP\/2.*/, 1);
});

test("40x responses should fail immediately", async () => {
  await fetchTest(HTTP2_40x_URL, /.*failed with status code: 404.*/, 1);
});

test("non-40x responses should retry", async () => {
  await fetchTest(HTTP2_50x_URL, /.*failed with status code: 501.*/, 2);
});

test("timeout resp should retry", async () => {
  const timeoutMs = 1;
  const config = new FetchConfig(1, 0, timeoutMs, defaultFetchConfig.user_agent);
  await fetchTest(HTTP2_TIMEOUT_URL, /.*timed out after.*/, 2, null, config);
});

test("abort signal should works", async () => {
  const ctr = new AbortController();
  setTimeout(() => ctr.abort(), 10);
  await fetchTest(HTTP2_TIMEOUT_URL, /.*aborted.*/, 1, ctr.signal);
})
import { NodeH2Fetch, defaultNodeH2Client, FetchConfig, defaultFetchConfig } from "../../src/sinks/http"
import { AbortSignal, AbortController } from "fetch-h2";

const HTTP1_ONLY_URL = "http://www.baidu.com/robots.txt";
const HTTP2_200_URL = "https://httpbin.org/status/200";
const HTTP2_40x_URL = "https://httpbin.org/status/404";
const HTTP2_50x_URL = "https://httpbin.org/status/501";
const HTTP2_TIMEOUT_URL = "https://httpbin.org/delay/10";

const testFetchConfig = new FetchConfig(1, 0, 10_000, defaultFetchConfig.user_agent);

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
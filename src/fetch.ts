import { assert } from "./assert";
import { context } from "fetch-h2";
import { AbortSignal } from "abort-controller";
import { defer, from, retry, timer } from 'rxjs';
import fetch from "node-fetch";
import debug from 'debug';

export class FetchConfig {
  constructor(
    public retry_n: number,
    public retry_delay_ms: number,
    public timeout_ms: number,
    public user_agent: string,
    public use_http2: boolean = false,
  ) {
    assert(retry_n >= 0);
    assert(retry_delay_ms >= 0);
    assert(timeout_ms >= 0);
  }

  // +/-25% jitter
  getRetryDelay() {
    return ((Math.random() - 0.5) / 2 + 1) * this.retry_delay_ms;
  }
}

export const defaultFetchConfig = new FetchConfig(
  3,
  1_000,
  10_000,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
  false,
);

class BaseClient {
  public onDoFetch: (url: string, config: FetchConfig) => void;
}

class NodeH2Client extends BaseClient {
  public log = debug('jpeg:h2fetch');
  private ctx = context({
    userAgent: defaultFetchConfig.user_agent,
    overwriteUserAgent: true,
  });

  constructor() {
    super();
  }

  async doFetch(url: string, signal: AbortSignal, config: FetchConfig): Promise<ArrayBuffer> {
    this.onDoFetch?.(url, config);
    this.log("fetch start:", url, config);
    const resp = await this.ctx.fetch(url, {
      // signal: signal,
      method: "GET",
      timeout: config.timeout_ms,
    });

    assert(resp.httpVersion === 2, "NodeH2Client fatal: site does not support HTTP/2");
    if (!resp.ok) {
      // if (Math.floor(resp.status / 100) === 4) {
      //   throw new Error(`NodeH2Client fatal: Fetch failed with status code: ${resp.status}`);
      // } else {
      throw new Error(`NodeH2Client: Fetch failed with status code: ${resp.status}`);
    }
    const result = await resp.arrayBuffer();
    this.log("fetch end:", url);
    return result;
  }

  enableSelfSignedCert() {
    this.ctx = context({
      userAgent: defaultFetchConfig.user_agent,
      overwriteUserAgent: true,
      session: {
        rejectUnauthorized: false,
      }
    });
  }

  async disconnectAll() {
    await this.ctx.disconnectAll();
  }
}

class NodeH1Client extends BaseClient {
  public log = debug('jpeg:h1fetch');

  constructor() {
    super();
  }

  async doFetch(url: string, signal: AbortSignal, config: FetchConfig): Promise<ArrayBuffer> {
    this.onDoFetch?.(url, config);
    this.log("fetch start:", url, config);

    const resp = await fetch(url, {
      method: "GET",
      signal: signal,
      timeout: config.timeout_ms,
    })
    if (!resp.ok) {
      throw new Error(`NodeH2Client: Fetch failed with status code: ${resp.status}`);
    }
    const result = await resp.arrayBuffer();
    this.log("fetch end:", url);
    return result;
  }
}

export const defaultNodeH2Client = new NodeH2Client();
export const defaultNodeH1Client = new NodeH1Client();

export async function NodeFetch(url: string, signal: AbortSignal = null, config: FetchConfig = defaultFetchConfig): Promise<ArrayBuffer> {
  const client = config.use_http2 ? defaultNodeH2Client : defaultNodeH1Client;
  return new Promise((resolve, reject) => {
    defer(() => from(client.doFetch(url, signal, config))).pipe(
      retry({
        delay: (err: any, count: number) => {
          client.log(`fetch (nth:${count}) err`, err);
          if (err.message.includes("fatal") || err.message.includes("aborted")) {
            throw err;
          }
          if (count > config.retry_n) {
            throw err;
          }
          client.log(`fetch retry:`, url);
          return timer(config.getRetryDelay());
        },
      })
    ).subscribe({
      next: (value: ArrayBuffer) => {
        resolve(value);
      },
      error: (err: any) => {
        reject(err);
      },
    })
  })
}

import { assert } from "./assert";

export type Task<T> = () => Promise<T>;

export class Tasker<ResultT> {
  private max_concurrency: number;
  private running: Set<number> = new Set();
  private waiting: Array<{ index: number, fn: Task<ResultT> }> = new Array();
  public results: Array<ResultT>;

  private promise: Promise<void>;
  private resolveFn: () => void;
  private rejectFn: (err: Error) => void;

  constructor(tasks: Array<Task<ResultT>>, max_concurrency: number, options = {}) {
    console.log(`Tasker start with concurrency: ${max_concurrency}`);
    assert(max_concurrency > 0);
    this.max_concurrency = max_concurrency;
    tasks.map((fn, index) => this.AddTask(index, fn));

    this.promise = new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    })
    this.results = new Array(tasks.length);
  }

  get waiting_size() {
    return this.waiting.length;
  }

  get running_size() {
    return this.running.size;
  }

  get done() {
    return this.promise;
  }

  private exec(index: number, fn: Task<ResultT>) {
    this.running.add(index);
    const cb = (result: ResultT) => {
      this.results[index] = result;
      this.running.delete(index);
      this.notify();
    }
    fn().then(cb).catch(err => {
      // console.warn(`Task(index:${index}) met error:`, err);
      // cb();
      this.rejectFn(err);
    })
  }

  private notify() {
    if (this.running_size === 0 && this.waiting_size === 0) {
      this.resolveFn();
      return;
    }
    while (this.running_size < this.max_concurrency && this.waiting_size > 0) {
      const { index, fn } = this.waiting.shift()!;
      this.exec(index, fn);
    }
  }

  AddTask(index: number, fn: Task<ResultT>) {
    assert(typeof index === "number");
    assert(typeof fn === "function");
    if (this.running_size < this.max_concurrency) {
      this.exec(index, fn);
    } else {
      this.waiting.push({ index, fn });
    }
  }
}
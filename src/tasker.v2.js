import { assert } from "./assert.js";

export class Tasker {
  constructor(tasks, max_concurrency, options = {}) {
    assert(max_concurrency > 0);
    this.max_concurrency = max_concurrency;
    this.running = new Set();
    this.waiting = new Array();
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

  exec(index, fn) {
    this.running.add(index);
    const cb = (result) => {
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

  notify() {
    if (this.running_size === 0 && this.waiting_size === 0) {
      this.resolveFn();
      return;
    }
    while (this.running_size < this.max_concurrency && this.waiting_size > 0) {
      const { index, fn } = this.waiting.shift();
      this.exec(index, fn);
    }
  }

  AddTask(index, fn) {
    assert(typeof index === "number");
    assert(typeof fn === "function");
    if (this.running_size < this.max_concurrency) {
      this.exec(index, fn);
    } else {
      this.waiting.push({ index, fn });
    }
  }
}
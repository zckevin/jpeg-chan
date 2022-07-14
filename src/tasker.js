import { assert } from "./assert.js";

export class Tasker {
  constructor(max_concurrency) {
    assert(max_concurrency > 0);
    this.max_concurrency = max_concurrency;
    this.running = new Set();
    this.waiting = new Array();
  }

  get waiting_size() {
    return this.waiting.length;
  }

  get running_size() {
    return this.running.size;
  }

  exec(key, fn) {
    this.running.add(key);
    const cb = () => {
      this.running.delete(key);
      this.notify();
    }
    fn().then(cb).catch(err => {
      console.warn(`Task(key:${key}) met error:`, err);
      cb();
    })
  }

  notify() {
    while (this.running_size < this.max_concurrency && this.waiting_size > 0) {
      const { key, fn } = this.waiting.shift();
      this.exec(key, fn);
    }
  }

  AddTask(key, fn) {
    if (this.running_size < this.max_concurrency) {
      this.exec(key, fn);
    } else {
      this.waiting.push({ key, fn });
    }
  }
}

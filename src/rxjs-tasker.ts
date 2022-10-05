import { workerPool } from './workers';
import { AbortController } from "fetch-h2";
import * as Rx from 'rxjs'
import _ from "lodash";
import debug from 'debug';

const logger = debug('jpeg:rxtask');

export class RxTask {
  private log = logger.extend('download');
  private pool = workerPool;
  private abortCtr = new AbortController();
  private nextTaskID = 0;
  private runningTasklets = new Set<number>();
  private currentIndex = 0;
  private source$ = new Rx.ReplaySubject<number>();
  private hasLimitedTasklet = false;

  constructor(
    private totalLength: number,
    private concurrency: number,
  ) { }

  static Create(
    totalLength: number,
    concurrency: number,
  ) {
    const task = new RxTask(totalLength, concurrency);
    task.log("create task totalLength,concurrency:", totalLength, concurrency);
    for (let i = 0; i < concurrency; i++) {
      task.notifySource();
    }
    return {
      task,
      source$: task.source$,
      pool: task.pool,
      abortCtr: task.abortCtr,
    }
  }

  private notifySource(err?: Error) {
    if (err) {
      this.source$.error(err);
      return;
    }
    if (this.currentIndex >= this.totalLength) {
      this.source$.complete();
      return;
    }
    // this.log("notify source", this.currentIndex);
    this.source$.next(this.currentIndex++);
  }

  private async onError(err: any) {
    console.error("Error in worker pool", err);
    this.notifySource(err);
    this.abortCtr.abort();
  }

  private addRunning() {
    const taskID = this.nextTaskID++;
    this.runningTasklets.add(taskID);
    return taskID;
  }

  private removeRunning(taskIndex: number) {
    this.runningTasklets.delete(taskIndex);
    if (this.runningTasklets.size < this.concurrency) {
      this.notifySource();
    }
  }

  public createLimitedTasklet<In, Out>(fn: (arg: In) => Promise<Out>) {
    this.hasLimitedTasklet = true;
    const wrapper = async (arg: In) => {
      // this.log("start tasklet", arg);
      try {
        const taskID = this.addRunning();
        const result = await fn(arg);
        this.removeRunning(taskID);
        return result;
      } catch (err) {
        await this.onError(err);
        throw err;
      }
    }
    return Rx.mergeMap((arg: In) => Rx.from(wrapper(arg)));
  }

  public createUnlimitedTasklet<In, Out>(fn: (_: In) => Promise<Out>) {
    return Rx.mergeMap((arg: In) => Rx.from(fn(arg)));
  }

  public async collect<T>(ob: Rx.Observable<T>) {
    if (!this.hasLimitedTasklet) {
      throw new Error("No limited tasklet registered yet");
    }
    return await Rx.firstValueFrom(ob);
  }

  public getRunningTasklets() {
    return this.runningTasklets;
  }
}

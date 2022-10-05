import { RxTask } from "../../src/rxjs-tasker"
import { firstValueFrom, Subject, toArray, map, tap } from "rxjs"

const totalTasksLength = 3;
const concurrency = 2;
const expected = [0, 1, 2];

test("RxTask would complete", async () => {
  let i = 0;
  const createWorkerFn = () => {
    return async () => {
      return i++;
    }
  }
  const { task, source$ } = RxTask.Create(totalTasksLength, concurrency);
  const ob = source$.pipe(
    task.createLimitedTasklet(createWorkerFn()),
    toArray(),
  );
  const result = await task.collect(ob);
  expect(result).toEqual(expected);
})

test("RxTask limited tasklet", (done) => {
  const sub = new Subject<string>();
  let i = 0;
  const createWorkerFn = () => {
    return async () => {
      console.log("==== task start", i);
      return await firstValueFrom(sub.pipe(
        tap(() => { console.log("task end", i) }),
        map(_ => i++),
      ));
    }
  }
  const { task, source$ } = RxTask.Create(totalTasksLength, concurrency);
  const ob = source$.pipe(
    task.createLimitedTasklet(createWorkerFn()),
    toArray(),
  );
  task.collect(ob).then((result) => {
    expect(result).toEqual(expected);
    done();
  });
  (async function () {
    expect(task.getRunningTasklets().size).toBe(2);
    sub.next("done");

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(task.getRunningTasklets().size).toBe(1);
    sub.next("done");
  })()
});

test("RxTask tasklet throws", (done) => {
  const sub = new Subject<string>();
  let i = 0;
  const createWorkerFn = () => {
    return async () => {
      return await firstValueFrom(sub.pipe(
        map(_ => {
          if (i === 1) {
            throw new Error("abort");
          }
          return i++;
        }),
      ));
    }
  }
  const { task, source$, abortCtr } = RxTask.Create(totalTasksLength, concurrency);
  const ob = source$.pipe(
    task.createLimitedTasklet(createWorkerFn()),
    toArray(),
  );
  task.collect(ob).catch((err) => {
    expect(err.message).toBe("abort");
    expect(abortCtr.signal.aborted).toBe(true);
    done();
  });
  expect(task.getRunningTasklets().size).toBe(2);
  sub.next("done");
})
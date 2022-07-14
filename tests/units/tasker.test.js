import { Tasker } from "../../src/tasker.v2.js";

async function sleep(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

/*
test("tasker should works", async () => {
  const max_concurrency = 1;
  const tasker = new Tasker(max_concurrency);

  let done;
  const donePromise = new Promise(resolve => {
    done = resolve;
  })
  const finished = [];

  const task1 = async () => {
    await sleep(100);
    finished.push(1);
  };
  const task2 = async () => {
    await sleep(1);
    finished.push(2);
    expect(finished).toStrictEqual([1, 2]);
    done();
  };
  let index = 0;
  tasker.AddTask(index++, task1);
  expect(tasker.waiting_size).toEqual(0);
  tasker.AddTask(index++, task2);
  expect(tasker.waiting_size).toEqual(1);

  await donePromise;
});

test("tasker should continue with errors", async () => {
  const max_concurrency = 1;
  const tasker = new Tasker(max_concurrency);

  let done;
  const donePromise = new Promise(resolve => {
    done = resolve;
  })
  const finished = [];

  const task1 = async () => {
    await sleep(100);
    throw new Error("task 1 error")
  };
  const task2 = async () => {
    await sleep(1);
    finished.push(2);
    expect(finished).toStrictEqual([2]);
    done();
  };
  let index = 0;
  tasker.AddTask(index++, task1);
  expect(tasker.waiting_size).toEqual(0);
  tasker.AddTask(index++, task2);
  expect(tasker.waiting_size).toEqual(1);

  await donePromise;
});
*/

test("tasker should works if all tasks succeed", (done) => {
  (async function () {
    const max_concurrency = 1;
    const finished = [];
    const tasks = [
      async () => {
        await sleep(100);
        finished.push(1);
      },
      async () => {
        await sleep(1);
        finished.push(2);
      },
    ];
    const tasker = new Tasker(tasks, max_concurrency);
    await tasker.done;
    expect(finished).toStrictEqual([1, 2]);
    done();
  })();
});

test("tasker should throw if any task throws", (done) => {
  (async function () {
    const max_concurrency = 1;
    const finished = [];
    const tasks = [
      async () => {
        await sleep(100);
        finished.push(1);
      },
      async () => {
        await sleep(100);
        throw new Error("task 1 error")
      },
      async () => {
        await sleep(100);
        finished.push(3);
      },
    ];
    const tasker = new Tasker(tasks, max_concurrency);
    expect(tasker.waiting_size).toEqual(tasks.length - 1);
    expect(tasker.done).rejects.toThrow('task 1 error').then(() => {
      expect(finished).toStrictEqual([1]);
      expect(tasker.waiting_size).toEqual(1);
      done();
    })
  })();
});
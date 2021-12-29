[![Tests](https://github.com/zckevin/weibo-jpeg-channel/actions/workflows/testing.yml/badge.svg)](https://github.com/zckevin/weibo-jpeg-channel/actions/workflows/testing.yml)


## Inspect decoder perf in chrome

1. write test in //tests/e2e/
2. run `npm run e2e` to start chrome and karma server
3. open performance tab in Devtools and start recording
4. run `npx karma run -- --grep KEYWORD` to run the specific test


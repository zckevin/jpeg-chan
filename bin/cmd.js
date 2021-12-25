import * as fs from "fs"
import { Upload } from '../src/sinks/weibo.js';
import { Command } from 'commander';
const program = new Command();

program
  .option('-d, --debug', 'output extra debugging')
  .option('-p, --pizza-type <type>', 'flavour of pizza');

program.parse(process.argv);

async function run() {
  const url = await Upload(fs.readFileSync("/tmp/test.jpg"), false);
  console.log(url);
}
run();
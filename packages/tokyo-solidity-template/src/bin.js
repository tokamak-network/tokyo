#!/usr/bin/env node
import program from "commander";

import template, { defaultInputPath, defaultOutputPath } from "./index";

program
  .option("-i, --input [json path]", `input json path. default ${ defaultInputPath }`)
  .option("-o, --output [output dir path]", `output directory path. default ${ defaultOutputPath }`)
  .parse(process.argv);

async function main() {
  const {
    input = defaultInputPath,
    output = defaultOutputPath,
  } = program;

  const options = { input, output };

  return template(options, () => {
    console.log(`truffle project is generated at ${ output }`);
  });
}

main()
  .catch(console.error);

import path from "path";
import fs from "fs";
import Generator from "./lib/Generator";

export const defaultInputPath = "./input.json";
export const defaultOutputPath = "./out";

/**
 * @notice generate tokyo truffle project
 * @param options Object should contain input path for input json and output path for truffle project
 * @param done Function callback called after templated generated
 */
export default function (options, done) {
  const {
    input = defaultInputPath,
    output = defaultOutputPath,
  } = options;

  const inputPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
  const outputPath = path.isAbsolute(output) ? output : path.resolve(process.cwd(), output);

  const inputObj = JSON.parse(fs.readFileSync(inputPath));

  const g = new Generator(inputObj, outputPath);

  g.write()
    .then(done)
    // catch may not be needed
    .catch((err) => {
      throw err;
    });
}

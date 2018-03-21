import path from "path";
import rimraf from "rimraf";
import schema from "tokyo-schema";
import Generator from "../src/lib/Generator";

const verbose = process.env.VERBOSE || false;

const should = require("chai")
  .use(require("chai-as-promised"))
  .should();

const remove = (...args) => !verbose && rimraf.sync(...args);

describe("Generator", () => {
  it("should generate Sample Project", async () => {
    const outputPath = path.resolve(__dirname, "../test_1_out");
    const g = new Generator(require("tokyo-test-data/sample1.json"), outputPath);

    await g.write();
    remove(outputPath);
  });

  it("should generate RBG", async () => {
    const outputPath = path.resolve(__dirname, "../test_rbg_out");
    const g = new Generator(require("tokyo-test-data/rbg.json"), outputPath);

    await g.write();
    remove(outputPath);
  });
});

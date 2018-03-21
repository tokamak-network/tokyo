import fs from "fs";
import { resolve, join } from "path";
import mkdirp from "mkdirp";
import { ncp } from "ncp";

import Logger from "./Logger";
import Builder from "./Builder";

const logger = new Logger(true);

const defaultTargetPath = resolve(__dirname, "../../out");
const defaultTemplPath = resolve(__dirname, "../../templates");
const defaultStaticPath = resolve(__dirname, "../../static");
const defaultBaseContractPath = resolve(__dirname, "../../node_modules/tokyo-reusable-crowdsale/contracts");
const defaultBaseTestHelperPath = resolve(__dirname, "../../node_modules/tokyo-reusable-crowdsale/test/helpers");

/**
 * @title Generator
 * @notice Generator make directories for output, build template.
 */
export default class Generator extends Builder {
  constructor(
    input,
    targetPath = defaultTargetPath,
    tmplPath = defaultTemplPath,
    staticPath = defaultStaticPath,
    baseContractPath = defaultBaseContractPath,
    baseTestHelperPath = defaultBaseTestHelperPath,
  ) {
    super(input); // validate in Builder's constructor

    this.path = {
      tmpl: tmplPath, // `/templates`
      static: staticPath, // `/static`
      target: {
        root: targetPath, // `/out`
        contracts: resolve(targetPath, "./contracts"), // `/out/contracts`
        migrations: resolve(targetPath, "./migrations"), // `/out/migrations`
        test: resolve(targetPath, "./test"), // `/out/test`
      },
      base: {
        contracts: baseContractPath, // `/tokyo-reusable-crowdsale/contracts`
        test: baseTestHelperPath, // `/tokyo-reusable-crowdsale/test`
      },
    };
  }

  async write() {
    logger.log("generator writting...");

    this._makeDirectories();
    await this._copyStatic();
    await this._copyBaseContracts();

    // DEBUG: super.build() isn't supported by babel
    await this.build(this.path); // Copy templates with user input
  }

  _makeDirectories() {
    logger.log("making directories...");

    mkdirp(this.path.target.contracts);
    mkdirp(this.path.target.migrations);
    mkdirp(this.path.target.test);
  }

  _copyStatic() {
    logger.log("copying truffle static files...");
    const staticFiles = fs.readdirSync(this.staticPath());

    staticFiles.forEach((file) => {
      this.fs.copy(
        this.staticPath(file),
        this.targetPath(file),
      );
    });
  }

  _copyBaseContracts() {
    const sourcePath = this.path.base.contracts;
    const targetPath = resolve(this.path.target.contracts, "./base");

    logger.log("copying base contracts...");
    logger.log("from", sourcePath);
    logger.log("to", targetPath);

    return ncp(sourcePath, targetPath);
  }

  targetPath(...args) {
    return join(this.path.target.root, ...args);
  }

  tmplPath(...args) {
    return join(this.path.tmpl, ...args);
  }

  staticPath(...args) {
    return join(this.path.static, ...args);
  }
}

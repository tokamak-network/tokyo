import schema from "tokyo-schema";
import memFs from "mem-fs";
import editor from "mem-fs-editor";

import * as templateHelper from "./templateHelper";
import Parser from "./Parser";

/**
 * @title Builder
 * @notice Builder read and write template with the input.
 */
export default class Builder {
  constructor(inputObj) {
    const { value, error } = schema.validate(inputObj);
    if (error) throw error;

    this.rawInput = inputObj;
    this.input = value;
    this.parser = new Parser(value);

    this.store = memFs.create();
    this.fs = editor.create(this.store);
  }

  /**
   * @notice builds templates and generates truffle project.
   */
  build() {
    const parseResult = this.parser.parse();

    return new Promise((done) => {
      this.writeContracts(parseResult);
      this.writeMigrations(parseResult);
      // this.writeTest(parseResult);

      this.fs.commit([], done);
    });
  }

  getDataObj(parseResult) {
    return {
      input: this.input, rawInput: this.rawInput, helper: templateHelper, parseResult,
    };
  }

  writeContracts(parseResult) {
    const dirName = "contracts";

    // crowdsale
    this.fs.copyTpl(
      this.tmplPath(dirName, "Crowdsale.sol.ejs"),
      this.targetPath(dirName, `${ templateHelper.getCrowdsaleName(parseResult) }.sol`),
      this.getDataObj(parseResult),
    );

    // token
    this.fs.copyTpl(
      this.tmplPath(dirName, "Token.sol.ejs"),
      this.targetPath(dirName, `${ templateHelper.getTokenName(parseResult) }.sol`),
      this.getDataObj(parseResult),
    );
  }

  writeMigrations(parseResult) {
    const dirName = "migrations";

    this.fs.copyTpl(
      this.tmplPath(dirName, "2_deploy_contracts.js.ejs"),
      this.targetPath(dirName, "2_deploy_contracts.js"),
      this.getDataObj(parseResult),
    );
  }

  writeTest(parseResult) {
    const dirName = "test";

    // crowdsale
    this.fs.copyTpl(
      this.tmplPath(dirName, "Crowdsale.js.ejs"),
      this.targetPath(dirName, "Crowdsale.js"),
      this.getDataObj(parseResult),
    );

    // token
    this.fs.copyTpl(
      this.tmplPath(dirName, "Token.js.ejs"),
      this.targetPath(dirName, "Token.js"),
      this.getDataObj(parseResult),
    );
  }
}

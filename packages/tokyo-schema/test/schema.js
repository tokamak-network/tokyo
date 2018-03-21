import BigNumber from "bignumber.js";

import Joi from "../src/lib/Joi";
import schema from "../src/index";

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const sampleData1 = require("tokyo-test-data/sample1.json");
const sampleData2 = require("tokyo-test-data/rbg.json");

describe("Input Schema", () => {
  it("sample data 1", () => {
    const { error } = Joi.validate(sampleData1, schema);

    should.not.exist(error);
  });

  it("sample data 2", () => {
    const { error } = Joi.validate(sampleData2, schema);

    should.not.exist(error);
  });
});

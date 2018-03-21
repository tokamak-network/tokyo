import moment from "moment";
import BigNumber from "bignumber.js";

import Joi from "../src/lib/Joi";
import DATE_FORMAT from "../src/constants";

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

describe("Basic Type", () => {
  describe("Account", () => {
    it("#validAddress", () => {
      const validAddresses = [
        "0x557678cf28594495ef4b08a6447726f931f8d787",
        "0x557678cf28594495ef4b08a6447726f931f8d784",
      ];

      const invalidAddresses = [
        "0x557678cf28594495ef4b08a6447726f931f8d7871",
        "0x557678cf28594495ef4b08a6447726f931f8d78",
        "some string",
        "123123",
      ];

      validAddresses.forEach((address) => {
        const { error } = Joi.Account().validAddress().validate(address);

        should.not.exist(error);
      });

      invalidAddresses.forEach((address) => {
        const { error } = Joi.Account().validAddress().validate(address);

        should.exist(error);
      });
    });
  });

  describe("Time", () => {
    it("#utc", () => {
      const validDateStrings = [
        "2017/10/20 04:30:20",
        "2017/01/20 04:30:20",
        "2017/01/02 04:30:20",
      ];

      validDateStrings.forEach((dateString) => {
        const unixTimeStamp = moment.utc(dateString, DATE_FORMAT).unix();

        const { value, error } = Joi.Time().utc().validate(dateString);

        should.not.exist(error);

        value.should.be.equal(unixTimeStamp);
      });
    });
  });

  describe("BigNumber", () => {
    describe("#uint", () => {
      const bnSchema = Joi.BigNumber().uint();

      it("should reject positive integer as Number", () => {
        const bnString = 100;

        const { error } = Joi.validate(bnString, bnSchema);

        should.exist(error);
      });

      it("should accept positive integer as string", () => {
        const bnString = "100";

        const { value, error } = Joi.validate(bnString, bnSchema);

        should.not.exist(error);
        value.should.be.bignumber.equal(new BigNumber(bnString));
        (value instanceof BigNumber).should.be.equal(true);
      });
    });

    describe("#min", () => {
      it("should accept when value is same with the minimum", () => {
        const bnSchema = Joi.BigNumber().min("10");
        const bnString = "10";

        const { error } = Joi.validate(bnString, bnSchema);

        should.not.exist(error);
      });

      it("should accept when value is over the minimum", () => {
        const bnSchema = Joi.BigNumber().min("10");
        const bnString = "11";

        const { error } = Joi.validate(bnString, bnSchema);

        should.not.exist(error);
      });

      it("should reject when value is under the minimum", () => {
        const bnSchema = Joi.BigNumber().min("11");
        const bnString = "10";

        const { error } = Joi.validate(bnString, bnSchema);

        should.exist(error);
      });
    });

    describe("#max", () => {
      it("should accept when value is same with the maximum", () => {
        const bnSchema = Joi.BigNumber().max("10");
        const bnString = "10";

        const { error } = Joi.validate(bnString, bnSchema);

        should.not.exist(error);
      });

      it("should accept when value is over the maximum", () => {
        const bnSchema = Joi.BigNumber().max("11");
        const bnString = "10";

        const { error } = Joi.validate(bnString, bnSchema);

        should.not.exist(error);
      });

      it("should reject when value is under the maximum", () => {
        const bnSchema = Joi.BigNumber().max("10");
        const bnString = "11";

        const { error } = Joi.validate(bnString, bnSchema);

        should.exist(error);
      });
    });
  });
});

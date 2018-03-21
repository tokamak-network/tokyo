import EthUtils from "ethereumjs-util";

export default joi => ({
  base: joi.string(),
  name: "Account",
  language: {
    validAddress: "needs to be valid ethereum account",
    withChecksum: "needs to be ethereum account with checksum",
  },
  rules: [
    {
      name: "validAddress",
      validate(params, value, state, options) {
        if (!EthUtils.isValidAddress(value)) {
          return this.createError("Account.validAddress", { v: value }, state, options);
        }

        return value;
      },
    },
    {
      name: "withChecksum",
      validate(params, value, state, options) {
        if (!EthUtils.isValidChecksumAddress) {
          return this.createError("Account.withChecksum", { v: value }, state, options);
        }

        return value;
      },
    },

  ],
});

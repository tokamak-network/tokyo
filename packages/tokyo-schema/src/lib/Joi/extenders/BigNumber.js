import BigNumber from "bignumber.js";

export default joi => ({
  base: joi.string(),
  name: "BigNumber",
  language: {
    uint: "needs to be BigNumber integer convertible with bignumber.js",
    min: "needs to be over {{q}}",
    max: "needs to be under {{q}}",
  },
  pre(value, state, options) {
    return new BigNumber(value);
  },
  rules: [
    {
      name: "uint",
      validate(params, value, state, options) {
        if (!value.isInteger()) {
          return this.createError("BigNumber.uint", { v: value }, state, options);
        }

        return value;
      },
    },
    {
      name: "min",
      params: {
        q: joi.string(),
      },
      validate(params, value, state, options) {
        const q = new BigNumber(params.q);

        if (value.lt(q)) {
          return this.createError("BigNumber.min", { v: value, q }, state, options);
        }

        return value;
      },
    },
    {
      name: "max",
      params: {
        q: joi.string(),
      },
      validate(params, value, state, options) {
        const q = new BigNumber(params.q);

        if (value.gt(q)) {
          return this.createError("BigNumber.min", { v: value, q }, state, options);
        }

        return value;
      },
    },
  ],
});

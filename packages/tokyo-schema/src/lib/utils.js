import BigNumber from "bignumber.js";
import last from "lodash/last";

// eslint-disable-next-line import/prefer-default-export, complexity
export function testValue(data) {
  if (!data.sale.coeff.div(10).isInteger()) {
    return new Error("Coeff must be base 10 number");
  }

  const sum = arr => arr.reduce((a, b) => a.add(b), new BigNumber(0));

  const tokenRatios = data.sale.distribution.token.map(t => t.token_ratio);
  const etherRatios = data.sale.distribution.ether.map(t => t.ether_ratio);

  if (!data.sale.coeff.eq(sum(tokenRatios))) {
    return new Error("Sum of token ratios must be equal to coeff");
  }

  if (!data.sale.coeff.eq(sum(etherRatios))) {
    return new Error("Sum of ether ratios must be equal to coeff");
  }

  for (const beneficiary of data.locker.beneficiaries) {
    if (!data.sale.coeff.eq(last(beneficiary.release).release_ratio)) {
      return new Error("Beneficiary's last release ratio must be equal to coeff");
    }
  }

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < data.sale.stages.length - 1; i++) {
    const preEndTime = data.sale.stages[ i ].end_time;
    const postStartTime = data.sale.stages[ i + 1 ].start_time;

    if (preEndTime >= postStartTime) {
      return new Error("Stage should not be overlapped.");
    }
  }

  return null;
}

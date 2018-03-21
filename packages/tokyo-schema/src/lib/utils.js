import sumBy from "lodash/sumBy";
import last from "lodash/last";

export function testValue(data) {
  if (!data.sale.coeff.div(10).isInteger()) {
    return new Error("Coeff must be base 10 number");
  }

  if (sumBy(data.sale.distribution.token, "token_ratio") !== data.sale.coeff) {
    return new Error("Sum of token ratios must be equal to coeff");
  }

  if (sumBy(data.sale.distribution.ether, "ether_ratio") !== data.sale.coeff) {
    return new Error("Sum of ether ratios must be equal to coeff");
  }

  data.locker.beneficiaries.forEach((beneficiaries) => {
    if (last(beneficiaries.release).release_ratio !== data.sale.coeff) {
      return new Error("Beneficiary's last release ratio must be equal to coeff");
    }
  });

  return null;
}

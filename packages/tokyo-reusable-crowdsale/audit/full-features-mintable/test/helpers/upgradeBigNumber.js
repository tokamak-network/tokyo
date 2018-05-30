const BigNumber = web3.BigNumber;

/**
 * @dev return r - e < |this.value - n| < r + e
 * @param {BigNumber} n target number to compare
 * @param {BigNumber} r range
 * @param {BigNumber} e epsilon
 * @return {Boolean} result of calculation
 */
BigNumber.prototype.diff = function diff(n, r, e = new BigNumber(1e-10)) {
  n = new BigNumber(n);
  r = new BigNumber(r);
  e = new BigNumber(e);

  const _s = r.sub(e);
  const _n = this.sub(n).abs();
  const _e = r.add(e);

  return _n.gt(_s) && _n.lt(_e);
};

/**
 * @dev return |this.value - n| < e
 * @param {BigNumber} n target number to compare
 * @param {BigNumber} e epsilon
 * @return {Boolean} true if two values are with in error
 */
BigNumber.prototype.same = function same(n, e = new BigNumber(1e-10)) {
  n = new BigNumber(n);
  e = new BigNumber(e);

  return this.sub(n).abs().lt(e);
};

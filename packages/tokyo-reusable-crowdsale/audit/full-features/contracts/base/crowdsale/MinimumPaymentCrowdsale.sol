pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";

/**
 * @title MinimumPaymentCrowdsale
 * @notice To buy tokens, purchaser should make payment with minimun amount of ether.
 */
contract MinimumPaymentCrowdsale is BaseCrowdsale {
  uint256 public minPayment;

  function MinimumPaymentCrowdsale(uint256 _minPayment) public {
    require(_minPayment != 0);
    minPayment = _minPayment;
  }

  /**
   * @return true if msg.value is less than `minPayment`.
   */
  function validPurchase() internal view returns (bool) {
    bool overMinPayment = msg.value >= minPayment;
    return overMinPayment && super.validPurchase();
  }
}

pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";

/**
 * @title PurchaseLimitedCrowdsale
 * @notice Limit a single purchaser from funding too many ether.
 */
contract PurchaseLimitedCrowdsale is BaseCrowdsale {
  mapping (address => uint256) public purchaseFunded;
  uint256 public purchaseLimit;

  function PurchaseLimitedCrowdsale(uint256 _purchaseLimit) public {
    require(_purchaseLimit != 0);
    purchaseLimit = _purchaseLimit;
  }

  function calculateToFund(address _beneficiary, uint256 _weiAmount) internal view returns (uint256) {
    uint256 toFund;
    toFund = super.calculateToFund(_beneficiary, _weiAmount);

    if (purchaseFunded[_beneficiary].add(toFund) > purchaseLimit)
      toFund = purchaseLimit.sub(purchaseFunded[_beneficiary]);

    return toFund;
  }

  function buyTokensPreHook(address _beneficiary, uint256 _toFund) internal {
    purchaseFunded[_beneficiary] = purchaseFunded[_beneficiary].add(_toFund);
  }
}

pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";

/**
 * @title BlockIntervalCrowdsale
 * @notice BlockIntervalCrowdsale limit purchaser to take participate too frequently.
 */
contract BlockIntervalCrowdsale is BaseCrowdsale {
  uint256 public blockInterval;
  mapping (address => uint256) public recentBlock;

  function BlockIntervalCrowdsale(uint256 _blockInterval) public {
    require(_blockInterval != 0);
    blockInterval = _blockInterval;
  }

  /**
   * @return true if the block number is over the block internal.
   */
  function validPurchase() internal view returns (bool) {
    bool withinBlock = recentBlock[msg.sender].add(blockInterval) < block.number;
    return withinBlock && super.validPurchase();
  }

  /**
   * @notice save the block number
   */
  function buyTokensPostHook(address _beneficiary) internal {
    recentBlock[msg.sender] = block.number;
  }
}

pragma solidity ^0.4.24;

import "./BaseCrowdsale.sol";

/**
 * @title FinishMintingCrowdsale
 * @notice FinishMintingCrowdsale prevents token generation after sale ended.
 */
contract FinishMintingCrowdsale is BaseCrowdsale {
  function afterGeneratorHook() internal {
    require(finishMinting());
    super.afterGeneratorHook();
  }
}

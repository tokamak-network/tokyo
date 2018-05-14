pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";

/**
 * @title FinishMintingCrowdsale
 * @notice FinishMintingCrowdsale prevent token generation after sale ended.
 */
contract FinishMintingCrowdsale is BaseCrowdsale {
  function finalizationSuccessHook() internal {
    require(finishMinting());
    super.finalizationSuccessHook();
  }
}

pragma solidity ^0.4.24;

import "minimetoken/contracts/MiniMeToken.sol";

/**
 * @title NoMintMiniMeToken
 * @dev Token that can be irreversibly burned (destroyed).
 */
contract NoMintMiniMeToken is MiniMeToken {
  event MintFinished();
  bool public mintingFinished = false;

  modifier canMint() {
    require(!mintingFinished);
    _;
  }

  function generateTokens(address _owner, uint _amount) public onlyController canMint returns (bool) {
    return super.generateTokens(_owner, _amount);
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() public onlyController canMint returns (bool) {
    mintingFinished = true;
    emit MintFinished();
    return true;
  }
}

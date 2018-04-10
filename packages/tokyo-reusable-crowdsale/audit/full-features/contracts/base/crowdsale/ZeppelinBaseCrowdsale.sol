pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";
import "../zeppelin/token/MintableToken.sol";

contract ZeppelinBaseCrowdsale is BaseCrowdsale {

  MintableToken token;

  function ZeppelinBaseCrowdsale (address _token) {
    require(_token != address(0));
    token = MintableToken(_token);
  }


  function generateTokens(address _beneficiary, uint256 _tokens) internal {
    token.mint(_beneficiary, _tokens);
  }

  function transferTokenOwnership(address _to) internal {
    token.transferOwnership(_to);
  }

  function getTotalSupply() internal returns (uint256) {
    return token.totalSupply();
  }

}

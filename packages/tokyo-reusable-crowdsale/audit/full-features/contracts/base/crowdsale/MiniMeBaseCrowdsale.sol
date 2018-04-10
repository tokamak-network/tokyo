pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";
import "../minime/MiniMeToken.sol";

contract MiniMeBaseCrowdsale is BaseCrowdsale {

  MiniMeToken token;

  function MiniMeBaseCrowdsale (address _token) {
    require(_token != address(0));
    token = MiniMeToken(_token);
  }


  function generateTokens(address _beneficiary, uint256 _tokens) internal {
    token.generateTokens(_beneficiary, _tokens);
  }

  function transferTokenOwnership(address _to) internal {
    token.changeController(_to);
  }

  function getTotalSupply() internal returns (uint256) {
    return token.totalSupply();
  }
}

pragma solidity ^0.4.24;

import "./BaseCrowdsale.sol";
import "minimetoken/contracts/MiniMeToken.sol";
import "../token/NoMintMiniMeToken.sol";

contract MiniMeBaseCrowdsale is BaseCrowdsale {

  MiniMeToken token;

  function MiniMeBaseCrowdsale (address _token) public {
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

  function finishMinting() internal returns (bool) {
    require(NoMintMiniMeToken(token).finishMinting());
    return true;
  }

  function getTokenAddress() internal returns (address) {
    return address(token);
  }
}

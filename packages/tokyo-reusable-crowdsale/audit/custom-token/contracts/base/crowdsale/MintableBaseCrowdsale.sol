pragma solidity ^0.4.24;

import "./BaseCrowdsale.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";

contract MintableBaseCrowdsale is BaseCrowdsale {

  MintableToken token;

  function MintableBaseCrowdsale (address _token) public {
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

  function finishMinting() internal returns (bool) {
    require(token.finishMinting());
    return true;
  }

  function getTokenAddress() internal returns (address) {
    return address(token);
  }
}

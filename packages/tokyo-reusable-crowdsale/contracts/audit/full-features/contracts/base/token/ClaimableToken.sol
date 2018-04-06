pragma solidity ^0.4.18;

import "../zeppelin/token/StandardToken.sol";
import "../zeppelin/ownership/Ownable.sol";

contract ClaimableToken is StandardToken, Ownable {
  event ClaimedTokens(address indexed _token, address indexed _owner, uint _amount);

  function claimTokens(address _token) public onlyOwner {
      if (_token == 0x0) {
          owner.transfer(this.balance);
          return;
      }

      StandardToken token = StandardToken(_token);
      uint balance = token.balanceOf(this);
      token.transfer(owner, balance);
      ClaimedTokens(_token, owner, balance);
  }
}

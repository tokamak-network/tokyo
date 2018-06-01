pragma solidity ^0.4.24;

import "../token/PausableToken.sol";


// mock class using PausableToken
contract PausableTokenMock is PausableToken {

  function PausableTokenMock(address initialAccount, uint initialBalance) public {
    balances[initialAccount] = initialBalance;
  }

}

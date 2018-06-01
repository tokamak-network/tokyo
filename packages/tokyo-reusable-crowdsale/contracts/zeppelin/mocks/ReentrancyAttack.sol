pragma solidity ^0.4.24;


contract ReentrancyAttack {

  function callSender(bytes4 data) public {
    require(msg.sender.call(data));
  }

}

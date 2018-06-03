pragma solidity ^0.4.24;

import "minimetoken/contracts/MiniMeToken.sol";
import "../token/BurnableMiniMeToken.sol";

contract BurnableMiniMeTokenMock is MiniMeToken, BurnableMiniMeToken {
  function BurnableMiniMeTokenMock() MiniMeToken(
      0x0,
      0x0,
      0,
      "BurnableMiniMeTokenMock",
      18,
      "BMM",
      true)
      public
  {}
}

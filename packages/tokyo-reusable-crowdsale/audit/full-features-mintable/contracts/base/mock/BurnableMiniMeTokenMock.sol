pragma solidity ^0.4.18;

import "../minime/MiniMeToken.sol";
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

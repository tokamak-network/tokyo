pragma solidity^0.4.18;

import "../minime/MiniMeToken.sol";

contract SampleProjectToken is MiniMeToken {
    function SampleProjectToken(address _tokenFactory)
      MiniMeToken(
        _tokenFactory,
        0x0,                     // no parent token
        0,                       // no snapshot block number from parent
        "Sample String",         // Token name
        18,                      // Decimals
        "SS",                    // Symbol
        true                     // Enable transfers
      ) {}
}

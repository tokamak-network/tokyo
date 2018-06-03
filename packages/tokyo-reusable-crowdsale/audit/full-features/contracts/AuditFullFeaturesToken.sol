pragma solidity^0.4.18;

import "minimetoken/contracts/MiniMeToken.sol";
import "./base/token/BurnableMiniMeToken.sol";
import "./base/token/NoMintMiniMeToken.sol";
  
contract AuditFullFeaturesToken is MiniMeToken, BurnableMiniMeToken, NoMintMiniMeToken { 
    function AuditFullFeaturesToken(address _tokenFactory)
      MiniMeToken(
        _tokenFactory,
        0x0,                     // no parent token
        0,                       // no snapshot block number from parent
        "For Audit",  // Token name
        18,                      // Decimals
        "FA",                   // Symbol
        true                     // Enable transfers
      ) {} 
}









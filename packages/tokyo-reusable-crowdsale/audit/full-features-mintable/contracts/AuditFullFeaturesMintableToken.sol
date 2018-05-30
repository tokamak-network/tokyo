pragma solidity^0.4.18;

import "./base/zeppelin/token/MintableToken.sol";
import "./base/zeppelin/token/BurnableToken.sol";
import "./base/zeppelin/token/PausableToken.sol";
  
contract AuditFullFeaturesMintableToken is MintableToken, BurnableToken, PausableToken { 
  string public name = "For Audit Mintable";
  string public symbol = "FAM";
  uint8 public decimals = 18; 
}









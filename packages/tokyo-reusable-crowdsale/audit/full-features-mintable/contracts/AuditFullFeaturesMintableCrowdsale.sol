pragma solidity^0.4.18;

import "./base/crowdsale/BaseCrowdsale.sol";
import "./base/crowdsale/MintableBaseCrowdsale.sol";
import "./base/crowdsale/BonusCrowdsale.sol";
import "./base/crowdsale/PurchaseLimitedCrowdsale.sol";
import "./base/crowdsale/MinimumPaymentCrowdsale.sol";
import "./base/crowdsale/BlockIntervalCrowdsale.sol";
import "./base/crowdsale/KYCCrowdsale.sol";
import "./base/crowdsale/StagedCrowdsale.sol";
import "./base/crowdsale/FinishMintingCrowdsale.sol";

contract AuditFullFeaturesMintableCrowdsale is BaseCrowdsale, MintableBaseCrowdsale, BonusCrowdsale, PurchaseLimitedCrowdsale, MinimumPaymentCrowdsale, BlockIntervalCrowdsale, KYCCrowdsale, StagedCrowdsale, FinishMintingCrowdsale {

  bool public initialized;

  // constructor parameters are left padded bytes32.

  function AuditFullFeaturesMintableCrowdsale(bytes32[7] args) 
    BaseCrowdsale(
      parseUint(args[0]))
    MintableBaseCrowdsale(
      parseAddress(args[1]))
    BonusCrowdsale()
    PurchaseLimitedCrowdsale(
      parseUint(args[2]))
    MinimumPaymentCrowdsale(
      parseUint(args[3]))
    BlockIntervalCrowdsale(
      parseUint(args[4]))
    KYCCrowdsale(
      parseAddress(args[5]))
    StagedCrowdsale(
      parseUint(args[6]))
    FinishMintingCrowdsale() public {}
  

  function parseBool(bytes32 b) internal pure returns (bool) {
    return b == 0x1;
  }

  function parseUint(bytes32 b) internal pure returns (uint) {
    return uint(b);
  }

  function parseAddress(bytes32 b) internal pure returns (address) {
    return address(b & 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff);
  }

  function init(bytes32[] args) public {
    uint _startTime = uint(args[0]);
    uint _endTime = uint(args[1]);
    uint _rate = uint(args[2]);
    uint _cap = uint(args[3]);
    uint _goal = uint(args[4]);
    uint _crowdsaleRatio = uint(args[5]);
    address _vault = address(args[6]);
    address _locker = address(args[7]);
    address _nextTokenOwner = address(args[8]);

    require(_endTime > _startTime);
    require(_rate > 0);
    require(_cap > 0);
    require(_goal > 0);
    require(_cap > _goal);
    require(_crowdsaleRatio > 0);
    require(_vault != address(0));
    require(_locker != address(0));
    require(_nextTokenOwner != address(0));
    
    startTime = _startTime;
    endTime = _endTime;
    rate = _rate;
    cap = _cap;
    goal = _goal;
    crowdsaleRatio = _crowdsaleRatio;
    vault = MultiHolderVault(_vault);
    locker = Locker(_locker);
    nextTokenOwner = _nextTokenOwner;
  }
}





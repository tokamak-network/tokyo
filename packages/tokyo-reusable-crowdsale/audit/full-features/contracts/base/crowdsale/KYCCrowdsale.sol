pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";
import "../kyc/KYC.sol";

/**
 * @title KYCCrowdsale
 * @notice KYCCrowdsale checks kyc information and
 */
contract KYCCrowdsale is BaseCrowdsale {

  KYC kyc;

  function KYCCrowdsale (address _kyc) public {
    require(_kyc != 0x0);
    kyc = KYC(_kyc);
  }

  function registered(address _addr) public view returns (bool) {
    return kyc.registeredAddress(_addr);
  }
}

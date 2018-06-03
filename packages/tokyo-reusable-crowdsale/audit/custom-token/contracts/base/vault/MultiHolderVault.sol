pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/utils/RefundVault.sol";
import "../common/HolderBase.sol";

/**
 * @title MultiHolderVault
 * @dev This contract distribute ether to multiple address.
 */
contract MultiHolderVault is HolderBase, RefundVault {
  using SafeMath for uint256;

  function MultiHolderVault(address _wallet, uint256 _ratioCoeff)
    public
    HolderBase(_ratioCoeff)
    RefundVault(_wallet)
  {}

  function close() public onlyOwner {
    require(state == State.Active);
    require(initialized);

    super.distribute(); // distribute ether to holders
    super.close(); // transfer remaining ether to wallet
  }
}

pragma solidity ^0.4.18;

import '../zeppelin/math/SafeMath.sol';
import '../zeppelin/crowdsale/RefundVault.sol';
import '../common/HolderBase.sol';

/**
 * @title MultiHolderVault
 * @dev This contract distribute ether to multiple address.
 */
contract MultiHolderVault is HolderBase, RefundVault {
  using SafeMath for uint256;

  function MultiHolderVault(address _wallet, uint256 _ratioCoeff)
    public
    HolderBase(_ratioCoeff)
    RefundVault(_wallet) {}

  function close() public onlyOwner {
    require(state == State.Active);
    require(wallet != 0x0 || initialized);

    super.distribute(); // distribute ether to holders
    super.close(); // transfer remaining ether to wallet
  }
}

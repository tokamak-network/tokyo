pragma solidity ^0.4.18;

import '../zeppelin/math/SafeMath.sol';
import '../zeppelin/ownership/Ownable.sol';
import '../zeppelin/token/ERC20/ERC20.sol';

/**
 * @title HolderBase
 * @notice HolderBase handles data & funcitons for token or ether holders.
 * HolderBase contract can distribute only one of ether or token.
 */
contract HolderBase is Ownable {
  using SafeMath for uint256;

  uint256 public ratioCoeff;
  bool public distributed;
  bool public initialized;

  struct Holder {
    address addr;
    uint96 ratio;
  }

  Holder[] public holders;

  function HolderBase(uint256 _ratioCoeff) public {
    require(_ratioCoeff != 0);
    ratioCoeff = _ratioCoeff;
  }

  function getHolderCount() public view returns (uint256) {
    return holders.length;
  }

  function initHolders(address[] _addrs, uint96[] _ratios) public onlyOwner {
    require(!initialized);
    require(holders.length == 0);
    require(_addrs.length == _ratios.length);
    uint256 accRatio;

    for(uint8 i = 0; i < _addrs.length; i++) {
      holders.push(Holder(_addrs[i], _ratios[i]));
      accRatio = accRatio.add(uint96(_ratios[i]));
    }

    require(accRatio <= ratioCoeff);

    initialized = true;
  }

  /**
   * @dev Distribute ether to `holder`s according to ratio.
   * Remaining ether is transfered to `wallet` from the close
   * function of RefundVault contract.
   */
  function distribute() internal {
    require(!distributed);
    require(this.balance > 0);
    uint256 balance = this.balance;
    distributed = true;

    for (uint8 i = 0; i < holders.length; i++) {
      uint256 holderAmount = balance.mul(uint256(holders[i].ratio)).div(ratioCoeff);

      holders[i].addr.transfer(holderAmount);
    }
  }

  /**
   * @dev Distribute ERC20 token to `holder`s according to ratio.
   */
  function distribute(ERC20 token) internal {
    require(!distributed);
    require(this.balance > 0);
    uint256 balance = token.balanceOf(this);
    distributed = true;

    for (uint8 i = 0; i < holders.length; i++) {
      uint256 holderAmount = balance.mul(uint256(holders[i].ratio)).div(ratioCoeff);

      token.transfer(holders[i].addr, holderAmount);
    }
  }
}

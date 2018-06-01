pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";

/**
 * @title HolderBase
 * @notice HolderBase handles data & funcitons for token or ether holders.
 * HolderBase contract can distribute only one of ether or token.
 */
contract HolderBase is Ownable {
  using SafeMath for uint256;

  uint8 public constant MAX_HOLDERS = 64; // TODO: tokyo-input should verify # of holders
  uint256 public coeff;
  bool public distributed;
  bool public initialized;

  struct Holder {
    address addr;
    uint96 ratio;
  }

  Holder[] public holders;

  event Distributed();

  function HolderBase(uint256 _coeff) public {
    require(_coeff != 0);
    coeff = _coeff;
  }

  function getHolderCount() public view returns (uint256) {
    return holders.length;
  }

  function initHolders(address[] _addrs, uint96[] _ratios) public onlyOwner {
    require(!initialized);
    require(holders.length == 0);
    require(_addrs.length != 0);
    require(_addrs.length <= MAX_HOLDERS);
    require(_addrs.length == _ratios.length);

    uint256 accRatio;

    for(uint8 i = 0; i < _addrs.length; i++) {
      if (_addrs[i] != address(0)) {
        // address will be 0x00 in case of "crowdsale".
        holders.push(Holder(_addrs[i], _ratios[i]));
      }

      accRatio = accRatio.add(uint256(_ratios[i]));
    }

    require(accRatio <= coeff);

    initialized = true;
  }

  /**
   * @dev Distribute ether to `holder`s according to ratio.
   * Remaining ether is transfered to `wallet` from the close
   * function of RefundVault contract.
   */
  function distribute() internal {
    require(!distributed, "Already distributed");
    uint256 balance = this.balance;

    require(balance > 0, "No ether to distribute");
    distributed = true;

    for (uint8 i = 0; i < holders.length; i++) {
      uint256 holderAmount = balance.mul(uint256(holders[i].ratio)).div(coeff);

      holders[i].addr.transfer(holderAmount);
    }

    emit Distributed(); // A single log to reduce gas
  }

  /**
   * @dev Distribute ERC20 token to `holder`s according to ratio.
   */
  function distributeToken(ERC20Basic _token, uint256 _targetTotalSupply) internal {
    require(!distributed, "Already distributed");
    distributed = true;

    for (uint8 i = 0; i < holders.length; i++) {
      uint256 holderAmount = _targetTotalSupply.mul(uint256(holders[i].ratio)).div(coeff);
      deliverTokens(_token, holders[i].addr, holderAmount);
    }

    emit Distributed(); // A single log to reduce gas
  }

  // Override to distribute tokens
  function deliverTokens(ERC20Basic _token, address _beneficiary, uint256 _tokens) internal {}
}

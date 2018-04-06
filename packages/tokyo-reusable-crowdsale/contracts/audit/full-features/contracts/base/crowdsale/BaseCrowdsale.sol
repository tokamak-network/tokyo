pragma solidity ^0.4.18;

import "../zeppelin/math/SafeMath.sol";
import "../vault/MultiHolderVault.sol";
import "../locker/Locker.sol";

contract BaseCrowdsale is Ownable {
  using SafeMath for uint256;

  Locker public locker;     // token locker

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // how many token units a buyer gets per wei
  uint256 public rate;

  // base to calculate percentage
  uint256 public coeff;

  // amount of raised money in wei
  uint256 public weiRaised;

  // ratio of tokens for locker and crowdsale
  uint256 public lockerRatio;
  uint256 public crowdsaleRatio;

  bool public isFinalized = false;

  uint256 public cap;

  // minimum amount of funds to be raised in weis
  uint256 public goal;

  // refund vault used to hold funds while crowdsale is running
  MultiHolderVault public vault;

  address public nextTokenOwner;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);
  event Finalized();

  // fallback function can be used to buy tokens
  function () external payable {
    buyTokens(msg.sender);
  }

  function buyTokens(address beneficiary) public payable {
    require(beneficiary != address(0));
    require(validPurchase());

    uint256 weiAmount = msg.value;

    uint256 toFund = calculateToFund(beneficiary, weiAmount);

    uint256 toReturn = weiAmount.sub(toFund);
    require(toFund > 0);

    buyTokensPreHook(beneficiary, toFund);

    // calculate token amount to be created
    uint256 tokens = getTokenAmount(toFund);

    // update state
    weiRaised = weiRaised.add(toFund);

    if (toReturn > 0) {
      msg.sender.transfer(toReturn);
    }

    generateTokens(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, toFund, tokens);
    forwardFunds(toFund);

    buyTokensPostHook(beneficiary);
  }

  /**
   * @dev Must be called after crowdsale ends, to do some extra finalization
   * work. Calls the contract's finalization function.
   */
  function finalize() onlyOwner public {
    require(!isFinalized);
    require(hasEnded());

    finalization();
    Finalized();

    isFinalized = true;
  }


  // vault finalization task, called when owner calls finalize()
  function finalization() internal {
    if (goalReached()) {
      finalizationSuccessHook();
    } else {
      finalizationFailHook();
    }
  }

  // if crowdsale is unsuccessful, investors can claim refunds here
  function claimRefund() public {
    require(isFinalized);
    require(!goalReached());

    vault.refund(msg.sender);
  }

  function goalReached() public view returns (bool) {
    return weiRaised >= goal;
  }

  /// @return true if crowdsale event has ended
  function hasEnded() public view returns (bool) {
    bool capReached = weiRaised >= cap;
    return capReached || now > endTime;
  }

  // Override this method to have a way to add business logic to your crowdsale when buying
  function getTokenAmount(uint256 weiAmount) internal view returns(uint256) {
    return weiAmount.mul(rate);
  }

  /**
   * @notice forwardd ether to vault
   */
  function forwardFunds(uint256 toFund) internal {
    vault.deposit.value(toFund)(msg.sender);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal view returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool nonZeroPurchase = msg.value != 0;
    return withinPeriod && nonZeroPurchase;
  }

  /**
   * @notice calculate fund wrt sale cap. Override this function to control ether cap.
   */
  function calculateToFund(address _beneficiary, uint256 _weiAmount) internal view returns (uint256) {
    uint256 toFund;
    uint256 postWeiRaised = weiRaised.add(_weiAmount);

    if (postWeiRaised > cap) {
      toFund = cap.sub(weiRaised);
    } else {
      toFund = _weiAmount;
    }
    return toFund;
  }

  /**
   * @notice interface to initialize crowdsale parameters.
   * init should be implemented by Crowdsale Generator.
   */
   function init(bytes32[] args) public;

  /**
   * @notice pre hook for buyTokens function
   */
  function buyTokensPreHook(address _beneficiary, uint256 _toFund) internal {}

  /**
   * @notice post hook for buyTokens function
   */
  function buyTokensPostHook(address _beneficiary) internal {}

  function finalizationFailHook() internal {
    vault.enableRefunds();
  }

  function finalizationSuccessHook() internal {
    uint targetTotalSupply = getTotalSupply().mul(coeff).div(crowdsaleRatio);

    generateTokens(targetTotalSupply); // for token holders without time lock
    generateTokens(address(locker), targetTotalSupply, lockerRatio); // tokens for locker

    locker.activate();
    vault.close();

    transferTokenOwnership(nextTokenOwner);
  }

  /**
   * @notice interfaces to generate token for both MiniMe & Zeppelin(Mintable) token.
   */
  function generateTokens(address _beneficiary, uint256 _tokens) internal;
  function transferTokenOwnership(address _to) internal;
  function getTotalSupply() internal returns (uint256);

  /**
   * @notice interface to generate tokens for token holders without time lock.
   * generateTokens called when finalization is success, and should be implemented
   * by Crowdsale Generator.
   */
  function generateTokens(uint256 _targetTotalSupply) internal;

  /**
   * @notice helper function to generate tokens with ratio
   */
  function generateTokens(address _beneficiary, uint256 _targetTotalSupply, uint256 _ratio) {
    uint256 tokens = _targetTotalSupply.mul(_ratio).div(coeff);
    generateTokens(_beneficiary, tokens);
  }
}

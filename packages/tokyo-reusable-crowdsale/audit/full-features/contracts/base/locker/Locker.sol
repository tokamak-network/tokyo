pragma solidity ^0.4.18;

import '../zeppelin/math/SafeMath.sol';
import '../zeppelin/ownership/Ownable.sol';
import '../zeppelin/token/ERC20/SafeERC20.sol';

/**
 * @title Locker
 * @notice Locker holds tokens and releases them at a certain time.
 */
contract Locker is Ownable {
  using SafeMath for uint;
  using SafeERC20 for ERC20Basic;

  /**
   * It is init state only when adding release info is possible.
   * beneficiary only can release tokens when Locker is active.
   * After all tokens are released, locker is drawn.
   */
  enum State { Init, Ready, Active, Drawn }

  struct Beneficiary {
    uint ratio;             // ratio based on Locker's initial balance.
    uint withdrawAmount;    // accumulated tokens beneficiary released
    bool releaseAllTokens;
  }

  /**
   * @notice Release has info to release tokens.
   * If lock type is straight, only two release infos is required.
   *
   *     |
   * 100 |                _______________
   *     |              _/
   *  50 |            _/
   *     |         . |
   *     |       .   |
   *     |     .     |
   *     +===+=======+----*----------> time
   *     Locker  First    Last
   *  Activated  Release  Release
   *
   *
   * If lock type is variable, the release graph will be
   *
   *     |
   * 100 |                                 _________
   *     |                                |
   *  70 |                      __________|
   *     |                     |
   *  30 |            _________|
   *     |           |
   *     +===+=======+---------+----------*------> time
   *     Locker   First        Second     Last
   *  Activated   Release      Release    Release
   *
   *
   *
   * For the first straight release graph, parameters would be
   *   coeff: 100
   *   releaseTimes: [
   *     first release time,
   *     second release time
   *   ]
   *   releaseRatios: [
   *     50,
   *     100,
   *   ]
   *
   * For the second variable release graph, parameters would be
   *   coeff: 100
   *   releaseTimes: [
   *     first release time,
   *     second release time,
   *     last release time
   *   ]
   *   releaseRatios: [
   *     30,
   *     70,
   *     100,
   *   ]
   *
   */
  struct Release {
    bool isStraight;        // lock type : straight or variable
    uint[] releaseTimes;    //
    uint[] releaseRatios;   //
  }

  uint public activeTime;

  // ERC20 basic token contract being held
  ERC20Basic public token;

  uint public coeff;
  uint public initialBalance;
  uint public withdrawAmount; // total amount of tokens released

  mapping (address => Beneficiary) beneficiaries;
  mapping (address => Release) releases;  // beneficiary's lock
  mapping (address => bool) locked; // whether beneficiary's lock is instantiated

  uint public numBeneficiaries;
  uint public numLocks;

  State public state;

  modifier onlyState(State v) {
    require(state == v);
    _;
  }

  modifier onlyBeneficiary(address _addr) {
    require(beneficiaries[_addr].ratio > 0);
    _;
  }

  function Locker(address _token, uint _coeff, address[] _beneficiaries, uint[] _ratios) public {
    require(_token != address(0));
    require(_beneficiaries.length == _ratios.length);

    token = ERC20Basic(_token);
    coeff = _coeff;
    numBeneficiaries = _beneficiaries.length;

    uint accRatio;

    for(uint i = 0; i < numBeneficiaries; i++) {
      require(_ratios[i] > 0);
      beneficiaries[_beneficiaries[i]].ratio = _ratios[i];

      accRatio = accRatio.add(_ratios[i]);
    }

    require(coeff == accRatio);
  }

  /**
   * @notice beneficiary can release their tokens after activated
   */
  function activate() external onlyOwner onlyState(State.Ready) {
    require(numLocks == numBeneficiaries); // double check : assert all releases are recorded

    initialBalance = token.balanceOf(this);
    require(initialBalance > 0);

    activeTime = now;

    // set locker as active state
    state = State.Active;
  }

  function getTotalLockedAmounts(address _beneficiary)
    public
    view
    onlyBeneficiary(_beneficiary)
    returns (uint)
  {
    return getPartialAmount(beneficiaries[_beneficiary].ratio, coeff, initialBalance);
  }

  function getReleaseTimes(address _beneficiary)
    public
    view
    onlyBeneficiary(_beneficiary)
    returns (uint[])
  {
    return releases[_beneficiary].releaseTimes;
  }

  function getReleaseRatios(address _beneficiary)
    public
    view
    onlyBeneficiary(_beneficiary)
    returns (uint[])
  {
    return releases[_beneficiary].releaseRatios;
  }

  /**
   * @notice add new release record for beneficiary
   */
  function lock(address _beneficiary, bool _isStraight, uint[] _releaseTimes, uint[] _releaseRatios)
    external
    onlyOwner
    onlyState(State.Init)
    onlyBeneficiary(_beneficiary)
  {
    require(!locked[_beneficiary]);
    require(_releaseRatios.length == _releaseTimes.length);

    uint i;
    uint len = _releaseRatios.length;

    // finally should release all tokens
    require(_releaseRatios[len - 1] == coeff);

    // check two array are ascending sorted
    for(i = 0; i < len - 1; i++) {
      require(_releaseTimes[i] < _releaseTimes[i + 1]);
      require(_releaseRatios[i] < _releaseRatios[i + 1]);
    }

    // 2 release times for straight locking type
    if (_isStraight) {
      require(len == 2);
    }

    numLocks = numLocks.add(1);

    // create Release for the beneficiary
    releases[_beneficiary].isStraight = _isStraight;

    // copy array of uint
    releases[_beneficiary].releaseTimes = new uint[](len);
    releases[_beneficiary].releaseRatios = new uint[](len);

    for (i = 0; i < len; i++) {
      releases[_beneficiary].releaseTimes[i] = _releaseTimes[i];
      releases[_beneficiary].releaseRatios[i] = _releaseRatios[i];
    }

    // lock beneficiary
    locked[_beneficiary] = true;

    //  if all beneficiaries locked, change Locker state to change
    if (numLocks == numBeneficiaries) {
      state = State.Ready;
    }
  }

  /**
   * @notice transfer releasable tokens for beneficiary wrt the release graph
   */
  function release() external onlyState(State.Active) onlyBeneficiary(msg.sender) {
    require(!beneficiaries[msg.sender].releaseAllTokens);

    uint releasableAmount = getReleasableAmount(msg.sender);
    beneficiaries[msg.sender].withdrawAmount = beneficiaries[msg.sender].withdrawAmount.add(releasableAmount);

    beneficiaries[msg.sender].releaseAllTokens = beneficiaries[msg.sender].withdrawAmount == getPartialAmount(
        beneficiaries[msg.sender].ratio,
        coeff,
        initialBalance);

    withdrawAmount = withdrawAmount.add(releasableAmount);

    if (withdrawAmount == initialBalance) {
      state = State.Drawn;
    }

    token.transfer(msg.sender, releasableAmount);
  }

  function getReleasableAmount(address _beneficiary) internal view returns (uint) {
    if (releases[_beneficiary].isStraight) {
      return getStraightReleasableAmount(_beneficiary);
    } else {
      return getVariableReleasableAmount(_beneficiary);
    }
  }

  /**
   * @notice return releaseable amount for beneficiary in case of straight type of release
   */
  function getStraightReleasableAmount(address _beneficiary) internal view returns (uint releasableAmount) {
    Beneficiary memory _b = beneficiaries[_beneficiary];
    Release memory _r = releases[_beneficiary];

    // total amount of tokens beneficiary can release
    uint totalReleasableAmount = getTotalLockedAmounts(_beneficiary);

    uint firstTime = _r.releaseTimes[0];
    uint lastTime = _r.releaseTimes[1];

    require(now >= firstTime); // pass if can release

    if(now >= lastTime) { // inclusive to reduce calculation
      releasableAmount = totalReleasableAmount;
    } else {
      // releasable amount at first time
      uint firstAmount = getPartialAmount(
        _r.releaseRatios[0],
        coeff,
        totalReleasableAmount);

      // partial amount without first amount
      releasableAmount = getPartialAmount(
        now.sub(firstTime),
        lastTime.sub(firstTime),
        totalReleasableAmount.sub(firstAmount));
      releasableAmount = releasableAmount.add(firstAmount);
    }

    // subtract already withdrawn amounts
    releasableAmount = releasableAmount.sub(_b.withdrawAmount);
  }

  /**
   * @notice return releaseable amount for beneficiary in case of variable type of release
   */
  function getVariableReleasableAmount(address _beneficiary) internal view returns (uint releasableAmount) {
    Beneficiary memory _b = beneficiaries[_beneficiary];
    Release memory _r = releases[_beneficiary];

    // total amount of tokens beneficiary will receive
    uint totalReleasableAmount = getTotalLockedAmounts(_beneficiary);

    uint releaseRatio;

    // reverse order for short curcit
    for(uint i = _r.releaseTimes.length - 1; i >= 0; i--) {
      if (now >= _r.releaseTimes[i]) {
        releaseRatio = _r.releaseRatios[i];
        break;
      }
    }

    require(releaseRatio > 0);

    releasableAmount = getPartialAmount(
      releaseRatio,
      coeff,
      totalReleasableAmount);
    releasableAmount = releasableAmount.sub(_b.withdrawAmount);
  }

  /// https://github.com/0xProject/0x.js/blob/05aae368132a81ddb9fd6a04ac5b0ff1cbb24691/packages/contracts/src/current/protocol/Exchange/Exchange.sol#L497
  /// @notice Calculates partial value given a numerator and denominator.
  /// @param numerator Numerator.
  /// @param denominator Denominator.
  /// @param target Value to calculate partial of.
  /// @return Partial value of target.
  function getPartialAmount(uint numerator, uint denominator, uint target) public pure returns (uint) {
    return numerator.mul(target).div(denominator);
  }
}

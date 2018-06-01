pragma solidity ^0.4.24;

import "./KYCCrowdsale.sol";

/**
 * @title StagedCrowdsale
 * @notice StagedCrowdsale seperates sale period with start time & end time.
 * For each period, seperate max cap and kyc could be setup.
 * Both startTime and endTime are inclusive.
 */
contract StagedCrowdsale is KYCCrowdsale {

  uint8 public numPeriods;

  Stage[] public stages;

  struct Stage {
    uint128 cap;
    uint128 maxPurchaseLimit;
    uint128 minPurchaseLimit;
    uint128 weiRaised; // stage's weiAmount raised
    uint32 startTime;
    uint32 endTime;
    bool kyc;
  }

  function StagedCrowdsale(uint _numPeriods) public {
    numPeriods = uint8(_numPeriods);
    require(numPeriods > 0);
  }

  function initStages(
    uint32[] _startTimes,
    uint32[] _endTimes,
    uint128[] _capRatios,
    uint128[] _maxPurchaseLimits,
    uint128[] _minPurchaseLimits,
    bool[] _kycs)
    public
  {
    uint len = numPeriods;

    require(stages.length == 0);
    // solium-disable
    require(len == _startTimes.length &&
      len == _endTimes.length &&
      len == _capRatios.length &&
      len == _maxPurchaseLimits.length &&
      len == _minPurchaseLimits.length &&
      len == _kycs.length);
    // solium-enable

    for (uint i = 0; i < len; i++) {
      require(_endTimes[i] >= _startTimes[i]);

      uint stageCap;

      if (_capRatios[i] != 0) {
        stageCap = cap.mul(uint(_capRatios[i])).div(coeff);
      } else {
        stageCap = 0;
      }

      stages.push(Stage({
        startTime: _startTimes[i],
        endTime: _endTimes[i],
        cap: uint128(stageCap),
        maxPurchaseLimit: _maxPurchaseLimits[i],
        minPurchaseLimit: _minPurchaseLimits[i],
        kyc: _kycs[i],
        weiRaised: 0
      }));
    }

    require(validPeriods());
  }

  /**
   * @notice if period is on sale, return index of the period.
   */
  function getStageIndex() public view returns (uint8 currentStage, bool onSale) {
    onSale = true;
    Stage memory p;

    for (currentStage = 0; currentStage < stages.length; currentStage++) {
      p = stages[currentStage];
      if (p.startTime <= now && now <= p.endTime) {
        return;
      }
    }

    onSale = false;
  }

  /**
   * @notice return if all period is finished.
   */
  function saleFinished() public view returns (bool) {
    require(stages.length == numPeriods);
    return stages[stages.length - 1].endTime < now;
  }


  function validPeriods() internal view returns (bool) {
    if (stages.length != numPeriods) {
      return false;
    }

    // check stages are overlapped.
    for (uint8 i = 0; i < stages.length - 1; i++) {
      if (stages[i].endTime >= stages[i + 1].startTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * @notice Override BaseCrowdsale.calculateToFund function.
   * Check if period is on sale and apply cap if needed.
   */
  function calculateToFund(address _beneficiary, uint256 _weiAmount) internal view returns (uint256) {
    uint256 weiAmount = _weiAmount;
    uint8 currentStage;
    bool onSale;

    (currentStage, onSale) = getStageIndex();

    require(onSale);

    Stage memory p = stages[currentStage];

    // Check kyc if needed for this period
    if (p.kyc) {
      require(super.registered(_beneficiary));
    }

    // check min purchase limit of the period
    require(weiAmount >= uint(p.minPurchaseLimit));

    // reduce up to max purchase limit of the period
    if (p.maxPurchaseLimit != 0 && weiAmount > uint(p.maxPurchaseLimit)) {
      weiAmount = uint(p.maxPurchaseLimit);
    }

    // pre-calculate `toFund` with the period's cap
    if (p.cap > 0) {
      uint256 postWeiRaised = uint256(p.weiRaised).add(weiAmount);

      if (postWeiRaised > p.cap) {
        weiAmount = uint256(p.cap).sub(p.weiRaised);
      }
    }

    // get `toFund` with the cap of the sale
    return super.calculateToFund(_beneficiary, weiAmount);
  }

  function buyTokensPreHook(address _beneficiary, uint256 _toFund) internal {
    uint8 currentStage;
    bool onSale;

    (currentStage, onSale) = getStageIndex();

    require(onSale);

    Stage storage p = stages[currentStage];

    p.weiRaised = uint128(_toFund.add(uint256(p.weiRaised)));
    super.buyTokensPreHook(_beneficiary, _toFund);
  }
}

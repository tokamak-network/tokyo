// https://github.com/bitclave/crowdsale/blob/master/contracts/BonusCrowdsale.sol

pragma solidity ^0.4.18;

import "./BaseCrowdsale.sol";
import "../zeppelin/ownership/Ownable.sol";



/**
* @dev Parent crowdsale contract with support for time-based and amount based bonuses
* Based on references from OpenZeppelin: https://github.com/OpenZeppelin/zeppelin-solidity
*
*/
contract BonusCrowdsale is BaseCrowdsale {

    // Constants
    // The following will be populated by main crowdsale contract
    uint32[] public BONUS_TIMES;
    uint32[] public BONUS_TIMES_VALUES;
    uint128[] public BONUS_AMOUNTS;
    uint32[] public BONUS_AMOUNTS_VALUES;

    /**
    * @dev Retrieve length of bonuses by time array
    * @return Bonuses by time array length
    */
    function bonusesForTimesCount() public view returns(uint) {
        return BONUS_TIMES.length;
    }

    /**
    * @dev Sets bonuses for time
    */
    function setBonusesForTimes(uint32[] times, uint32[] values) public onlyOwner {
        require(times.length == values.length);
        for (uint i = 0; i + 1 < times.length; i++) {
            require(times[i] < times[i+1]);
        }

        BONUS_TIMES = times;
        BONUS_TIMES_VALUES = values;
    }

    /**
    * @dev Retrieve length of bonuses by amounts array
    * @return Bonuses by amounts array length
    */
    function bonusesForAmountsCount() public view returns(uint) {
        return BONUS_AMOUNTS.length;
    }

    /**
    * @dev Sets bonuses for USD amounts
    */
    function setBonusesForAmounts(uint128[] amounts, uint32[] values) public onlyOwner {
        require(amounts.length == values.length);
        for (uint i = 0; i + 1 < amounts.length; i++) {
            require(amounts[i] > amounts[i+1]);
        }

        BONUS_AMOUNTS = amounts;
        BONUS_AMOUNTS_VALUES = values;
    }

    /**
    * @notice Overrided getTokenAmount function of parent Crowdsale contract
      to calculate the token with time and amount bonus.
    * @param weiAmount walelt of investor to receive tokens
    */
    function getTokenAmount(uint256 weiAmount) internal view returns(uint256) {
        // Compute time and amount bonus
        uint256 bonus = computeBonus(weiAmount);
        uint256 rateWithBonus = rate.mul(coeff.add(bonus)).div(coeff);
        return weiAmount.mul(rateWithBonus);
    }

    /**
    * @dev Computes overall bonus based on time of contribution and amount of contribution.
    * The total bonus is the sum of bonus by time and bonus by amount
    * @return bonus percentage scaled by 10
    */
    function computeBonus(uint256 weiAmount) public view returns(uint256) {
        return computeAmountBonus(weiAmount).add(computeTimeBonus());
    }

    /**
    * @dev Computes bonus based on time of contribution relative to the beginning of crowdsale
    * @return bonus percentage scaled by 10
    */
    function computeTimeBonus() public view returns(uint256) {
        require(now >= startTime);

        for (uint i = 0; i < BONUS_TIMES.length; i++) {
            if (now <= BONUS_TIMES[i]) {
                return BONUS_TIMES_VALUES[i];
            }
        }

        return 0;
    }

    /**
    * @dev Computes bonus based on amount of contribution
    * @return bonus percentage scaled by 10
    */
    function computeAmountBonus(uint256 weiAmount) public view returns(uint256) {
        for (uint i = 0; i < BONUS_AMOUNTS.length; i++) {
            if (weiAmount >= BONUS_AMOUNTS[i]) {
                return BONUS_AMOUNTS_VALUES[i];
            }
        }

        return 0;
    }

}

pragma solidity ^0.4.24;

import "minimetoken/contracts/MiniMeToken.sol";

/**
 * @title Burnable MiniMe Token
 * @dev Token that can be irreversibly burned (destroyed).
 */
contract BurnableMiniMeToken is MiniMeToken {
  event Burn(address indexed burner, uint256 value);

  /**
   * @dev Burns a specific amount of tokens.
   * @param _amount The amount of token to be burned.
   */
  function burn(uint256 _amount) public returns (bool) {
    uint curTotalSupply = totalSupply();
    require(curTotalSupply >= _amount);
    uint previousBalanceFrom = balanceOf(msg.sender);
    require(previousBalanceFrom >= _amount);
    updateValueAtNow(totalSupplyHistory, curTotalSupply - _amount);
    updateValueAtNow(balances[msg.sender], previousBalanceFrom - _amount);
    Transfer(msg.sender, 0, _amount);
    return true;
  }
}

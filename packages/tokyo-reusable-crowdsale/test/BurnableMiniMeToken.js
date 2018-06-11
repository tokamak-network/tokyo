import moment from "moment";

import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import increaseTime, { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import EVMThrow from "./helpers/EVMThrow";
import { capture, restore, Snapshot } from "./helpers/snapshot";
import timer from "./helpers/timer";
import sendTransaction from "./helpers/sendTransaction";
import "./helpers/upgradeBigNumber";

const BigNumber = web3.BigNumber;
const eth = web3.eth;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const BurnableMiniMeToken = artifacts.require("./BurnableMiniMeTokenMock.sol");

contract("BurnableMiniMeToken", async ([ owner, ...accounts ]) => {
  // contract instances
  let token;
  const tokenHolders = accounts.slice(1, 11);
  const tokenAmount = ether(10);

  before(async () => {
    token = await BurnableMiniMeToken.new();

    await Promise.all(tokenHolders.map(holder =>
      token.generateTokens(holder, tokenAmount)
        .should.be.fulfilled));
  });

  it("only token holder can burn tokens", async () => {
    const holder = tokenHolders[ 0 ];
    const other = owner;

    const burnAmount = ether(1);
    const beforeBalance = await token.balanceOf(holder);
    const expectedBalance = beforeBalance.sub(burnAmount);

    await token.burn(burnAmount, { from: other })
      .should.be.rejectedWith(EVMThrow);

    await token.burn(burnAmount, { from: holder })
      .should.be.fulfilled;

    const afterBalance = await token.balanceOf(holder);

    afterBalance.should.be.bignumber.equal(expectedBalance);
  });
});

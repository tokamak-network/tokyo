import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import increaseTime, { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import EVMThrow from "./helpers/EVMThrow";
import { capture, restore, Snapshot } from "./helpers/snapshot";
import timer from "./helpers/timer";
import sendTransaction from "./helpers/sendTransaction";
import "./helpers/upgradeBigNumber";

const moment = require("moment");

const BigNumber = web3.BigNumber;
const eth = web3.eth;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const BlockIntervalCrowdsale = artifacts.require("./BlockIntervalCrowdsale.sol");
const MintableToken = artifacts.require("./MintableToken.sol");

contract("BlockIntervalCrowdsale", async ([ owner, investor1, investor2, wallet, ...accounts ]) => {
  let token, crowdsale;

  const startTime = new BigNumber(moment().add(1, "minutes").unix());
  const endTime = new BigNumber(moment().add(10, "minutes").unix());
  const rate = 10;
  const blockInterval = 10;

  const snapshot = new Snapshot();

  const advanceManyBlock = async (n) => {
    for (const _ of Array(n)) {
      await advanceBlock();
    }
  };

  before(snapshot.captureContracts);
  after(snapshot.restoreContracts);

  before(async () => {
    crowdsale = await BlockIntervalCrowdsale.new(
      startTime,
      endTime,
      rate,
      wallet,
      blockInterval,
    );

    token = MintableToken.at(await crowdsale.token());
  });

  describe("#test1", async () => {
    it("move time just after crowdsale starts", async () => {
      const targetTime = startTime.add(duration.seconds(2));

      await increaseTimeTo(targetTime);
      await advanceManyBlock(blockInterval);
    });

    it("check time condition", async () => {
      const now = new BigNumber(latestTime().unix());

      (await crowdsale.startTime())
        .should.be.bignumber.lt(now);

      (await crowdsale.endTime())
        .should.be.bignumber.gt(now);
    });

    it("investor can buy tokens at first time", async () => {
      const investAmount = ether(10);
      const tokenAmount = investAmount.mul(rate);

      await crowdsale.buyTokens(investor1, {
        from: investor1,
        value: investAmount,
      }).should.be.fulfilled;

      (await token.balanceOf(investor1))
        .should.be.bignumber.equal(tokenAmount);
    });

    it("investor cannot buy tokens just after buying them", async () => {
      const investAmount = ether(10);
      const tokenAmount = investAmount.mul(rate);

      await crowdsale.buyTokens(investor1, {
        from: investor1,
        value: investAmount,
      }).should.be.rejectedWith(EVMThrow);

      (await token.balanceOf(investor1))
        .should.be.bignumber.equal(tokenAmount);
    });

    it("investor can buy tokens just after 10 blocks", async () => {
      await advanceManyBlock(blockInterval);

      const investAmount = ether(10);
      const tokenAmount = investAmount.mul(rate);

      const tokenBalance = await token.balanceOf(investor1);

      await crowdsale.buyTokens(investor1, {
        from: investor1,
        value: investAmount,
      }).should.be.fulfilled;

      (await token.balanceOf(investor1))
        .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
    });
  });
});

import moment from "moment";
import range from "lodash/range";

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

const Token = artifacts.require("./MintableToken.sol");
const Locker = artifacts.require("./Locker.sol");

contract("Locker", async ([ owner, ...accounts ]) => {
  // contract instances
  let token, locker;

  // parameteres
  const coeff = new BigNumber(100);
  const beneficiaries = accounts.slice(1, 5);
  const e = ether(2); // calculation error

  // [100, 200, 300, 400] for each beneficiaries
  const tokenAmounts = beneficiaries.map((_, i) => ether(100 * (i + 1)));
  const totalAmount = tokenAmounts.reduce((a, b) => a.add(b));
  const releaseRatios = tokenAmounts.map(amount => amount.mul(coeff).div(totalAmount));
  // [true, false, true, false]
  const isStraights = beneficiaries.map((_, i) => i % 2 === 0);

  const activeTime = moment().add(100, "minutes").unix();
  const releases = [
    [ // beneficiary 1
      {
        release_time: moment.unix(activeTime).add(100, "minutes").unix(),
        release_ratio: new BigNumber(50),
      },
      {
        release_time: moment.unix(activeTime).add(200, "minutes").unix(),
        release_ratio: new BigNumber(100),
      },
    ],
    [ // beneficiary 2
      {
        release_time: moment.unix(activeTime).add(100, "minutes").unix(),
        release_ratio: new BigNumber(50),
      },
      {
        release_time: moment.unix(activeTime).add(200, "minutes").unix(),
        release_ratio: new BigNumber(100),
      },
    ],
    [ // beneficiary 3
      {
        release_time: moment.unix(activeTime).add(100, "minutes").unix(),
        release_ratio: new BigNumber(20),
      },
      {
        release_time: moment.unix(activeTime).add(200, "minutes").unix(),
        release_ratio: new BigNumber(100),
      },
    ],
    [ // beneficiary 4
      {
        release_time: moment.unix(activeTime).add(100, "minutes").unix(),
        release_ratio: new BigNumber(30),
      },
      {
        release_time: moment.unix(activeTime).add(200, "minutes").unix(),
        release_ratio: new BigNumber(50),
      },
      {
        release_time: moment.unix(activeTime).add(300, "minutes").unix(),
        release_ratio: new BigNumber(100),
      },
    ],
  ];

  before(async () => {
    token = await Token.new();
    locker = await Locker.new(token.address, coeff, beneficiaries, releaseRatios);
  });

  it("setup contracts", async () => {
    await token.mint(locker.address, totalAmount)
      .should.be.fulfilled;
  });

  it("lock beneficiaries", async () => {
    await Promise.all(range(beneficiaries.length).map((_, i) => {
      const beneficiary = beneficiaries[ i ];
      const release = releases[ i ];
      const isStraight = isStraights[ i ];
      const times = release.map(r => r.release_time);
      const ratios = release.map(r => r.release_ratio).map(r => new BigNumber(r));

      return locker.lock(beneficiary, isStraight, times, ratios)
        .should.be.fulfilled;
    }));
  });

  it(`move time to activeTime ${ activeTime }`, async () => {
    await increaseTimeTo(activeTime).should.be.fulfilled;
  });

  it("activate locker", async () => {
    (await token.balanceOf(locker.address))
      .should.be.bignumber.equal(totalAmount);

    (await locker.state())
      .should.be.bignumber.equal(1); // ready

    (await locker.numBeneficiaries())
      .should.be.bignumber.equal(beneficiaries.length);

    await locker.activate().should.be.fulfilled;

    (await locker.state())
      .should.be.bignumber.equal(2); // active
  });

  it("check locking status", async () => {
    let i = 0;
    for (const _ of range(beneficiaries.length)) {
      const beneficiary = beneficiaries[ i ];
      const targetTokenAmounts = tokenAmounts[ i ];

      const release = releases[ i ];
      const times = release.map(r => new BigNumber(r.release_time));
      const ratios = release.map(r => r.release_ratio).map(r => new BigNumber(r));

      // locked amount
      (await locker.getTotalLockedAmounts(beneficiary))
        .should.be.bignumber.equal(targetTokenAmounts);

      // release times
      (await locker.getReleaseTimes(beneficiary))
        .should.be.deep.equal(times);

      // release ratios
      (await locker.getReleaseRatios(beneficiary))
        .should.be.deep.equal(ratios);
      i++;
    }
  });

  describe("after 100 minutes", async () => {
    const targetTime = moment.unix(activeTime).add(100, "minutes").unix();

    it(`move time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime).should.be.fulfilled;
    });

    it("beneficiary 1 should release about 50% of locked tokens", async () => {
      const index = 0;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.5);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 2 should release about 50% of locked tokens", async () => {
      const index = 1;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.5);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 3 should release about 20% of locked tokens", async () => {
      const index = 2;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.2);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 4 should release about 30% of locked tokens", async () => {
      const index = 3;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.3);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });
  });

  describe("after 150 minutes", async () => {
    const targetTime = moment.unix(activeTime).add(150, "minutes").unix();

    it(`move time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime).should.be.fulfilled;
    });

    it("beneficiary 1 should release about 25% of locked tokens", async () => {
      const index = 0;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.25);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 2 should release 0% of locked tokens", async () => {
      const index = 1;
      const beneficiary = beneficiaries[ index ];
      const releaseTokenAmount = ether(0);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 3 should release about 40% of locked tokens", async () => {
      const index = 2;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.4);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 4 should release 0% of locked tokens", async () => {
      const index = 3;
      const beneficiary = beneficiaries[ index ];
      const releaseTokenAmount = ether(0);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });
  });

  describe("after 200 minutes", async () => {
    const targetTime = moment.unix(activeTime).add(200, "minutes").unix();

    it(`move time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime).should.be.fulfilled;
    });

    it("beneficiary 1 should release about 25% of locked tokens", async () => {
      const index = 0;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.25);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 2 should release about 50% of locked tokens", async () => {
      const index = 1;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.5);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 3 should release about 40% of locked tokens", async () => {
      const index = 2;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.4);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("beneficiary 4 should release about 20% of locked tokens", async () => {
      const index = 3;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.2);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });
  });

  describe("after 300 minutes", async () => {
    const targetTime = moment.unix(activeTime).add(300, "minutes").unix();

    it(`move time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime).should.be.fulfilled;
    });

    it("beneficiary 4 should release about 50% of locked tokens", async () => {
      const index = 3;
      const beneficiary = beneficiaries[ index ];
      const beneficiaryTokenAmount = tokenAmounts[ index ];
      const releaseTokenAmount = beneficiaryTokenAmount.mul(0.5);

      const tokenBalance1 = await token.balanceOf(beneficiary);
      const targetTokenAmount = tokenBalance1.add(releaseTokenAmount);

      await locker.release({ from: beneficiary })
        .should.be.fulfilled;

      const tokenBalance2 = await token.balanceOf(beneficiary);

      tokenBalance2.same(targetTokenAmount, e).should.be.equal(true);
    });

    it("check beneficiaries' token balance", async () => {
      const tokenBalances = await Promise.all(beneficiaries
        .map(beneficiary => token.balanceOf(beneficiary)));

      tokenBalances.should.be.deep.equal(tokenAmounts);
    });
  });
});

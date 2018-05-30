import moment from "moment";
import get from "lodash/get";
import range from "lodash/range";
import schema from "tokyo-schema";

import ether from "./helpers/ether";
import { advanceBlock, advanceManyBlock } from "./helpers/advanceToBlock";
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

const KYC = artifacts.require("./KYC.sol");
const Vault = artifacts.require("./MultiHolderVault.sol");
const Locker = artifacts.require("./Locker.sol");
const Token = artifacts.require("./RankingBallGoldToken.sol");
const Crowdsale = artifacts.require("./RankingBallGoldCrowdsale.sol");

contract("RankingBallGoldCrowdsale", async ([ owner, other, investor1, investor2, investor3, ...accounts ]) => {
  // contract instances
  let kyc, vault, locker, token, crowdsale;

  // TX parameteres
  const gas = 2000000;

  // test parameteres
  const input = schema.validate(getInput()).value;
  const timeBonuses = input.sale.rate.bonus
    .time_bonuses.map(b => b.bonus_time_ratio); // 20%, 15%, 10%, 5%

  const baseRate = new BigNumber(input.sale.rate.base_rate);
  const coeff = new BigNumber(input.sale.coeff); // 10000

  const maxCap = new BigNumber(input.sale.max_cap); // 40000 ether
  const minCap = new BigNumber(input.sale.min_cap); // 5000 ether

  before(async () => {
    // load contracts
    kyc = await KYC.deployed();
    vault = await Vault.deployed();
    locker = await Locker.deployed();
    token = await Token.deployed();
    crowdsale = await Crowdsale.deployed();

    console.log(`
      kyc: ${ kyc.address }
      vault: ${ vault.address }
      locker: ${ locker.address }
      token: ${ token.address }
      crowdsale: ${ crowdsale.address }
    `);
  });

  // const snapshot = new Snapshot();
  // before(snapshot.captureContracts);
  // after(snapshot.restoreContracts);

  // helper functions
  const advanceBlocks = () => advanceManyBlock(input.sale.valid_purchase.block_interval);

  it("setup contracts", async () => {
    await kyc.register(investor1, { from: owner })
      .should.be.fulfilled;
    await kyc.register(investor2, { from: owner })
      .should.be.fulfilled;
    await kyc.register(investor3, { from: owner })
      .should.be.fulfilled;

    await advanceBlocks();
  });

  it("check parameters", async () => {
    (await crowdsale.nextTokenOwner())
      .should.be.equal(input.sale.new_token_owner);

    (await crowdsale.cap())
      .should.be.bignumber.equal(maxCap);

    maxCap.should.be.bignumber.equal(ether(40000));

    (await crowdsale.goal())
      .should.be.bignumber.equal(minCap);
  });

  describe("Before start time", async () => {
    it("reject buying tokens", async () => {
      const investAmount = ether(10);
      await sendTransaction({
        from: investor1, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });
  });

  describe("After start time (time bonus 20%)", async () => {
    const targetTime = input.sale.start_time;
    const scenarioIndex = 1;
    const timeBonusIndex = 0;
    const timeBonus = timeBonuses[ timeBonusIndex ];

    it(`increase time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime)
        .should.be.fulfilled;
    });

    it("reject buying tokens for unknown account", async () => {
      const investAmount = ether(10);

      await sendTransaction({
        from: other, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    it("accept buying tokens for valid account", async () => {
      const investor = investor1;
      const investAmount = ether(10); // 39990 ether remains
      const rate = calcRate(baseRate, timeBonus, coeff);

      const tokenAmount = investAmount.mul(rate);

      await advanceBlocks();
      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.fulfilled;

      (await token.balanceOf(investor))
        .should.be.bignumber.equal(tokenAmount);
    });

    it("reject buying tokens within a few blocks", async () => {
      const investor = investor1;
      const investAmount = ether(10);

      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    describe(`Over max cap scenario #${ scenarioIndex }`, async () => {
      const snapshot2 = new Snapshot();

      before(snapshot2.captureContracts);
      after(snapshot2.restoreContracts);

      it("accept buying tokens over max cap", async () => {
        const investor = investor1;
        const investAmount = maxCap;
        const fundedAmount = maxCap.sub(ether(10));

        const rate = calcRate(baseRate, timeBonus, coeff);

        const tokenAmount = fundedAmount.mul(rate);
        const tokenBalance = await token.balanceOf(investor);

        await advanceBlocks();
        await sendTransaction({
          from: investor, to: crowdsale.address, value: investAmount, gas,
        }).should.be.fulfilled;

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
      });

      it("should finalize crowdsale", async () => {
        await crowdsale.finalize()
          .should.be.fulfilled;
      });
    });
  });

  describe("After start time (time bonus 15%)", async () => {
    const scenarioIndex = 2;
    const timeBonusIndex = 1;
    const timeBonus = timeBonuses[ timeBonusIndex ];

    const targetTime = input.sale.rate.bonus
      .time_bonuses[ timeBonusIndex - 1 ].bonus_time_stage + 1;

    it(`increase time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime)
        .should.be.fulfilled;
    });

    it("reject buying tokens for unknown account", async () => {
      const investAmount = ether(10);

      await sendTransaction({
        from: other, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    it("accept buying tokens for valid account", async () => {
      const investor = investor3;
      const investAmount = ether(100); // 39890 ether remains
      const rate = calcRate(baseRate, timeBonus, coeff);

      const tokenAmount = investAmount.mul(rate);

      await advanceBlocks();
      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.fulfilled;

      (await token.balanceOf(investor))
        .should.be.bignumber.equal(tokenAmount);
    });

    it("reject buying tokens within a few blocks", async () => {
      const investor = investor3;
      const investAmount = ether(10);

      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    describe(`Over max cap scenario #${ scenarioIndex }`, async () => {
      const snapshot2 = new Snapshot();

      before(snapshot2.captureContracts);
      after(snapshot2.restoreContracts);

      it("accept buying tokens over stage max cap", async () => {
        const investor = investor2;
        const investAmount = maxCap;
        const fundedAmount = investAmount.sub(ether(110));

        const rate = calcRate(baseRate, timeBonus, coeff);

        const tokenAmount = fundedAmount.mul(rate);
        const tokenBalance = await token.balanceOf(investor);

        await advanceBlocks();
        await sendTransaction({
          from: investor, to: crowdsale.address, value: investAmount, gas,
        }).should.be.fulfilled;

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
      });

      it("should finalize crowdsale", async () => {
        await crowdsale.finalize()
          .should.be.fulfilled;
      });
    });
  });

  describe("After start time (time bonus 10%)", async () => {
    const scenarioIndex = 3;
    const timeBonusIndex = 2;
    const timeBonus = timeBonuses[ timeBonusIndex ];

    const targetTime = input.sale.rate.bonus
      .time_bonuses[ timeBonusIndex - 1 ].bonus_time_stage + 1;

    it(`increase time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime)
        .should.be.fulfilled;
    });

    it("reject buying tokens for unknown account", async () => {
      const investAmount = ether(10);

      await sendTransaction({
        from: other, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    it("accept buying tokens for valid account", async () => {
      const investor = investor3;
      const investAmount = ether(1000); // 38890 ether remains
      const rate = calcRate(baseRate, timeBonus, coeff);

      const tokenAmount = investAmount.mul(rate);
      const tokenBalance = await token.balanceOf(investor);

      await advanceBlocks();
      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.fulfilled;

      (await token.balanceOf(investor))
        .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
    });

    it("reject buying tokens within a few blocks", async () => {
      const investor = investor3;
      const investAmount = ether(1000);

      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    describe(`Over max cap scenario #${ scenarioIndex }`, async () => {
      const snapshot2 = new Snapshot();

      before(snapshot2.captureContracts);
      after(snapshot2.restoreContracts);

      it("accept buying tokens over stage max cap", async () => {
        const investor = investor2;
        const investAmount = maxCap;
        const fundedAmount = investAmount.sub(ether(1110));

        const rate = calcRate(baseRate, timeBonus, coeff);

        const tokenAmount = fundedAmount.mul(rate);
        const tokenBalance = await token.balanceOf(investor);

        await advanceBlocks();
        await sendTransaction({
          from: investor, to: crowdsale.address, value: investAmount, gas,
        }).should.be.fulfilled;

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
      });

      it("should finalize crowdsale", async () => {
        await crowdsale.finalize()
          .should.be.fulfilled;
      });
    });
  });

  describe("After start time (time bonus 5%)", async () => {
    const scenarioIndex = 4;
    const timeBonusIndex = 3;
    const timeBonus = timeBonuses[ timeBonusIndex ];

    const targetTime = input.sale.rate.bonus
      .time_bonuses[ timeBonusIndex - 1 ].bonus_time_stage + 1;

    it(`increase time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime)
        .should.be.fulfilled;
    });

    it("reject buying tokens for unknown account", async () => {
      const investAmount = ether(10);

      await sendTransaction({
        from: other, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    it("accept buying tokens for valid account", async () => {
      const investor = investor3;
      const investAmount = ether(10000); // 28890 ether remains
      const rate = calcRate(baseRate, timeBonus, coeff);

      const tokenAmount = investAmount.mul(rate);
      const tokenBalance = await token.balanceOf(investor);

      await advanceBlocks();
      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.fulfilled;

      (await token.balanceOf(investor))
        .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
    });

    it("reject buying tokens within a few blocks", async () => {
      const investor = investor3;
      const investAmount = ether(10);

      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    describe(`Over max cap scenario #${ scenarioIndex }`, async () => {
      const snapshot2 = new Snapshot();

      before(snapshot2.captureContracts);
      after(snapshot2.restoreContracts);

      it("accept buying tokens over stage max cap", async () => {
        const investor = investor2;
        const investAmount = maxCap;
        const fundedAmount = investAmount.sub(ether(11110));

        const rate = calcRate(baseRate, timeBonus, coeff);

        const tokenAmount = fundedAmount.mul(rate);
        const tokenBalance = await token.balanceOf(investor);

        await advanceBlocks();
        await sendTransaction({
          from: investor, to: crowdsale.address, value: investAmount, gas,
        }).should.be.fulfilled;

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
      });

      it("should finalize crowdsale", async () => {
        await crowdsale.finalize()
          .should.be.fulfilled;
      });
    });
  });

  describe("After start time (time bonus 0%)", async () => {
    const scenarioIndex = 5;
    const timeBonusIndex = 4;
    const timeBonus = new BigNumber(0);

    const targetTime = input.sale.rate.bonus
      .time_bonuses[ timeBonusIndex - 1 ].bonus_time_stage + 1;

    it(`increase time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime)
        .should.be.fulfilled;
    });

    it("reject buying tokens for unknown account", async () => {
      const investAmount = ether(10);

      await sendTransaction({
        from: other, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    it("accept buying tokens for valid account", async () => {
      const investor = investor3;
      const investAmount = ether(10000); // 18890 ether remains
      const rate = calcRate(baseRate, timeBonus, coeff);

      const tokenAmount = investAmount.mul(rate);
      const tokenBalance = await token.balanceOf(investor);

      await advanceBlocks();
      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.fulfilled;

      (await token.balanceOf(investor))
        .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
    });

    it("reject buying tokens within a few blocks", async () => {
      const investor = investor3;
      const investAmount = ether(10);

      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    describe(`Over max cap scenario #${ scenarioIndex }`, async () => {
      const snapshot2 = new Snapshot();

      before(snapshot2.captureContracts);
      after(snapshot2.restoreContracts);

      it("accept buying tokens over stage max cap", async () => {
        const investor = investor2;
        const investAmount = maxCap;
        const fundedAmount = investAmount.sub(ether(21110));

        const rate = calcRate(baseRate, timeBonus, coeff);

        const tokenAmount = fundedAmount.mul(rate);
        const tokenBalance = await token.balanceOf(investor);

        await advanceBlocks();
        await sendTransaction({
          from: investor, to: crowdsale.address, value: investAmount, gas,
        }).should.be.fulfilled;

        (await token.balanceOf(investor))
          .should.be.bignumber.equal(tokenBalance.add(tokenAmount));
      });

      it("should finalize crowdsale", async () => {
        await crowdsale.finalize()
          .should.be.fulfilled;
      });
    });
  });

  describe("After sale period ended", async () => {
    const targetTime = input.sale.end_time + 1;

    it(`increase time to ${ targetTime }`, async () => {
      await increaseTimeTo(targetTime)
        .should.be.fulfilled;
    });

    it("should finalize crowdsale and distribute token correctly", async () => {
      const tokenDistributions = input.sale.distribution.token;
      const etherDistributions = input.sale.distribution.ether;

      const lockerRatio = tokenDistributions
        .filter(t => t.token_holder === "locker")[ 0 ].token_ratio;
      const saleRatio = tokenDistributions
        .filter(t => t.token_holder === "crowdsale")[ 0 ].token_ratio;

      const saleAmounts = await token.totalSupply();
      const totalEtherFunded = await web3.eth.getBalance(vault.address);

      await crowdsale.finalize()
        .should.be.fulfilled;

      const totalSupply = await token.totalSupply();
      const lockerAmounts = await token.balanceOf(locker.address);

      lockerAmounts.should.be.bignumber.equal(totalSupply.mul(lockerRatio).div(coeff));
      saleAmounts.should.be.bignumber.equal(totalSupply.mul(saleRatio).div(coeff));

      // token distribution
      for (const { token_holder, token_ratio } of tokenDistributions) {
        if (token_holder === "crowdsale") {
          continue;
        }

        let addr;
        if (token_holder === "locker") {
          addr = locker.address;
        } else {
          addr = token_holder;
        }

        const holderBalance = await token.balanceOf(addr);

        holderBalance.should.be.bignumber.equal(totalSupply.mul(token_ratio).div(coeff));
      }

      // ether distribution
      for (let i = 0; i < 5; i++) {
        const holder = (await vault.holders(i))[ 0 ];
        const holderBalance = await web3.eth.getBalance(holder);

        // 20% for each holder
        holderBalance.should.be.bignumber.equal(totalEtherFunded.div(5));
      }
    });
  });
});

function getInput() {
  return JSON.parse('{"project_name":"RankingBall Gold","token":{"token_type":{"is_minime":true},"token_option":{"burnable":true,"pausable":true},"token_name":"RankingBall Gold","token_symbol":"RBG","decimals":18},"sale":{"max_cap":"40000000000000000000000","min_cap":"5000000000000000000000","start_time":"2018/03/12 00:00:00","end_time":"2018/04/11 00:00:00","coeff":"10000","rate":{"is_static":false,"base_rate":"50000","bonus":{"use_time_bonus":true,"use_amount_bonus":false,"time_bonuses":[{"bonus_time_stage":"2018/03/13 00:00:00","bonus_time_ratio":"2000"},{"bonus_time_stage":"2018/03/15 00:00:00","bonus_time_ratio":"1500"},{"bonus_time_stage":"2018/03/18 00:00:00","bonus_time_ratio":"1000"},{"bonus_time_stage":"2018/03/22 00:00:00","bonus_time_ratio":"500"}],"amount_bonuses":[]}},"distribution":{"token":[{"token_holder":"crowdsale","token_ratio":"2500"},{"token_holder":"0x173dF4D12d75c876656196C095f59b20aBCFa34a","_comment":"reserve1","token_ratio":"833"},{"token_holder":"0x73A5dAA05d62e6F60C5cD8d334DfDF9E59C3b14D","_comment":"reserve2","token_ratio":"833"},{"token_holder":"0xc135e061DF4AF2583B2CA2D41E37598856DB62D8","_comment":"reserve3","token_ratio":"834"},{"token_holder":"0xA3C9419b03d1Cb893eD0f2ae772d927f5Bca05A2","_comment":"martketingReserve1","token_ratio":"1000"},{"token_holder":"0x8c15c8709764b279968B647E580bbC3E370BfA87","_comment":"martketingReserve2","token_ratio":"1000"},{"token_holder":"0x2c08a528433570781A953Db7CCDed3a798C0DA9E","_comment":"martketingReserve3","token_ratio":"1000"},{"token_holder":"0x40A15bc3036293dCE89715ac7bB3090E0160e6ba","_comment":"businessPartner","token_ratio":"1000"},{"token_holder":"locker","_comment":"locker for owner and dev team","token_ratio":"1000"}],"ether":[{"ether_holder":"0x2Bc7E12243442146Bdf6dA647cA1feF3EEc04546","ether_ratio":"2000"},{"ether_holder":"0x80e21663Ada7b4929AD67C71E3afC2f77662790D","ether_ratio":"2000"},{"ether_holder":"0x2d9eD0C934B865Deba5eD192225c6F3a49d9e1E7","ether_ratio":"2000"},{"ether_holder":"multisig0","ether_ratio":"2000"},{"ether_holder":"multisig1","ether_ratio":"2000"}]},"stages":[{"start_time":"2018/03/12 00:00:00","end_time":"2018/04/11 00:00:00","cap_ratio":"100","max_purchase_limit":"0","min_purchase_limit":"0","kyc":true}],"valid_purchase":{"max_purchase_limit":"0","min_purchase_limit":"0","block_interval":5},"new_token_owner":"0x557678cf28594495ef4b08a6447726f931f8d787"},"multisig":{"use_multisig":true,"infos":[{"num_required":2,"owners":["0xbB4774A4acCe63Bbbc564dc5C77886B7257DE9b8","0x55E628D4bAb3Aa9aB593717E2a15690254Ed1B04","0x977035241e4BED626965ab21c93ef4eb342b7BDD"]},{"num_required":2,"owners":["0xE21cC11659F79c2D1d185619fD32Dc2C0120D4Ac","0x9DE692A1F1F22e4Be4A890B3adEc0D31E99B6D92","0xEb39b26B44b29A29e55dE2bAaBB5C9b2bf867e2c"]}]},"locker":{"use_locker":true,"beneficiaries":[{"address":"0xC8bF96c3E4db618BE3748d0279dbc9A07Da46E38","ratio":"5000","is_straight":true,"release":[{"release_time":"2018/04/11 00:00:00","release_ratio":"0"},{"release_time":"2020/04/11 00:00:00","release_ratio":"10000"}]},{"address":"0x4aaF7972b9277A100Cf22027261b4333eb3417Bc","ratio":"5000","is_straight":true,"release":[{"release_time":"2018/04/11 00:00:00","release_ratio":"5000"},{"release_time":"2020/04/11 00:00:00","release_ratio":"10000"}]}]}}');
}

function calcRate(baseRate, bonus, coeff) {
  const r = new BigNumber(baseRate);
  const b = new BigNumber(bonus);
  const c = new BigNumber(coeff);

  return r.mul(b.add(c)).div(c);
}

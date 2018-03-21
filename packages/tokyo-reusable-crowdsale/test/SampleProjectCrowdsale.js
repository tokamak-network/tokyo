import moment from "moment";
import get from "lodash/get";

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
const Token = artifacts.require("./SampleProjectToken.sol");
const Crowdsale = artifacts.require("./SampleProjectCrowdsale.sol");

contract("SampleProjectCrowdsale", async ([ owner, other, investor1, investor2, investor3, ...accounts ]) => {
  // contract instances
  let kyc, vault, locker, token, crowdsale;

  // TX parameteres
  const gas = 2000000;

  // test parameteres
  const input = getInput();
  const etherAmount = getEtherAmount(input);
  const minEtherAmount = new BigNumber(input.sale.valid_purchase.min_purchase_limit);
  const maxEtherAmount = new BigNumber(input.sale.valid_purchase.max_purchase_limit);
  const baseRate = new BigNumber(input.sale.rate.base_rate);

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

    await advanceBlocks();
  });

  describe("Before start time", async () => {
    it("reject buy tokens", async () => {
      await sendTransaction({
        from: investor1, to: crowdsale.address, value: etherAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });
  });

  describe("After start time", async () => {
    it("check conditions", async () => {
      (await kyc.registeredAddress(investor1))
        .should.be.equal(true);
    });

    it("increase time", async () => {
      await increaseTimeTo(convertTime(input, "sale.start_time"))
        .should.be.fulfilled;
    });

    it("reject buy tokens under min purchase", async () => {
      const investAmount = minEtherAmount.sub(ether(0.01));

      await sendTransaction({
        from: investor1, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    it("reject buy tokens for unknown account", async () => {
      const investAmount = etherAmount;

      await sendTransaction({
        from: other, to: crowdsale.address, value: investAmount, gas,
      }).should.be.rejectedWith(EVMThrow);
    });

    it("accept buy tokens over max purchase", async () => {
      const investor = investor1;
      const investAmount = maxEtherAmount.add(ether(0.01));
      const rate = getCurrentRate(input, investAmount);
      const tokenAmount = investAmount.mul(rate);

      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.fulfilled;

      await advanceBlocks();

      (await token.balanceOf(investor))
        .should.be.bignumber.equal(tokenAmount);
    });

    it("accept buy tokens for valid account and ether amount", async () => {
      const investor = investor2;
      const investAmount = etherAmount;
      const rate = getCurrentRate(input, investAmount);
      const tokenAmount = investAmount.mul(rate);

      await sendTransaction({
        from: investor, to: crowdsale.address, value: investAmount, gas,
      }).should.be.fulfilled;

      await advanceBlocks();

      (await token.balanceOf(investor))
        .should.be.bignumber.equal(tokenAmount);
    });
  });
});

function getInput() {
  return JSON.parse('{"project_name":"Sample Project","token":{"token_type":{"is_minime":true},"token_option":{"burnable":true,"pausable":true},"token_name":"Sample String","token_symbol":"SS","decimals":18},"sale":{"max_cap":"4e+21","min_cap":"1e+21","start_time":"2018-03-22T15:00:00.000Z","end_time":"2018-03-25T15:00:00.000Z","coeff":"1000","rate":{"is_static":false,"base_rate":"200","bonus":{"use_time_bonus":true,"use_amount_bonus":true,"time_bonuses":[{"bonus_time_stage":"2018-03-22T15:00:00.000Z","bonus_time_ratio":"100"},{"bonus_time_stage":"2018-03-23T15:00:00.000Z","bonus_time_ratio":"50"}],"amount_bonuses":[{"bonus_amount_stage":"1e+22","bonus_amount_ratio":"200"},{"bonus_amount_stage":"1e+21","bonus_amount_ratio":"100"},{"bonus_amount_stage":"100000000000000000000","bonus_amount_ratio":"50"}]}},"distribution":{"token":[{"token_holder":"crowdsale","token_ratio":"800"},{"token_holder":"locker","token_ratio":"200"}],"ether":[{"ether_holder":"0x557678cf28594495ef4b08a6447726f931f8d787","ether_ratio":"800"},{"ether_holder":"0x557678cf28594495ef4b08a6447726f931f8d788","ether_ratio":"200"}]},"stages":[{"start_time":"2018-03-22T15:00:00.000Z","end_time":"2018-03-23T14:59:59.000Z","cap_ratio":"100","max_purchase_limit":"50000000000000000","min_purchase_limit":"100000000000000","kyc":true},{"start_time":"2018-03-23T15:00:00.000Z","end_time":"2018-03-25T15:00:00.000Z","cap_ratio":"0","max_purchase_limit":"50000000000000000","min_purchase_limit":"100000000000000","kyc":true}],"valid_purchase":{"max_purchase_limit":"500000000000000000000","min_purchase_limit":"10000000000000000","block_interval":20},"new_token_owner":"0x557678cf28594495ef4b08a6447726f931f8d787","multisig":{"multisig_use":true,"num_multisig":1,"multisig_owner":["0x557678cf28594495ef4b08a6447726f931f8d787","0x557678cf28594495ef4b08a6447726f931f8d788"]}},"locker":{"use_locker":true,"beneficiaries":[{"address":"0x557678cf28594495ef4b08a6447726f931f8d787","ratio":"200","is_straight":true,"release":[{"release_time":"2018-03-27T15:00:00.000Z","release_ratio":"300"},{"release_time":"2018-03-29T15:00:00.000Z","release_ratio":"1000"}]},{"address":"0x557678cf28594495ef4b08a6447726f931f8d788","ratio":"800","is_straight":false,"release":[{"release_time":"2018-03-26T15:00:00.000Z","release_ratio":"200"},{"release_time":"2018-03-27T15:00:00.000Z","release_ratio":"500"},{"release_time":"2018-03-29T15:00:00.000Z","release_ratio":"1000"}]}]}}');
}

function getCurrentRate(input, amount) {
  const now = latestTime();
  const {
    sale: {
      coeff,
      rate: {
        base_rate,
        bonus: {
          use_time_bonus = false,
          use_amount_bonus = false,
          time_bonuses = [],
          amount_bonuses = [],
        },
      },
    },
  } = input;

  let timeBonus = 0,
    amountBonus = 0;

  if (use_time_bonus) {
    for (const { bonus_time_stage, bonus_time_ratio } of time_bonuses) {
      if (now < moment(bonus_time_stage).unix() / 1000) {
        timeBonus = new BigNumber(bonus_time_ratio);
        break;
      }
    }
  }

  if (use_amount_bonus) {
    for (const { bonus_amount_stage, bonus_amount_ratio } of amount_bonuses) {
      if (amount > new BigNumber(bonus_amount_stage)) {
        amountBonus = new BigNumber(bonus_amount_ratio);
        break;
      }
    }
  }

  const totalBonus = new BigNumber(timeBonus + amountBonus);

  return totalBonus.add(coeff).div(coeff);
}

function convertTime(input, path) {
  return moment(get(input, path)).unix();
}

function getEtherAmount(input) {
  if (input.sale.valid_purchase.min_purchase_limit) {
    return new BigNumber(input.sale.valid_purchase.min_purchase_limit).add(ether(0.1));
  }
  return ether(1);
}

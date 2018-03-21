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

const KYC = artifacts.require("./KYC.sol");

contract("KYC", async ([ owner, admin, investor1, investor2, ...accounts ]) => {
  // contract instances
  let kyc;

  before(async () => {
    kyc = await KYC.deployed();
  });

  it("only owner can add admin", async () => {
    await kyc.setAdmin(admin, true, { from: admin })
      .should.be.rejectedWith(EVMThrow);

    await kyc.setAdmin(admin, true, { from: owner })
      .should.be.fulfilled;
  });

  it("only admin can register", async () => {
    await kyc.register(investor1, { from: investor1 })
      .should.be.rejectedWith(EVMThrow);

    await kyc.register(investor1, { from: admin })
      .should.be.fulfilled;
  });

  it("only admin can unregister", async () => {
    await kyc.unregister(investor1, { from: investor1 })
      .should.be.rejectedWith(EVMThrow);

    await kyc.unregister(investor1, { from: admin })
      .should.be.fulfilled;
  });
});

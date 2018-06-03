const fs = require("fs");
const path = require("path");
const moment = require("moment");
const get = require("lodash/get");
const ethUtils = require("ethereumjs-util");
const validate = require("tokyo-schema").default;

const BigNumber = web3.BigNumber;
const { toBuffer, setLengthLeft, addHexPrefix, isValidAddress } = ethUtils;

/**
 * Contract Artifacts
 */
const KYC = artifacts.require("./KYC.sol");
const Vault = artifacts.require("./MultiHolderVault.sol");
const Locker = artifacts.require("./Locker.sol");
const Multisig = artifacts.require("./MultiSigWallet.sol");
const Token = artifacts.require("./ProjectWithCustomTokenToken.sol");
const Crowdsale = artifacts.require("./ProjectWithCustomTokenCrowdsale.sol");

module.exports = async function (deployer, network, accounts) {
  console.log(accounts)
  const address = {};
  const { value, error } = validate(getInput());
  const input = value;

  const data = { address, input };

  // contract instance
  let kyc, vault, locker, multisigs, token, crowdsale;

  /**
   * Deploy contracts sequentually
   *  1. KYC / Vault / Locker / Multisigs(optional)
   *  2. Token
   *  3. Crowdsale
   *  4. Initialize contracts
   *   - transfer ownerships of vault, token, lcoker to crowdsale
   *   - Crowdsale.init()
   */

  deployer.deploy([
    KYC,
    [
      Vault,
      get(data, "input.sale.new_token_owner"),
      get(data, "input.sale.coeff"),
    ],
    [
      Token,
      // token arguments...
      "0x0000000000000000000000000000000000000000"
    ]
  ]).then(async () => {
    kyc = await KYC.deployed();
    vault = await Vault.deployed();
    token = await Token.deployed();

    address.kyc = kyc.address;
    address.vault = vault.address;
    address.token = token.address;
  }).then(async () => {
    multisigs = await Promise.all([
      Multisig.new(["0x557678cf28594495ef4b08a6447726f931f8d787", "0x557678cf28594495ef4b08a6447726f931f8d788"], 1),
      Multisig.new(["0x557678cf28594495ef4b08a6447726f931f8d789", "0x557678cf28594495ef4b08a6447726f931f8d78a"], 1)
    ]);

    address.multisigs = multisigs.map(m => m.address);
    console.log("Multisigs :", address.multisigs.join(", "));
    fs.writeFileSync(path.resolve(__dirname, "../multisigs.json"), JSON.stringify(address.multisigs));
  }).then(async () => deployer.deploy([
    [
      Locker,
      get(data, "address.token"),
      get(data, "input.sale.coeff"),
      [
        get(data, "input.locker.beneficiaries.0.address"),
        get(data, "input.locker.beneficiaries.1.address")
      ],
      [
        get(data, "input.locker.beneficiaries.0.ratio"),
        get(data, "input.locker.beneficiaries.1.ratio")
      ]
    ],
  ])).then(async () => {
    locker = await Locker.deployed();

    address.locker = locker.address;
  }).then(() => deployer.deploy([
    [
      Crowdsale,
      [
        get(data, "input.sale.coeff"),
        get(data, "address.token"),
        get(data, "input.sale.valid_purchase.max_purchase_limit"),
        get(data, "input.sale.valid_purchase.min_purchase_limit"),
        get(data, "input.sale.valid_purchase.block_interval"),
        get(data, "address.kyc"),
        get(data, "input.sale.stages.length"),
      ].map(toLeftPaddedBuffer)
    ]
  ])).then(async () => {
    crowdsale = await Crowdsale.deployed();

    address.crowdsale = crowdsale.address;
  }).then(async () => {
    
    const tokenDistributions = get(data, "input.sale.distribution.token");
    const lockerRatios = tokenDistributions
      .filter(t => t.token_holder === "locker")[0].token_ratio;
    const crowdsaleRatio = tokenDistributions
      .filter(t => t.token_holder === "crowdsale")[0].token_ratio;
  
    const initArgs = [
      new BigNumber(get(data, "input.sale.start_time")),
      new BigNumber(get(data, "input.sale.end_time")),
      new BigNumber(get(data, "input.sale.rate.base_rate")),
      new BigNumber(get(data, "input.sale.max_cap")),
      new BigNumber(get(data, "input.sale.min_cap")),
      new BigNumber(crowdsaleRatio),
      get(data, "address.vault"),
      get(data, "address.locker"),
      get(data, "input.sale.new_token_owner")
    ];
    
    await crowdsale.init(initArgs.map(toLeftPaddedBuffer));

    const etherHolderAddresses = get(data, "input.sale.distribution.ether").map(({ether_holder}) => {
      if (isValidAddress(ether_holder)) return ether_holder;
      if (ether_holder.includes("multisig")) {
        const idx = Number(ether_holder.split("multisig")[1]);
        if (!isValidAddress(address.multisigs[idx])) throw new Error("Invalid multisig address", address.multisigs[idx]);
    
        return address.multisigs[idx];
      }
    });
    const etherHolderRatios = get(data, "input.sale.distribution.ether").map(e => e.ether_ratio);
    
    await vault.initHolders(
      etherHolderAddresses,
      etherHolderRatios,
    );
    
    const tokenHolderAddresses = get(data, "input.sale.distribution.token").map(({token_holder}) => {
      if (isValidAddress(token_holder)) return token_holder;
      if (token_holder === "crowdsale") return "0x00";
      if (token_holder === "locker") return address.locker;
      if (token_holder.includes("multisig")) {
        const idx = Number(token_holder.split("multisig")[1]);
        if (!isValidAddress(address.multisigs[idx])) throw new Error("Invalid multisig address", address.multisigs[idx]);
    
        return address.multisigs[idx];
      }
    });
    const tokenHolderRatios = get(data, "input.sale.distribution.token").map(e => e.token_ratio);
    
    await crowdsale.initHolders(
      tokenHolderAddresses,
      tokenHolderRatios,
    );
    
    const bonusTimeStages = [
      get(data, "input.sale.rate.bonus.time_bonuses.0.bonus_time_stage"),
      get(data, "input.sale.rate.bonus.time_bonuses.1.bonus_time_stage") ];
    const bonusTimeRatios = [
      get(data, "input.sale.rate.bonus.time_bonuses.0.bonus_time_ratio"),
      get(data, "input.sale.rate.bonus.time_bonuses.1.bonus_time_ratio") ];
      
    const bonusAmountStages = [
      get(data, "input.sale.rate.bonus.amount_bonuses.0.bonus_amount_stage"),
      get(data, "input.sale.rate.bonus.amount_bonuses.1.bonus_amount_stage"),
      get(data, "input.sale.rate.bonus.amount_bonuses.2.bonus_amount_stage") ];
    const bonusAmountRatios = [
      get(data, "input.sale.rate.bonus.amount_bonuses.0.bonus_amount_ratio"),
      get(data, "input.sale.rate.bonus.amount_bonuses.1.bonus_amount_ratio"),
      get(data, "input.sale.rate.bonus.amount_bonuses.2.bonus_amount_ratio") ];

    await crowdsale.setBonusesForTimes(
      bonusTimeStages,
      bonusTimeRatios,
    );

    await crowdsale.setBonusesForAmounts(
      bonusAmountStages,
      bonusAmountRatios,
    );

    const periodStartTimes = [
      get(data, "input.sale.stages.0.start_time"),
      get(data, "input.sale.stages.1.start_time") ];
    const periodEndTimes = [
      get(data, "input.sale.stages.0.end_time"),
      get(data, "input.sale.stages.1.end_time") ];
    const periodCapRatios = [
      get(data, "input.sale.stages.0.cap_ratio"),
      get(data, "input.sale.stages.1.cap_ratio") ];
    const periodMaxPurchaseLimits = [
      get(data, "input.sale.stages.0.max_purchase_limit"),
      get(data, "input.sale.stages.1.max_purchase_limit") ];
    const periodMinPurchaseLimits = [
      get(data, "input.sale.stages.0.min_purchase_limit"),
      get(data, "input.sale.stages.1.min_purchase_limit") ];
    const periodKycs = [
      get(data, "input.sale.stages.0.kyc"),
      get(data, "input.sale.stages.1.kyc") ];

    await crowdsale.initStages(
      periodStartTimes,
      periodEndTimes,
      periodCapRatios,
      periodMaxPurchaseLimits,
      periodMinPurchaseLimits,
      periodKycs,
    );

    const release0Times = [
      get(data, "input.locker.beneficiaries.0.release.0.release_time"),
      get(data, "input.locker.beneficiaries.0.release.1.release_time") ];
    const release0Ratios = [
      get(data, "input.locker.beneficiaries.0.release.0.release_ratio"),
      get(data, "input.locker.beneficiaries.0.release.1.release_ratio") ];

    await locker.lock(
      get(data, "input.locker.beneficiaries.0.address"),
      get(data, "input.locker.beneficiaries.0.is_straight"),
      release0Times,
      release0Ratios,
    );

    const release1Times = [
      get(data, "input.locker.beneficiaries.1.release.0.release_time"),
      get(data, "input.locker.beneficiaries.1.release.1.release_time"),
      get(data, "input.locker.beneficiaries.1.release.2.release_time") ];
    const release1Ratios = [
      get(data, "input.locker.beneficiaries.1.release.0.release_ratio"),
      get(data, "input.locker.beneficiaries.1.release.1.release_ratio"),
      get(data, "input.locker.beneficiaries.1.release.2.release_ratio") ];

    await locker.lock(
      get(data, "input.locker.beneficiaries.1.address"),
      get(data, "input.locker.beneficiaries.1.is_straight"),
      release1Times,
      release1Ratios,
    );

  }).then(async () => {
    // transfer ownerships to crowdsale
    await Promise.all([
      vault.transferOwnership(crowdsale.address),
      locker.transferOwnership(crowdsale.address),
      token.changeController(crowdsale.address),
    ]);

  });
};

function getInput() {
  return JSON.parse('{"project_name":"Project With Custom Token","token":{"token_type":{"is_minime":true},"token_option":{"burnable":true,"pausable":true,"no_mint_after_sale":true},"token_name":"For Audit","token_symbol":"FA","decimals":18},"sale":{"max_cap":"4000000000000000000000","min_cap":"1000000000000000000000","start_time":"2019/05/23 00:00:00","end_time":"2019/05/27 00:00:00","coeff":"1000","rate":{"is_static":false,"base_rate":"200","bonus":{"use_time_bonus":true,"use_amount_bonus":true,"time_bonuses":[{"bonus_time_stage":"2019/05/24 00:00:00","bonus_time_ratio":"100"},{"bonus_time_stage":"2019/05/26 00:00:00","bonus_time_ratio":"50"}],"amount_bonuses":[{"bonus_amount_stage":"100000000000000000000","bonus_amount_ratio":"200"},{"bonus_amount_stage":"10000000000000000000","bonus_amount_ratio":"100"},{"bonus_amount_stage":"1000000000000000000","bonus_amount_ratio":"50"}]}},"distribution":{"token":[{"token_holder":"crowdsale","token_ratio":"750"},{"token_holder":"locker","token_ratio":"150"},{"token_holder":"0x557678cf28594495ef4b08a6447726f931f8d787","token_ratio":"50"},{"token_holder":"multisig0","token_ratio":"50"}],"ether":[{"ether_holder":"0x557678cf28594495ef4b08a6447726f931f8d787","ether_ratio":"800"},{"ether_holder":"0x557678cf28594495ef4b08a6447726f931f8d788","ether_ratio":"100"},{"ether_holder":"multisig1","ether_ratio":"100"}]},"stages":[{"start_time":"2019/05/23 00:00:00","end_time":"2019/05/24 00:00:00","cap_ratio":"200","max_purchase_limit":"400000000000000000000","min_purchase_limit":"100000000000000","kyc":true},{"start_time":"2019/05/25 00:00:00","end_time":"2019/05/27 00:00:00","cap_ratio":"0","max_purchase_limit":"0","min_purchase_limit":"0","kyc":true}],"valid_purchase":{"max_purchase_limit":"2000000000000000000000","min_purchase_limit":"10000000000000000","block_interval":20},"new_token_owner":"0xcf7b6f1489129c94a98c79e4be659ea111c76397"},"multisig":{"use_multisig":true,"infos":[{"num_required":1,"owners":["0x557678cf28594495ef4b08a6447726f931f8d787","0x557678cf28594495ef4b08a6447726f931f8d788"]},{"num_required":1,"owners":["0x557678cf28594495ef4b08a6447726f931f8d789","0x557678cf28594495ef4b08a6447726f931f8d78a"]}]},"locker":{"use_locker":true,"beneficiaries":[{"address":"0x557678cf28594495ef4b08a6447726f931f8d787","ratio":"200","is_straight":true,"release":[{"release_time":"2019/05/28 00:00:00","release_ratio":"300"},{"release_time":"2019/05/30 00:00:00","release_ratio":"1000"}]},{"address":"0x557678cf28594495ef4b08a6447726f931f8d788","ratio":"800","is_straight":false,"release":[{"release_time":"2019/05/27 00:00:00","release_ratio":"200"},{"release_time":"2019/05/28 00:00:00","release_ratio":"500"},{"release_time":"2019/05/30 00:00:00","release_ratio":"1000"}]}]}}');
}

function toLeftPaddedBuffer(v) {
  const val = addHexPrefix(new BigNumber(v).toString(16));
  const buf = toBuffer(val);
  const hex = setLengthLeft(buf, 32).toString("hex");
  return addHexPrefix(hex);
}




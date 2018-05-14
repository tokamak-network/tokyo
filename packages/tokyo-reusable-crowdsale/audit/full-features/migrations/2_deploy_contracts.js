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
const Token = artifacts.require("./AuditFullFeaturesToken.sol");
const Crowdsale = artifacts.require("./AuditFullFeaturesCrowdsale.sol");

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
      "0xcf7b6f1489129c94a98c79e4be659ea111c76397",
      1000
    ],
    [
      Token,
      // token arguments...
      "0x00"
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
  }).then(async () => deployer.deploy([
    [
      Locker,
      get(data, "address.token"),
        new BigNumber("1000"),
        ["0x557678cf28594495ef4b08a6447726f931f8d787", "0x557678cf28594495ef4b08a6447726f931f8d788"],
        [new BigNumber("200"), new BigNumber("800")]
    ],
  ])).then(async () => {
    locker = await Locker.deployed();

    address.locker = locker.address;
  }).then(() => deployer.deploy([
    [
      Crowdsale,
      [
        get(data, "address.token"), // address.token
        new BigNumber("2000000000000000000000"), // input.sale.valid_purchase.max_purchase_limit
        new BigNumber("10000000000000000"), // input.sale.valid_purchase.min_purchase_limit
        new BigNumber("20"), // input.sale.valid_purchase.block_interval
        get(data, "address.kyc"), // address.kyc
        new BigNumber("2"), // input.sale.stages_length
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
      new BigNumber(get(data, "input.sale.coeff")),
      new BigNumber(get(data, "input.sale.max_cap")),
      new BigNumber(get(data, "input.sale.min_cap")),
      new BigNumber(lockerRatios),
      new BigNumber(crowdsaleRatio),
      get(data, "address.vault"),
      get(data, "address.locker"),
      get(data, "input.sale.new_token_owner")
    ];
    
    await crowdsale.init(initArgs.map(toLeftPaddedBuffer));

    const holderAddresses = get(data, "input.sale.distribution.ether").map(({ether_holder}) => {
      if (isValidAddress(ether_holder)) return ether_holder;
      if (ether_holder.includes("multisig")) {
        const idx = Number(ether_holder.split("multisig")[1]);
        if (!isValidAddress(address.multisigs[idx])) throw new Error("Invalid multisig address", address.multisigs[idx]);
    
        return address.multisigs[idx];
      }
    });
    const holderRatios = get(data, "input.sale.distribution.ether").map(e => e.ether_ratio);
    
    await vault.initHolders(
      holderAddresses,
      holderRatios,
    );
    
    const bonusTimes = [ 1527120000, 1527292800 ];
    const bonusTimeValues = [ 100, 50 ];
      
    const bonusAmounts = [ 100000000000000000000, 10000000000000000000, 1000000000000000000 ];
    const bonusAmountValues = [ 200, 100, 50 ];

    await crowdsale.setBonusesForTimes(
      bonusTimes,
      bonusTimeValues,
    );

    await crowdsale.setBonusesForAmounts(
      bonusAmounts,
      bonusAmountValues,
    );

    const periodStartTimes = [ 1527033600, 1527206400 ];
    const periodEndTimes = [ 1527120000, 1527379200 ];
    const periodCapRatios = [ 200, 0 ];
    const periodMaxPurchaseLimits = [ 400000000000000000000, 0 ];
    const periodMinPurchaseLimits = [ 100000000000000, 0 ];
    const periodKycs = [ true, true ];

    await crowdsale.initStages(
      periodStartTimes,
      periodEndTimes,
      periodCapRatios,
      periodMaxPurchaseLimits,
      periodMinPurchaseLimits,
      periodKycs,
    );

    const release1Times = [ 1527465600, 1527638400 ];
    const release1Ratios = [ 300, 1000 ];

    await locker.lock(
      "0x557678cf28594495ef4b08a6447726f931f8d787",
      true,
      release1Times,
      release1Ratios,
    );
    
    const release2Times = [ 1527379200, 1527465600, 1527638400 ];
    const release2Ratios = [ 200, 500, 1000 ];

    await locker.lock(
      "0x557678cf28594495ef4b08a6447726f931f8d788",
      false,
      release2Times,
      release2Ratios,
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
  return JSON.parse('{"project_name":"Audit Full Features","token":{"token_type":{"is_minime":true},"token_option":{"burnable":true,"pausable":true,"no_mint_after_sale":true},"token_name":"For Audit","token_symbol":"FA","decimals":18},"sale":{"max_cap":"4000000000000000000000","min_cap":"1000000000000000000000","start_time":"2018/05/23 00:00:00","end_time":"2018/05/27 00:00:00","coeff":"1000","rate":{"is_static":false,"base_rate":"200","bonus":{"use_time_bonus":true,"use_amount_bonus":true,"time_bonuses":[{"bonus_time_stage":"2018/05/24 00:00:00","bonus_time_ratio":"100"},{"bonus_time_stage":"2018/05/26 00:00:00","bonus_time_ratio":"50"}],"amount_bonuses":[{"bonus_amount_stage":"100000000000000000000","bonus_amount_ratio":"200"},{"bonus_amount_stage":"10000000000000000000","bonus_amount_ratio":"100"},{"bonus_amount_stage":"1000000000000000000","bonus_amount_ratio":"50"}]}},"distribution":{"token":[{"token_holder":"crowdsale","token_ratio":"800"},{"token_holder":"locker","token_ratio":"100"},{"token_holder":"0x557678cf28594495ef4b08a6447726f931f8d787","token_ratio":"100"}],"ether":[{"ether_holder":"0x557678cf28594495ef4b08a6447726f931f8d787","ether_ratio":"800"},{"ether_holder":"0x557678cf28594495ef4b08a6447726f931f8d788","ether_ratio":"200"}]},"stages":[{"start_time":"2018/05/23 00:00:00","end_time":"2018/05/24 00:00:00","cap_ratio":"200","max_purchase_limit":"400000000000000000000","min_purchase_limit":"100000000000000","kyc":true},{"start_time":"2018/05/25 00:00:00","end_time":"2018/05/27 00:00:00","cap_ratio":"0","max_purchase_limit":"0","min_purchase_limit":"0","kyc":true}],"valid_purchase":{"max_purchase_limit":"2000000000000000000000","min_purchase_limit":"10000000000000000","block_interval":20},"new_token_owner":"0xcf7b6f1489129c94a98c79e4be659ea111c76397"},"multisig":{"use_multisig":true,"infos":[{"num_required":1,"owners":["0x557678cf28594495ef4b08a6447726f931f8d787","0x557678cf28594495ef4b08a6447726f931f8d788"]},{"num_required":1,"owners":["0x557678cf28594495ef4b08a6447726f931f8d789","0x557678cf28594495ef4b08a6447726f931f8d78a"]}]},"locker":{"use_locker":true,"beneficiaries":[{"address":"0x557678cf28594495ef4b08a6447726f931f8d787","ratio":"200","is_straight":true,"release":[{"release_time":"2018/05/28 00:00:00","release_ratio":"300"},{"release_time":"2018/05/30 00:00:00","release_ratio":"1000"}]},{"address":"0x557678cf28594495ef4b08a6447726f931f8d788","ratio":"800","is_straight":false,"release":[{"release_time":"2018/05/27 00:00:00","release_ratio":"200"},{"release_time":"2018/05/28 00:00:00","release_ratio":"500"},{"release_time":"2018/05/30 00:00:00","release_ratio":"1000"}]}]}}');
}

function toLeftPaddedBuffer(v) {
  if (typeof v === "boolean") {
    v = Number(v);
  } else if (v instanceof BigNumber) {
    v = addHexPrefix(v.toString(16));
  }

  const buf = toBuffer(v);
  const hex = setLengthLeft(buf, 32).toString("hex");
  return addHexPrefix(hex);
}




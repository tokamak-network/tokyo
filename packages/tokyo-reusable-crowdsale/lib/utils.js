const moment = require("moment");
const BigNumber = require("bignumber.js");
const HDWalletProvider = require("truffle-hdwallet-provider");
const TruffleContract = require("truffle-contract");

const secToMillisec = sec => sec * 1000;

exports.ether = n => new BigNumber(n).mul(1e18);

exports.timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.waitUntil = async (targetTime) => {
  const now = moment().unix();
  await exports.timeout(secToMillisec(targetTime - now));
};

exports.stringify = obj => JSON.stringify(obj, undefined, 2);

exports.sliceAccount = (accounts, start = 0, n = 4) => (_n = n) => {
  const r = accounts.slice(start, start + _n);
  start += _n;
  return r;
};

/**
 * @params Web3 {Web3} web3 1.0 node package
 * @params providerUrl {String} web3 provider url
 * @params mnemonic {String} mnemonic seed to unlock ethereum account
 */
exports.loadWeb3FromMnemonic = (Web3, providerUrl, mnemonic) => {
  const web3 = new Web3();
  const provider = new HDWalletProvider(mnemonic, providerUrl, 0, 50);
  web3.setProvider(provider);

  const owner = provider.addresses[ 0 ];
  return { web3, owner };
};

// https://github.com/ethereum/web3.js/issues/1102#issuecomment-355198298
exports.loadTruffleContract = (artifacts, provider, address) => {
  const contract = TruffleContract(artifacts);
  contract.setProvider(provider);

  if (typeof contract.currentProvider.sendAsync !== "function") {
    contract.currentProvider.sendAsync = function () {
      return contract.currentProvider.send.apply(
        contract.currentProvider, arguments,
      );
    };
  }

  return contract.at(address);
};

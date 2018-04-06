require("babel-register");
require("babel-polyfill");

const HDWalletProvider = require("truffle-hdwallet-provider");
require("dotenv").config();

const mnemonic = process.env.MNEMONIC || "onther tokyo onther tokyo onther tokyo onther tokyo onther tokyo onther tokyo";

const ropstenProviderUrl = "https://ropsten.infura.io";
const mainnetProviderUrl = "https://api.myetherapi.com/eth";

const providerRopsten = new HDWalletProvider(mnemonic, ropstenProviderUrl, 0, 50);
const providerMainnet = new HDWalletProvider(mnemonic, mainnetProviderUrl, 0, 50);

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4200000,
      gasPrice: 20e9,
    },
    ganache: {
      host: "localhost",
      port: 7545,
      network_id: "*",
      gas: 4200000,
    },
    ropsten: {
      network_id: 3,
      provider: providerRopsten,
      gas: 4200000,
      gasPrice: 30e9,
    },
    mainnet: {
      network_id: 1,
      provider: providerMainnet,
      gas: 4200000,
      gasPrice: 50e9,
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

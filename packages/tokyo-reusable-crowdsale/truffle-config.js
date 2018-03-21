require("babel-register");
require("babel-polyfill");

const Ganache = require("ganache-core");

const HDWalletProvider = require("truffle-hdwallet-provider");
require("dotenv").config();

const mnemonic = process.env.MNEMONIC || "onther tokyo onther tokyo onther tokyo onther tokyo onther tokyo onther tokyo";
const mnemonicTest = process.env.MNEMONIC_TEST || "onther tokyo onther tokyo onther tokyo onther tokyo onther tokyo onther tokyo";

const providerUrl = "https://ropsten.infura.io";

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4700000,
      gasPrice: 20e9,
    },
    test: {
      network_id: "*",
      provider() {
        return Ganache.provider({
          network_id: "7",
          seed: mnemonicTest,
          default_balance_ether: 100000,
          total_accounts: 50,
          debug: true,
          logger: console,
          port: 7544,
          locked: false,
        });
      },
      gas: 4700000,
      gasPrice: 100e9,
    },
    ropsten: {
      network_id: 3,
      provider() {
        return new HDWalletProvider(mnemonic, providerUrl, 0, 50);
      },
      gas: 4700000,
      gasPrice: 100e9,
    },
    mainnet: {
      host: "onther.io",
      port: 60001,
      network_id: "1",
      from: "0x07bfd26f09a90564fbc72f77758b0259b65b783b",
      gas: 4700000,
      gasPrice: 25e9,
    },
    onther: {
      host: "onther.io",
      port: 60010,
      network_id: "777",
      from: "0x71283a1d35f63e35a34476f6ad0a85a49317181b", // accounts[0]
      gas: 4700000,
      gasPrice: 18e9,
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};

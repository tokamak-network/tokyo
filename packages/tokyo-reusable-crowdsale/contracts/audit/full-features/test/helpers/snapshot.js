export function capture() {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_snapshot",
        params: [],
        id,
      },
      (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result.result);
      },
    );
  });
}

export function restore(snapshotId) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method: "evm_revert",
        params: [ snapshotId ],
        id,
      },
      (err, result) => {
        if (err) {
          reject(err);
        }

        resolve(result.result);
      },
    );
  });
}

export class Snapshot {
  constructor(verbose = false) {
    this.snapId = -1;
    this.verbose = verbose;
  }

  log = (...args) => this.verbose && console.log(...args)

  captureContracts = async () => {
    this.snapId = await capture();
    this.log("[Captured Blocktime]", web3.eth.getBlock("latest").timestamp);
  };

  restoreContracts = async () => {
    this.log("[Before Restore Blocktime]", web3.eth.getBlock("latest").timestamp);

    await restore(this.snapId);

    this.log("[After Restore Blocktime]", web3.eth.getBlock("latest").timestamp);
  };
}

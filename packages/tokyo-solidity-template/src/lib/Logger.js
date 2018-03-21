export default class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  log(...args) {
    if (this.verbose) console.log(...args);
  }
}

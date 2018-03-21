var pkg =  require("../package.json");
// var solcpkg = require("solc/package.json");

var bundle_version = null;

if(typeof BUNDLE_VERSION != "undefined") {
    bundle_version = BUNDLE_VERSION;
}

module.exports = {
    core: pkg.version,
    bundle: bundle_version,
    // solc: solcpkg.version
}
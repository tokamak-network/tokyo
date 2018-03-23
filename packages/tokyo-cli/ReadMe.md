## Tokyo
Cli for Tokyo 

## Usage

### in Terminal

```bash
# install tokyo as global package
$ npm install -g tokyo-cli

# generate CrowdSale & Token Solidity Code
$ tokyo generate --input <tokyo_schem.json>

#optional You can use i instead of input
$ tokyo generate --i <tokyo_schem.json> --out <~/dir>

# flattening code for verification on etherscan
$ tokyo flatten --input <soliditycode.sol>

# draw diagram ! You should compile first before draw diagram
$ npm install 
$ truffle compile
$ tokyo draw --input <soliditycode.sol>

# optional You can draw just contract relation
$ tokyo draw --input <solidity.sol> --simple



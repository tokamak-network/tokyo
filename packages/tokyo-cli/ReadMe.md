## Tokyo
Cli for Tokyo 

## Usage

### in Terminal
> 1.0.0 doesn't provide npm 

```bash
$ git clone https://github.com/Onther-Tech/tokyo.git
$ cd tokyo && git submodule update --init --recursive
$ npm install && npm run build
# install tokyo as global package
$ npm install -g .

# generate CrowdSale & Token Solidity Code
$ tokyo generate --input <tokyo_schem.json>

#optional You can use i instead of input
$ tokyo generate --i <tokyo_schem.json> --out <~/dir>

# flattening code for verification on etherscan
$ tokyo flatten --input <soliditycode.sol>

# draw diagram ! You should compile first before draw diagram 
$ truffle compile
$ tokyo draw --input <soliditycode.sol>

# optional You can draw just contract relation
$ tokyo draw --input <solidity.sol> --simple



## Tokyo
Truffle project generator for ICO contracts


## Packages
#### [tokyo-cli](./packages/tokyo-cli)
Cli for Tokyo

#### [tokyo-reusable-crowdsale](./packages/tokyo-reusable-crowdsale)
Base Solidity Contracts for CrowdSale

#### [tokyo-schema](./packages/tokyo-schema)
Input Schema for Generating Solidity Contracts

#### [tokyo-solidity-template](./packages/tokyo-solidity-template)
Generating Solidity Code Using tokyo-reusable-crowdsale Based on Input Data

#### [tokyo-test-data](./packages/tokyo-test-data)
Sample Input Data for tokyo


## [Contributing](./CONTRIBUTING.md)

## Development

#### Environment
node 8.9.1
yarn 1.5.1

```bash
# clone repository
$ git clone https://github.com/Onther-Tech/tokyo.git && cd tokyo

# clear node modules if already installed
$ rm -rf node_modules # remove root dependencies
$ rm -rf packages/tokyo-*/node_modules # remove package dependencies

# install node modules with yarn
$ yarn install
```

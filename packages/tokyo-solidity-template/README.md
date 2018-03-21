![Build Status](https://secure.travis-ci.org/Onther-Tech/tokyo-solidity-template.png?branch=master,staging,production)

## Tokyo Solidity Template
Make solidity contract based on user input

## Usage

### in Terminal
> beta version doesn't support npm

```bash
$ git clone https://github.com/Onther-Tech/tokyo-solidity-template.git
$ cd tokyo-solidity-template && git submodule update --init --recursive
$ npm install && npm run build

# install tokyo-solidity-template as global package
$ npm install -g .

# generate sample tokyo project
$ tokyo-solidity-template -i ./submodules/tokyo-test-data/sample1.json
```

### as node package
```node
# ES5
const Template = require("tokyo-solidity-template").default 

# ES6
import Template from "tokyo-solidity-template";

const options = {
    input: "./input.json", # input json file pah
    output: "./out"        # truffle project directory path
};

Template(options, () => {
    console.log("generated");
});
```

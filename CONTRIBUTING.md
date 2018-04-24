## Prefix

This monorepo covers all sub packages in a single [issues](https://github.com/Onther-Tech/tokyo/issues), [pull requests](https://github.com/Onther-Tech/tokyo/pulls) pages. To categorize title of commit message, issue, and pull request clearly, use prefix the title of related package name or __meaningful word__.


### Simple rules

1. If the commit is on a specific single tokyo package, please prepend the package name without string `tokyo`.


Example: tokyo-solidity-template
```
solidity-template: Fix crowdsale.generateToken generator

Wrong generatorToken process in Parser and crowdsale template
```

<br>

2. If a single commit fix more than 1 package, you can use any meaningful prefix. Or you can *omit* it for simplicity.

Example: tokyo-solidity-template, tokyo-reusable-crowdsale, tokyo-input
```
audit: Change inheritance structure
```

Example: tokyo-solidity-template, tokyo-reusable-crowdsale
```
Apply updated contract structure of zeppelin-solidity
```

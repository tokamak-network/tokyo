import BigNumber from "bignumber.js";
import moment from "moment";

export const serialize = JSON.stringify;

export function writeTabs(numTap) {
  return "  ".repeat(numTap);
}

export function getLastName(str, delimiter = ".") {
  return str.split(delimiter).slice(-1)[ 0 ];
}

/**
 * @notice return parameter for Crowdsale constructor modifier
 * @param { Object } input tokyo input parsed by tokyo-schema
 * @param { Number } numTap indentation level
 */
export function appendParseFunction(type, argName, index, withType) {
  if (withType) return `${ type } ${ argName }`;
  if (type === "uint") return `parseUint(args[${ index }])`;
  if (type === "address") return `parseAddress(args[${ index }])`;
  if (type === "bool") return `parseBool(args[${ index }])`;

  throw new Error("can't recognize type", type);
}

/**
 * @notice flatten `args` into solidity function parameters
 * @param { Array } args is form of [ [solidity data type], [path for lodash.get] ]
 * @param { Number } numTap the number of tabs
 * @param { Bool } withType if true, append solidity data type. if false, remove it and use `args`
 */
export function flattenArguments(args, startIndex, numTap = 2, withType = true) {
  return args
    .map((typeAndPath, i) => {
      const type = typeAndPath[ 0 ];
      const argName = getLastName(typeAndPath[ 1 ]);
      const value = withType ? argName :
        appendParseFunction(type, argName, startIndex + i, withType);

      return `\n${ writeTabs(numTap) }${ value }`;
    }).join(",");
}

/**
 * @param { String } parentName parent contract name to inherit
 * @param { Array } args is form of [ [solidity data type], [path for lodash.get] ]
 * @param { Number } startIndex index of arguments
 */
export function writeSuperModifier(parentName, args, startIndex) {
  return `${ writeTabs(2) }${ parentName }(${ flattenArguments(args, startIndex, 3, false) })`;
}

/**
 * @param { Array } parentsList names of parent contracts
 * @param { Object } constructors set of arguments of constructors
 */
export function writeSuperModifiers(parentsList, constructors) {
  const ret = [];

  let i = 0;

  parentsList.forEach((parentName) => {
    const len = constructors[ parentName ].length;

    ret.push(writeSuperModifier(parentName, constructors[ parentName ], i));

    i += len;
  });

  return `\n${ ret.join("\n") }`;
}

/**
 * @notice write Locker's constructor arguments in migration template
 * @param { Object } input tokyo input parsed by tokyo-schema
 * @param { Number } numTap indentation level
 */
export function writeMultisigArguments(input, numTap = 3) {
  if (!input.multisig.use_multisig) {
    return "";
  }

  return input.multisig.infos.map(({ num_required, owners }) =>
    `Multisig.new([${ owners.map(convertAddress).join(", ") }], ${ num_required })`)
    .join(`,\n${ writeTabs(numTap) }`);
}

/**
 * @notice write Locker's constructor arguments in migration template
 * @param { Object } input tokyo input parsed by tokyo-schema
 * @param { Number } numTap indentation level
 */
export function writeLockerArguments(input, numTap = 3) {
  const ret = [];

  const addrs = [];
  const ratios = [];

  const {
    locker: { beneficiaries },
  } = input;

  ret.push("get(data, \"address.token\")");

  ret.push("get(data, \"input.sale.coeff\")");

  for (let i = 0; i < beneficiaries.length; i++) {
    addrs.push(`get(data, "input.locker.beneficiaries.${ i }.address")`);
    ratios.push(`get(data, "input.locker.beneficiaries.${ i }.ratio")`);
  }

  ret.push(`[
${ writeTabs(numTap) }${ addrs.join(`,\n${ writeTabs(numTap) }`) }
${ writeTabs(numTap - 1) }]`);

  ret.push(`[
${ writeTabs(numTap) }${ ratios.join(`,\n${ writeTabs(numTap) }`) }
${ writeTabs(numTap - 1) }]`);

  return ret.join(`,\n${ writeTabs(numTap - 1) }`);
}

/**
 * @notice write Crowdsale's constructor arguments in migration template
 * @param { Object } parseResult output of Parser.parse()
 * @param { Number } numTap indentation level
 */
export function writeConstructorArguments(parseResult, numTap = 2) {
  const {
    constructors,
    crowdsale: { parentsList },
  } = parseResult;

  const ret = [];

  parentsList.forEach((parentName) => {
    const args = constructors[ parentName ];

    // eslint-disable-next-line
    for (const [type, path, value = null] of args) {
      ret.push(`get(data, "${ path }"),`);
    }
  });

  return `${ ret.join(`\n${ writeTabs(numTap) }`) }`;
}

/**
 * @notice write Token's constructor arguments in migration template
 * @param { Object } input tokyo input parsed by tokyo-schema
 * @param { Number } numTap indentation level
 */
export function writeTokenArguments(input, numTap = 2) {
  const {
    token: {
      token_type: { is_minime },
    },
  } = input;

  if (!is_minime) {
    return []; // no arguments for Zeppelin's Mintable token
  }

  const ret = [
    "\"0x0000000000000000000000000000000000000000\"", // token factory
  ];

  return `${ ret.join(`,\n${ writeTabs(numTap) }`) }`;
}

export function wrapNewBigNumber(value) {
  return `new BigNumber("${ new BigNumber(value).toFixed(0) }")`;
}

export function convertDateString(v) {
  return moment.utc(v).unix();
}

export function convertAddress(s) {
  return `"${ s }"`;
}

export function convertBigNumber(b) {
  return b.toFixed(0);
}

export function convertString(str, quote = "\"") {
  return `${ quote }${ str }${ quote }`;
}

export function getTokenName(parseResult) {
  return `${ parseResult.meta.projectName }Token`;
}

export function getCrowdsaleName(parseResult) {
  return `${ parseResult.meta.projectName }Crowdsale`;
}

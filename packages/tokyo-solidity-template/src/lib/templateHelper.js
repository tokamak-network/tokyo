import BigNumber from "bignumber.js";
import moment from "moment";

export const serialize = JSON.stringify;

export function writeTabs(numTap) {
  return "  ".repeat(numTap);
}

export function getLastName(str, delimiter = ".") {
  return str.split(delimiter).slice(-1)[ 0 ];
}

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
      const value = withType ? argName : appendParseFunction(type, argName, startIndex + i, withType);

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
 * @param { object } constructors set of arguments of constructors
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
 * @notice write Locker's constructor arguments in migration file
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
 * @notice write Locker's constructor arguments in migration file
 */
export function writeLockerArguments(input, numTap = 3) {
  const ret = [];

  const addrs = [];
  const ratios = [];

  const {
    sale: { coeff },
    locker: { beneficiaries },
  } = input;

  ret.push("get(data, \"address.token\")");

  ret.push(wrapNewBigNumber(convertBigNumber(coeff)));

  beneficiaries.forEach(({ address }) => {
    addrs.push((convertAddress(address)));
  });

  ret.push(`[${ addrs.join(", ") }]`);

  beneficiaries.forEach(({ ratio }) => {
    ratios.push(wrapNewBigNumber(convertBigNumber(ratio)));
  });

  ret.push(`[${ ratios.join(", ") }]`);

  return ret.join(`,\n${ writeTabs(numTap) }`);
}

/**
 * @notice write Crowdsale's constructor arguments in migration file
 */
export function writeConstructorArguments(parseResult, numTap = 2) {
  const {
    constructors,
    crowdsale: { parentsList },
  } = parseResult;

  const ret = [];

  parentsList.forEach((parentName) => {
    const args = constructors[ parentName ];

    for (const [type, path, value = null] of args) {
      ret.push(`${ convertArgument(type, path, value) }, // ${ path }`);
    }
  });

  return `${ ret.join(`\n${ writeTabs(numTap) }`) }`;
}

/**
 * @notice write Token's constructor arguments in migration file
 */
export function writeTokenArguments(input, numTap = 2) {
  const {
    token: {
      token_type: { is_minime },
      token_name,
      token_symbol,
      decimals,
    },
  } = input;

  if (!is_minime) {
    return []; // no arguments for Zeppelin's Mintable token
  }

  const ret = [
    "\"0x00\"", // token factory
  ];

  return `${ ret.join(`,\n${ writeTabs(numTap) }`) }`;
}

export function wrapNewBigNumber(value) {
  return `new BigNumber("${ new BigNumber(value).toFixed(0) }")`;
}

/**
 * @notice convert argument info to javascript statement
 */
export function convertArgument(type, path, value = null) {
  if (!value) return `get(data, "${ path }")`;
  if (type === "address") return convertAddress(value);
  if (moment.isDate(value) || moment.isMoment(value)) return wrapNewBigNumber(convertDateString(value));
  return wrapNewBigNumber(value);
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

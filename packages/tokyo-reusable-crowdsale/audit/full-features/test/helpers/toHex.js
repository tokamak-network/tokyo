export default function toHex(v) {
  if (v instanceof Buffer) {
    return web3.toHex(`0x${ v.toString("hex") }`);
  }
  return web3.toHex(v);
}

export function toRightPaddedHex(v, len = 66) {
  return web3.padRight(toHex(v), len);
}

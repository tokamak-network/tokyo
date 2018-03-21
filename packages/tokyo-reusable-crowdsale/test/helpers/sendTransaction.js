export default function ({ from, to, value, ...opts }) {
  return new Promise((resolve, reject) => {
    try {
      resolve(web3.eth.sendTransaction({
        from,
        to,
        value,
        ...opts,
      }));
    } catch (e) {
      reject(e);
    }
  });
}

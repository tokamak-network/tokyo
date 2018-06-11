#!/usr/bin/env bash
ganache-cli -l 1000000000 --networkId 777 \
  --accounts 20 \
  --defaultBalanceEther 1000000 \
  --mnemonic=$MNEMONIC

#!/usr/bin/env bash

for file in ./*.json ; do
  name=`basename $file .json`
  ../../tokyo-solidity-template/bin.js -i $file -o $name
done

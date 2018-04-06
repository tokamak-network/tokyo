#!/usr/bin/env bash

for file in ./*.json ; do
  name=`basename $file .json`
  tokyo-solidity-template -i $file -o $name
done

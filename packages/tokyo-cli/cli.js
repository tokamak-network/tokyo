#!/usr/bin/env node
var Command = require("./lib/command");
var command = new Command(require("./lib/commands"));
var OS = require("os");
var version = require("./lib/version.js");
var TaskError = require("./lib/errors/taskerror");

var options = {
    logger: console
}


command.run(process.argv.slice(2), options, function(err){
    if(err){
        if(err instanceof TaskError){
            command.args.usage("Tokyo v"+(version.bundle||version.core)+" - a Solidity Code Generator for CrowdSale"
            + OS.EOL + OS.EOL
            + 'Usage: Tokyo <command> [options]').epilog("See more at http://github.com/tokyo/Readme.md").showHelp();
        }
    }
});



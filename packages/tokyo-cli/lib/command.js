var yargs = require("yargs");
var _ = require("lodash");
var TaskError = require("./errors/taskerror");

function Command(commands){
    this.commands = commands;
    var args  = yargs();

    Object.keys(this.commands).forEach(function(command){
        args = args.command(commands[command]);
    });

    this.args = args;

};

Command.prototype.getCommand = function(str, noAliases) {
    var argv = this.args.parse(str);
    if(argv._.length == 0){
        return null;
    }
    var input = argv._[0];
    var chosenCommand = null;
  
    if(this.commands[input]){
        chosenCommand = input;
    }
    var command = this.commands[chosenCommand];

    return {
        name: chosenCommand,
        argv: argv,
        command: command
    };
};

Command.prototype.run = function(command, options, callback) {
    if(typeof options == "function") {
        callback = options;
        options = {};
    }

    var result = this.getCommand(command, options.noAliases);

    if(result == null || result.command == null){
        return callback(new TaskError("Cannot find command: "+ command))
    }

    var argv = result.argv

    if(argv._){
        argv._.shift();
    }
    delete argv["$0"];

    var clone = {}
    

    Object.keys(options).forEach(function(key){
        try {
            clone[key] = options[key];
        }catch(e){

        }
    });
    options = _.extend(clone, argv)

    try {
        result.command.run(options, callback);
    } catch (err) {
        console.error(err);
    }

}

module.exports = Command;
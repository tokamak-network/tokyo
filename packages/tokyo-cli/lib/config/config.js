var fs = require("fs");
var path = require("path");
var findUp = require("find-up");
var DEFAULT_CONFIG_FILENAME = "truffle.js";
var BACKUP_CONFIG_FILENAME = "truffle-config.js";

function Config(truffle_directory, working_directory, network){
    var self = this;

    this._values = {
        truffle_directory: truffle_directory || path.resolve(path.join(__dirname, "../../")),
        working_directory: working_directory || process.cwd()
    }
    
}

Config.prototype.nomalize = function(obj) {
    var clone = {};
    Object.keys(obj).forEach(function(key){
        try{
            clone[key] = obj[key];
        }catch (e) {
            //Do nothing with values that throw.
        }
    });
    return clone;
};

Config.prototype.merge = function(obj){
    var self = this;
    var clone = this.nomalize(obj)
    Object.keys(obj).forEach(function(key){
        try{
            self[key] = clone[key];
        }catch (e) {

        }
    });
    return this;
};

Config.detect = function(options, filename){
    var search
    (!filename)
    ? search = [DEFAULT_CONFIG_FILENAME, BACKUP_CONFIG_FILENAME]
    : search = filename;

    var file = findUp.sync(search, {cwd: options.working_directory || options.workingDirectory})
    // console.log(search)
    if(file == null){
    throw console.error("Could not find truffle configuration file. Check your project folder whether it's a truffle project folder or not.")
    }
    return this.load(file, options);
}

Config.load = function(file, options) {
    var config = new Config();
    config.working_directory = path.dirname(path.resolve(file));

    config.merge(options);
    // console.log(config)

    return config;
}

module.exports = Config;
var command={
    command: 'flatten',
    description: "flattening code for verify code on etherscan ",
    run:function (options, done){
        var TaskError = require('../errors/taskerror')
        var path =  require('path');
        var Config = require("../config/Config");
        var config = Config.detect(options);
        var flatten = require('tokyo-truffle-flattener');
        if(!(config['input'] || config['i']))
        {
            return done(console.error("Cannot find input"))
        }
        
        var input_path = path.relative(config.working_directory, path.resolve(config.input||config.i));
        input_path = path.resolve(config.working_directory,input_path);

        try{
            flatten(input_path);
        }catch(err){
            console.err(err);
        }
    }
};

module.exports = command;
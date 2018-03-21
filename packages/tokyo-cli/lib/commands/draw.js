var command={
    command: 'draw',
    description: 'draw diagram',
    run:function (options, done){
        var TaskError = require('../errors/taskerror')
        var path =  require('path');
        var Config = require("../config/Config");
        var config = Config.detect(options);
        var diagram = require("tokyo-diagram-generator");

        console.log("draw")
        
        if(!(config['input'] || config['i']))
        {
            return done(console.error("Cannot find input"))
        }
        var input_path = path.relative(config.working_directory, path.resolve(config.input||config.i));
        input_path = path.resolve(config.working_directory,input_path);

        diagram(input_path, config.simple);


    }
};

module.exports = command;
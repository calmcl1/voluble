const winston = require('winston')
console.log(winston.level)

var PluginManager = {
    plugin_dir: "",
    totalPluginsList: [],
    availablePlugins: [],
}

PluginManager.initAllPlugins = function (plugin_dir) {
    winston.debug("Attempting to load plugins")
    this.plugin_dir = plugin_dir
}

PluginManager.loadAllPlugins = function () {
    // Cycle through plugin directory and try to init all available plugins
    let esendexPlugin = require("../plugins/esendex/plugin")
    this.availablePlugins.push(esendexPlugin)

    try {
        this.availablePlugins.forEach(function (plugin) {
            plugin.init()
        });
    } catch (e) {
        console.log(e)
    }
}

PluginManager.shutdownAllPlugins = function () {
    try{
        this.availablePlugins.forEach(function(plugin){
            plugin.shutdown()
        })
    } catch (e) {
        console.log(e)
    }
}

module.exports = PluginManager
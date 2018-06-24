import * as plugin_base from '../plugin_base'
var manifest = require('./manifest.json')

class MyExamplePlugin extends plugin_base.voluble_plugin{
    api_key: string | undefined
    api_secret: string | undefined

    constructor(){
        super()
        this.name = manifest.plugin_name
        this.description = manifest.plugin_description
    
        this.api_key = manifest.data_tables.custom['api_key']
        this.api_secret = manifest.data_tables.custom['api_secret']
    }

    init():boolean{
        return true
    }

    shutdown():boolean{
        return true
    }

    send_message(message: plugin_base.messageInstance, contact:plugin_base.contactInstance){
        this.message_state_update(message, "MSG_FAILED")
    }
}

var createPlugin = function () {
    return new MyExamplePlugin()
}

module.exports = createPlugin;

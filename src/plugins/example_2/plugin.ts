import * as plugin_base from '../plugin_base'
var manifest = require('./manifest.json')

class MyExamplePlugin2 extends plugin_base.voluble_plugin{
    api_key: string | undefined
    api_secret: string | undefined

    constructor(){
        super(manifest)
        this.api_key = manifest.data_tables.custom['api_key']
        this.api_secret = manifest.data_tables.custom['api_secret']
    }

    init():boolean{
        return true
    }

    send_message(message: plugin_base.messageInstance, contact:plugin_base.contactInstance){
        console.log(`EXAMPLE: Sending message ${message.id} to contact ${contact.id}`)
        //this.message_state_update(message, "MSG_FAILED")
        return false
    }
}

var createPlugin = function () {
    return new MyExamplePlugin2()
}

module.exports = createPlugin;
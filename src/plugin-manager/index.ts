import * as fs from 'fs'
import * as path from 'path'
const winston = require('winston')
import * as Promise from "bluebird"
const errs = require('common-errors')

import { voluble_plugin } from '../plugins/plugin_base'
import * as db from '../models'
import { QueueManager } from '../queue-manager';
const voluble_errors = require('../voluble-errors')

interface IPluginDirectoryMap {
    subdirectory: string,
    plugin: voluble_plugin
}

const PluginImportFailedError = errs.helpers.generateClass('PluginImportFailedError')

/**
 * The PluginManager keeps track of all loaded plugins, as well as initializing, loading and shutting down all detected plugins.
 * It also handles all plugin- and service-related operations.
 */
export namespace PluginManager {
    let __plugin_dir:string = path.resolve(path.join(__dirname, "../plugins"))

    export function getPluginById(id: number): Promise<voluble_plugin | null> {
        /** Find a service relating to a given plugin by it's ID.
         * If a service is found, create a new instance of that plugin and return it
         */
        return db.models.Service.findById(id)
            .then(function (service) {
                if (service) {
                    try {
                        let plugin_directory_name = path.join(__plugin_dir, service.directory_name, "plugin.js")
                        winston.debug("Importing plugin from:" + plugin_directory_name)
                        let p: voluble_plugin = require(plugin_directory_name)()
                        return Promise.resolve(p)
                    } catch (e) {
                        errs.log(e, `Could not import plugin in directory '${service.directory_name}': ${e.message}`)
                        return Promise.reject(new PluginImportFailedError(`Failed to import plugin in directory ${service.directory_name}`))
                    }
                } else {
                    return Promise.reject(new errs.NotFoundError(`Plugin with ID ${id} cannot be found`))
                }
            })
    }

    function discoverPlugins(directory: string): Promise<IPluginDirectoryMap[]> {
        // Cycle through plugin directory and return a list of all of the valid plugins

        // Get a list of all of the directories under the plugin directory
        let plugin_subdirs = fs.readdirSync(directory).filter(function (element) {
            let plugin_subdir_fullpath = path.join(directory, element)

            if (fs.statSync(plugin_subdir_fullpath).isDirectory() && fs.existsSync(path.join(plugin_subdir_fullpath, "plugin.js"))) { return true }
            else { return false }
        })

        winston.debug("Found plugins at:\n\t" + plugin_subdirs)

        // Create a list of all the plugins we're able to import
        let plugin_list: IPluginDirectoryMap[] = []
        plugin_subdirs.forEach(function (plugin_subdir_rel) {
            let plugin_file_abs = path.join(directory, plugin_subdir_rel, "plugin.js")
            try {
                let plug_obj: voluble_plugin = require(plugin_file_abs)()
                winston.info("Loaded plugin:\n\t" + plug_obj.name)
                let p: IPluginDirectoryMap = { plugin: plug_obj, subdirectory: plugin_subdir_rel }
                plugin_list.push(p)
            } catch (e) {
                errs.log(e, `Could not load plugin in subdirectory ${plugin_subdir_rel}: ${e.message}`)
            }
        })
        return Promise.resolve(plugin_list)
    }

    function synchronizePluginDatabase(plugin_list: IPluginDirectoryMap[]) {
        return Promise.mapSeries(plugin_list, function (plugin_directory_map) {
            return db.models.Service.findOne({
                where: { 'directory_name': plugin_directory_map.subdirectory }
            }).then(function (service) {
                if (!service) {
                    // This plugin doesn't exist in the database, so let's add an entry for it
                    return db.models.Service.create({
                        'name': plugin_directory_map.plugin.name,
                        'directory_name': plugin_directory_map.subdirectory,
                    })
                } else {
                    return service
                }
            }).then(function (service) {
                // Add event listeners, so Voluble can react to message state changes
                plugin_directory_map.plugin._eventEmitter.on('message-state-update', function (msg: db.MessageInstance, message_state: string) {
                    QueueManager.addMessageStateUpdateRequest(msg.id, message_state)
                })

            }).then(function () {
                return true
            })
        }).then(function () {
            return Promise.resolve(plugin_list)
        })
    }

    /**
 * Set the plugin directory and load all of the plugins in it.
 * @param {string} plugin_dir The path to the directory containing the plugins that Voluble should use.
 */
    export function initAllPlugins() {
        winston.debug("Attempting to load plugins from " + __plugin_dir)
        winston.info("Loading plugins from\n\t" + __plugin_dir)
        return discoverPlugins(__plugin_dir)
            .then(function (plugin_list) {
                return synchronizePluginDatabase(plugin_list)
            })
            .then(function (plugin_list) {
                return Promise.each(plugin_list, function (plugin) {
                    return createPluginDataTables(plugin)
                })
            })
    }

    function createPluginDataTables(plugin_dir_map: IPluginDirectoryMap): Promise<any[]> {
        if (plugin_dir_map.plugin.data_tables) {
            return Promise.map(Object.keys(plugin_dir_map.plugin.data_tables), function (table) {
                return db.sequelize.define(`${plugin_dir_map.subdirectory}_${table}`, {})
            })
        } else {
            return Promise.resolve([])
        }
    }

    /**
     * Gets the list of services from the DB with their status.
     * @returns {array <Sequelize.Plugin>} An array of Sequelize rows representing loaded services.
     */

    export function getAllServices(): Promise<db.ServiceInstance[]> {
        return db.models.Service.findAll()
    }

    /**
     * Gets a single service from the DB by its' ID.
     * @param {Number} id The ID of the service to find.
     * @returns {Sequelize.Plugin} The row representing the plugin with a given ID.
     */
    export function getServiceById(id: number): Promise<db.ServiceInstance | null> {
        return db.models.Service.findById(id)
        // TODO: Validate plugin exists, fail otherwise
    }
}
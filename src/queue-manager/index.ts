import { EventEmitter } from 'events';
import * as redis from 'redis';
import * as RedisSMQ from 'rsmq';
import * as winston from 'winston';
import { Message } from '../models/message';

let logger = winston.loggers.get(process.mainModule.filename).child({ module: 'QueueMgr' })

export class RMQWorker extends EventEmitter {
    private queue_name: string
    private continue_check: boolean
    private rsmq: RedisSMQ

    constructor(queue_name: string, rsmq: RedisSMQ) {
        super()
        this.continue_check = false
        this.queue_name = queue_name
        this.rsmq = rsmq

        this.checkQueueExists(queue_name)
            .then((queue_exists) => {
                if (!queue_exists) {
                    this.rsmq.createQueueAsync({
                        qname: queue_name
                    })
                }
            })
            .then(() => {
                return this
            })
    }

    public async start() {
        this.continue_check = true
        while (this.continue_check) {
            await this.rsmq.receiveMessageAsync({ qname: this.queue_name })
                .then((msg) => {
                    if ("id" in msg) {
                        this.emit('message', msg.message, () => { this.rsmq.deleteMessageAsync({ id: msg.id, qname: this.queue_name }) }, msg.id)
                    }
                })
        }
    }

    public stop(): void {
        this.continue_check = false
    }

    private checkQueueExists(queue_name: string) {
        return this.rsmq.listQueuesAsync()
            .then((queues) => {
                return queues.includes(queue_name)
            })
    }
}

export namespace QueueManager {
    let queue_list = ["message-send", "message-state-update", "message-sent-time-update", "message-sent-service-update", "message-recv"]

    export interface MessageReceivedRequest {
        request_data: any,
        service_id: string
    }

    let client: redis.RedisClient;
    if (process.env.REDISTOGO_URL) {
        let rtg = require("url").parse(process.env.REDISTOGO_URL);
        client = redis.createClient(rtg.port, rtg.hostname)
        client.auth(rtg.auth.split(":")[1]);
    } else {
        client = redis.createClient()//{ host: "127.0.0.1" })
    }
    let rsmq = new RedisSMQ({ client: client })


    export function addMessageToSendRequest(message: Message) {
        logger.debug("Sending message with ID " + message.id)
        rsmq.sendMessage({
            qname: "message-send",
            message: message.id
        }, function (err, resp) {
            if (resp) {
                logger.info("Added send request for message " + message.id)
                return true
            } else {
                logger.error(err)
                throw err
            }
        })
    }

    export function addMessageStateUpdateRequest(message_id: string, message_state: string) {
        let q_msg = { message_id: message_id, status: message_state }
        rsmq.sendMessage({
            qname: "message-state-update",
            message: JSON.stringify(q_msg)
        }, function (err, resp) {
            if (resp) {
                return true
            } else {
                logger.error(err)
                throw err
            }
        })
    }

    export function addMessageSentTimeUpdateRequest(message_id: string, message_unix_timestamp_ms: number) {
        let q_msg = { message_id: message_id, timestamp: message_unix_timestamp_ms }
        rsmq.sendMessage({
            qname: "message-sent-time-update", message: JSON.stringify(q_msg)
        }, (err, resp) => {
            if (resp) { return true }
            else { logger.error(err); throw err }
        })
    }

    export function addMessageSentServiceUpdateRequest(message_id: string, message_sent_service_id: string) {
        let q_msg = { message_id: message_id, sent_service: message_sent_service_id }
        rsmq.sendMessage({
            qname: "message-sent-service-update", message: JSON.stringify(q_msg)
        }, (err, resp) => {
            if (resp) { return true }
            else { logger.error(err); throw err }
        })
    }

    export async function addMessageReceivedRequest(request_data: any, service_id: string): Promise<string> {
        let q_msg: MessageReceivedRequest = { request_data: request_data, service_id: service_id }
        logger.debug(`Sending queue message`)
        return rsmq.sendMessageAsync({ qname: 'message-recv', message: JSON.stringify(q_msg) })
            .catch(e => {
                logger.error(e)
                throw e
            })

    }

    export function createQueues() {
        logger.debug("Loading queue manager")
        return rsmq.listQueuesAsync()
            .then((queues) => {
                return queue_list.filter((required_q) => {
                    return !queues.includes(required_q)
                })
            })
            .then(queues_to_create => {
                if (!queues_to_create) { logger.info('All queues already created'); return }
                return Promise.all(queues_to_create.map((queue_to_create) => {
                    return rsmq.createQueueAsync({ qname: queue_to_create })
                        .catch(e => { return e })
                }))
            })
            .then((vals) => {
                vals.forEach(val => {
                    if (val instanceof Error) { throw val }
                });
            })
    }

    export function shutdownQueues() {
        rsmq.quit()
        client.end(process.env.NODE_ENV != "production")
    }

}
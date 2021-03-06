import MessageService from '@js/Services/MessageService';
import QueueItem from '@js/Models/Queue/QueueItem';
import EventQueue from '@js/Event/EventQueue';

export default class Queue {

    /**
     * @return {EventQueue}
     */
    get queue() {
        return this._event;
    }

    /**
     * @returns {Number}
     */
    get length() {
        return this._count;
    }

    /**
     *
     * @param {String} name
     * @param {(String|null)} [area=null]
     * @param {QueueItem.constructor} [type=QueueItem]
     */
    constructor(name, area = null, type = QueueItem) {
        this._name = name;
        this._items = {};
        this._count = 0;
        this._type = type;
        this._area = area;
        this._event = new EventQueue();

        MessageService.listen(
            'queue.fetch',
            (m, r) => { this._fetchMessages(m, r); }
        );

        MessageService.listen(
            'queue.consume',
            (m, r) => { this._consumeMessages(m, r); }
        );
    }

    /**
     * @return {Boolean}
     */
    hasItems() {
        return this._count !== 0;
    }

    /**
     * @return {QueueItem[]}
     */
    getItems() {
        let items = [];
        for(let id in this._items) {
            if(!this._items.hasOwnProperty(id)) continue;
            items.push(this._items[id].item);
        }

        return items;
    }

    /**
     * @param {QueueItem|{}} item
     * @returns {Promise<QueueItem>}
     */
    push(item) {
        item = this._validateItem(item);

        this._count++;
        return new Promise((resolve, reject) => {
            this._items[item.getId()] = {
                item,
                resolve,
                reject
            };

            this._sendItem(item);
        });
    }

    /**
     * @param {(String|QueueItem)} id
     */
    remove(id) {
        let itemId = typeof id === 'string' ? id:id.getId();
        if(!this._items.hasOwnProperty(itemId)) return;
        let {item, resolve, reject} = this._items[itemId];
        delete this._items[itemId];
        this._count--;

        item.setResult(null);
        item.setSuccess(false);
        item.setCancelled(true);
        reject(item);
    }

    /**
     * @param {QueueItem} item
     */
    consume(item) {
        let data = item.toJSON();

        this._consumeItem(data);
    }

    /**
     * @param {Object} data
     * @returns {QueueItem}
     */
    makeItem(data) {
        if(!data.hasOwnProperty('task')) {
            data = {task: data};
        }

        return new this._type(data);
    }

    /**
     * @param {Message} message
     * @param {Message} reply
     * @private
     */
    _fetchMessages(message, reply) {
        if(message.getPayload().name !== this._name) return;

        let items = this.getItems();

        reply
            .setType('queue.items')
            .setPayload(
                {
                    name: this._name,
                    items
                }
            );
    }

    /**
     * @param {Message} message
     * @param {Message} reply
     * @private
     */
    _consumeMessages(message, reply) {
        if(message.getPayload().name !== this._name) return;
        let items = message.getPayload().items;

        for(let data of items) {
            this._consumeItem(data);
        }
    }

    /**
     * @param {Object} data
     * @private
     */
    _consumeItem(data) {
        if(!this._items.hasOwnProperty(data.id)) return;

        let {item, resolve, reject} = this._items[data.id];
        item.setResult(data.result);
        item.setSuccess(data.success);

        if(item.getSuccess()) {
            if(resolve) resolve(item);
        } else if(reject) {
            reject(item);
        }

        this._count--;
        delete this._items[data.id];
    }

    /**
     * @param {QueueItem} item
     * @private
     */
    _sendItem(item) {
        let data = [item.toJSON()];

        MessageService.send(
            {
                type    : 'queue.items',
                payload : {
                    name : this._name,
                    items: data
                },
                receiver: this._area
            }
        );

        this._event.emit(data);
    }

    /**
     *
     * @param {QueueItem|{}} item
     * @returns {QueueItem}
     * @protected
     */
    _validateItem(item) {
        if(item instanceof this._type) {
            return item;
        }

        return this.makeItem(item);
    }
}
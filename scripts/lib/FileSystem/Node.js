define(function (require) {
    "use strict";

    const Errors = require('Errors');

    function Node(key, properties) {

        if (!(this instanceof Node)) {
            throw new TypeError("Node constructor cannot be called as a function.");
        }

        this.key = key;
        this._parent = null;
        this._children = [];
    
        properties = properties && typeof properties === "object" ? properties : {};
        for (let i in properties) {
            this[i] = properties[i];
        }
    }

    Node.prototype = {

        constructor: Node,

        insert: function(child) {
            this._children.push(child);
            child.parent = this;
        },
    
        delete: function(child) {
            this._children.splice(this._children.indexOf(child), 1);
        },
    
        search: function(key) {
            let results = this.key.match("^" + key.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$") ? [this] : [];
            for (let i in this._children) {
                results = results.concat(this._children[i].search(key));
            }
            return results;
        },
    
        find: function(key) {
            let results = [];
            for (let i in this._children) {
                if (this._children[i].key.match( "^" + key.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$")) {
                    results.push(this._children[i]);
                }
            }
            return results;
        }

    }

    return Node;

});
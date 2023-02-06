
define(function () {
    "use strict";

    const Errors = require('Errors');
    const Structure = require('Scructure');

    function SystemBin() {
        if (!(this instanceof SystemBin)) {
            throw new TypeError("SystemBin constructor cannot be called as a function.");
        }

        this.tree = new Structure();
        this.tree.insert("", null, {
            type: "directory"
        });
        this.pointer = this.tree.root;
    }

    SystemBin.prototype = {
    	
        constructor: SystemBin,
    	
        mkdir: function (path) {
            if (path === undefined)
            {
                throw new TypeError("Missing argument: path");
            }
            let segments = path.replace(/\/+$/g, "").split("/");
            let parent = self._resolve_path(
                segments.slice(0, segments.length - 1).join("/")
            );
            let name = segments[segments.length - 1];
            if (parent.find(name).length)
            {
                throw new Error("Name already taken: " + name);
            }
            this.tree.insert(name, parent, {
                type: "directory"
            });
        },
    
        rmdir: function (path) {
            if (path === undefined)
            {
                throw new TypeError("Missing argument: path");
            }
            let node = self._resolve_path(path.replace(/\/+$/g, ""));
            if (node === this.tree.root)
            {
                throw new Error("You cannot delete the root directory.");
            } else if (node.type !== "directory")
            {
                throw new Error("Not a directory: " + node.key);
            }
            this.tree.delete(node);
            let current_path = self._absolute_path(this.pointer);
            let node_path = self._absolute_path(node);
            if (node_path.match("^" + current_path) && current_path.length)
            {
                this.pointer = node.parent;
            }
        },
    
        cd: function (path) {
            if (path === undefined)
            {
                throw new TypeError("Missing argument: path");
            }
            this.pointer = self._resolve_path(path);
            return this.pointer;
        },
    
        cat: function (mode, path, contents) {
            if (path === undefined)
            {
                throw new TypeError("Missing argument: path");
            }
            let segments = path.replace(/\/+$/g, "").split("/");
            let parent = self._resolve_path(segments.slice(0, segments.length - 1).join("/"));
            let name = segments[segments.length - 1];
            let node = parent.find(name)[0];
            if (node && node.type !== "file")
            {
                throw new Error("Not a file: " + path);
            } else if (mode.length)
            {
                if (node === undefined)
                {
                    node = this.tree.insert(name, parent, {
                        type: "file",
                        lastModified: new Date().getTime(),
                        size: "",
                        contents: ""
                    });
                }
                node.size = mode === ">" ? new Blob([contents]).size : new Blob([node.contents + contents]).size;
                node.contents = mode === ">" ? contents : node.contents + contents;
            } else
            {
                if (node === undefined)
                {
                    throw new Error("File not found: " + path);
                }
                return node.contents;
            }
        },
    
        rm: function (path) {
            if (path === undefined)
            {
                throw new TypeError("Missing argument: path");
            }
            let node = self._resolve_path(path.replace(/\/+$/g, ""));
            if (node.type !== "file")
            {
                throw new Error("Not a file: " + node.key);
            }
            this.tree.delete(node);
        },
    
        rn: function (path, name) {
            if (path === undefined)
            {
                throw new TypeError("Missing argument: path");
            } else if (name === undefined)
            {
                throw new TypeError("Missing argument: name");
            }
            let node = self._resolve_path(path);
            if (node === this.tree.root)
            {
                throw new Error("You cannot rename the root directory.");
            }
            let search = node.parent.find(name)[0];
            if (search && search.type === node.type)
            {
                throw new Error("Rename failed. Name already taken.");
            }
            node.key = name;
        },
    
        cp: function (target, destination) {
            if (target === undefined)
            {
                throw new TypeError("Missing argument: target");
            } else if (destination === undefined)
            {
                throw new TypeError("Missing argument: destination");
            }
            target = typeof target === "object" ? target : self._resolve_path(target);
            destination = typeof destination === "object" ? destination : self._resolve_path(destination);
            let properties = {
                type: target.type
            };
            if (properties.type === "file")
            {
                properties.contents = target.contents;
                properties.lastModified = target.lastMoodified;
                properties.size = target.size;
            }
            let node = this.tree.insert(target.key, destination, properties);
            for (let i = 0; i < target.children.length; i++)
            {
                self.cp(target.children[i], node);
            }
            return node;
        },
    
        mv: function (target, destination) {
            if (target === undefined)
            {
                throw new TypeError("Missing argument: target");
            } else if (destination === undefined)
            {
                throw new TypeError("Missing argument: destination");
            }
            target = typeof target === "object" ? target : self._resolve_path(target);
            destination = typeof destination === "object" ? destination : self._resolve_path(destination);
            this.tree.delete(target);
            return self.cp.call(this, target, destination);
        },
    
        ls: function (path) {
            let node = path === undefined ? this.pointer : self._resolve_path(path);
            if (node.type === "directory")
            {
                return node.children;
            }
            throw new Error("Not a directory: " + path);
        },
    
        whereis: function (query) {
            if (query === undefined)
            {
                throw new TypeError("Missing argument: query");
            }
            return this.tree.search(query);
        },
    
        _resolve_path: function (path) {
            path = path.match("^/") ? path : "./" + path;
            path = path.split("/");
            let parent = path[0].length ? this.pointer : this.tree.root;
            for (let i = !path[0].length ? 1 : 0; i < path.length; i++)
            {
                if (path[i] === "..")
                {
                    if (parent === this.tree.root)
                    {
                        throw new Error("No more directories beyond root directory.");
                    }
                    parent = parent.parent;
                } else if (path[i] !== "." && path[i].length)
                {
                    parent = parent.find(path[i])[0];
                    if (parent === undefined)
                    {
                        throw new Error("Path not found: " + path.slice(0, i + 1).join("/"));
                    }
                }
            }
            return parent;
        },
    
        _absolute_path: function (node) {
            let path = [];
            while (node !== null)
            {
                path.unshift(node.key);
                node = node.parent;
            }
            return path.join("/");
        }
    }

    return SystemBin;

});

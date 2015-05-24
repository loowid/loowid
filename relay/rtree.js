'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * RTree schema
 */

var RTreeSchema = new Schema ({
	room: String,
	child: String,
	parent: String
});

var treeQueue = {};

RTreeSchema.statics = {
		toRemoveQueue: function(roomId,id,cb) {
			this.addItemToQueue(roomId,id,'del.',cb);
		},
		toAddQueue: function(roomId,id,cb) {
			this.addItemToQueue(roomId,id,'add.',cb);
		},
		addItemToQueue: function(roomId,id,prefix,cb) {
			if (!treeQueue.hasOwnProperty(prefix+roomId)) {
				treeQueue[prefix+roomId] = [];
			}
			treeQueue[prefix+roomId].push({'id':id,'callback':cb});
		},
		// Add node to circular tree
		newNodeTree: function(roomId,obj,cb) {
			this.find({'room':roomId}).sort({'child':1}).exec(function(err,nodes){
				if (nodes.length === 0) {
					cb({'room':roomId,'child':obj.id,'parent':null});
				} else {
					for (var i=0; i<nodes.length; i+=1) {
						if (nodes[i].child > obj.id) {
							var p = nodes[i].parent;
							nodes[i].parent = obj.id;
							var un = []; un.push(nodes[i]);
							cb({'room':roomId,'child':obj.id,'parent':p},un,obj.callback);
							return;
						}
					}
					cb({'room':roomId,'child':obj.id,'parent':nodes[nodes.length-1].child},[],obj.callback);
				}
			});
		},
		// Remove node from circular tree
		deleteNodeTree: function(roomId,obj,cb) {
			this.find({'$or':[{'room':roomId,'child':obj.id},{'room':roomId,'parent':obj.id}]}).exec(function(err,nodes){
				if (nodes.length>0) {
					var dn = null; 
					var un = [];
					for (var i=0; i<nodes.length; i+=1) {
						if (nodes[i].child === obj.id) {
							dn = nodes[i];
						}
					}
					for (var j=0; j<nodes.length; j+=1) {
						if (nodes[j].parent === obj.id) {
							nodes[j].parent = dn.parent;
							un.push(nodes[j]);
						}
					}
					cb(dn,un,obj.callback);
				}
			});
		},
		// Find childs of origin
		findTargets: function(roomId,origin,cb) {
			this.find({'$or':[{'room':roomId,'parent':origin},{'room':roomId,'parent':null}]}).exec(cb);
		},
		// Find last child
		findLast: function(roomId,cb) {
			this.find({'room':roomId}).sort({'child':-1}).limit(1).exec(cb);
		}
};

var RTree = mongoose.model('RTree', RTreeSchema);

var updateNodes = function(parent,unodes,cb) {
	var callback = function(){ if (cb) { cb(parent); } };
	if (unodes && unodes.length>0) {
		for (var j=0; j<unodes.length; j+=1) {
			unodes[j].save(callback);
		}
	} else {
		callback();
	}
};

var addNodes = function(node,unodes,cb){
	var newNode = new RTree(node);
	newNode.save(function(){
		updateNodes(newNode.parent,unodes,cb);
	});
};

var removeNodes = function(node,unodes,cb){
	node.remove(function(){
		updateNodes(node.parent,unodes,cb);
	});
};

// Process One Queue Element every second
setInterval(function(){
	for (var key in treeQueue) {
		if (treeQueue[key].length>0) {
			var obj = treeQueue[key].shift();
			if (key.indexOf('add.')===0) {
				// Add node to tree
				RTree.newNodeTree(key.substring(4),obj,addNodes);
			} else {
				// Remove node from tree
				RTree.deleteNodeTree(key.substring(4),obj,removeNodes);
			}
		} else {
			delete treeQueue[key];
		}
	}
},1000);
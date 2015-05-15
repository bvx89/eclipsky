var connector = (function() {
	'use strict';

	var webSocket = null,
		connectionClosed = true,
	
		// Set logging
		logging = false,
		c = (logging ? console : {log : function(){}}),
		
		// All subscribers need to implement a 'notify()'-function
		subscribers = [], 

		url = null,
		postfix = "&format=json",
		
		queue = [];
	
	// Publish to all listeners
	function publish(data) {
		c.log('publishing: ', data);
		for (var i = subscribers.length - 1; i >= 0; i--) {
			subscribers[i].notify(data);
		}
	}
	
	// Add to the queue of requests to send
	function push(data) {
		if (queue.length === 0) {
			queue.push(data);
			pop();
		} else {
			queue.push(data);
		}
		
	}
	
	// Pop from the queue and perform a send request
	function pop() {
		var data;
		if (queue.length > 0) {
			data = queue.shift();
		} else {
			return;
		}
		
		c.log('Sending data: ', data);
		if (webSocket && webSocket.readyState === webSocket.OPEN) {
			sendWSdata(data);
		} else {
			sendXHRdata(data);
		}
	}
	
	function sendWSdata(data) {
		if (connectionClosed) {
			initializeWebsocket(url);
		}
		var wsData = data.op + ' ' + data.resourceRef +
					(data.body !== undefined ? "\n" + data.body : '');
		webSocket.send(wsData);
	}
	
	// Private function for sending XHR requests
	function sendXHRdata(data) {
		$.ajax({
			type: 'POST',
			url: url + postfix,
			data: data,
			dataType: 'json'
		}).done(function(response) {
			pop();
			publish(response);
		});		
	}
	
	
	function initializeWebsocket(url) {
		var link = document.createElement('a');
		
		link.href = url;
		link.protocol = "ws";
	    webSocket = new WebSocket(link.href, "json");
	    connectionClosed = false;

	    webSocket.onerror = function(event) {
			// TODO: Reconnect?
	    	c.log('ws error', event);
	    	// publish(event);
	    };

	    webSocket.onclose = function(event) {
	    	connectionClosed = true;
	        c.log('ws close', event);

	        var response = {type : 'connectionClosed', event: event};
	        publish(response);
	    };

	    webSocket.onmessage = function(event) {
			pop();
			var data = JSON.parse(event.data);
	    	publish(data);
	    };
	}
	
	
	return {
		init : function(config) {
			url = config.url;
			if (window.WebSocket) {
				initializeWebsocket(url);
			}
		},

		send : function(operation, resource, content) {
			push({op: operation, resourceRef: resource, body: content});
		},
		
		subscribe : function(subscriber) {
			subscribers.push(subscriber);
		},
		
		unsubscribe : function(subscriber) {
			for (var i = subscribers.length - 1; i >= 0; i--) {
				if (subscribers[i] === subscriber) {
					subscribers.splice(i, 1);
					return;
				}
			}
		},
		
		// Emptying the queue
		invalidate : function() {
			queue = [];
		},

		reconnect : function() {
			initializeWebsocket(url);
		},

		usesWebSocket : function() {
			return webSocket !== null;
		}
	};
	
})();
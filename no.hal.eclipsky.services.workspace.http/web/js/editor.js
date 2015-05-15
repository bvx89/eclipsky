var connector = connector || {};

var editor = (function(ace, con, cookies) {
	'use strict';

	var _editor,
		resources,
		projectId,
		resourceName,
		currentId = -1,

		RUN_KEY = 'R',
	   
		completionCallback = null,
		offset = -1,

		saveDelay = 500,
		saveTimer = null,
		switchingResource = false,
		
		logging = false,
		c = (logging ? console : {log : function(){}});
   
	function initialize(editorId) {
		// Configure the basics
		ace.require("ace/ext/language_tools"); // Required for auto completion
		_editor = ace.edit(editorId);
		_editor.setTheme("ace/theme/monokai");
	   
		// Enable auto completion
		_editor.completers = [createCompleter()];
		_editor.setOptions({
		  enableBasicAutocompletion: true
		});
	   
		// Add run command
		_editor.commands.addCommand({
			name: 'run',
			readOnly: false,
			bindKey: { win: 'Ctrl-Alt-'+RUN_KEY, mac: 'Command-Alt-'+RUN_KEY },
			exec: run
		});
	   
		// Custom event for when contents change
		_editor.getSession().on('change', function(event) {
			if (switchingResource) {
				return;
			}
			var data = event.data;

			if (data.action === 'insertText' || data.action === 'removeText') {
				event.delay = true;
				changed(event);
			}
		});
		
		return _editor;
	}
       
	/*
	 * Sets a delay of 'saveDelay' after last typing
	 * before sending all content to the connector
	 */
	function changed(event) {
		if (event.delay) {
			if (saveTimer !== null) {
				clearTimeout(saveTimer);
			}
			event.delay = false;
			con.invalidate();
			saveTimer = setTimeout(function() {changed(event);}, saveDelay);
		} else {
			saveTimer = null;
			sendAllContent();
		}
		
	}

	function sendAllContent(content) {
		content = content || _editor.getSession().getValue();
		con.send('update', resourceName, content);
	}
   
   
	function run(ev) {		
		con.send('run', resourceName);
	}

	function test(ev) {		
		con.send('test', resourceName);
	}
   
   
	/**
	*	Creates the completer that will return proposals
	*/
	function createCompleter(){
		return {
			getCompletions: function(currEditor, session, pos, prefix, callback) {
				var content = session.getValue();
				offset = calculateOffset(content, pos);
				
				// Save current state to get accurate completions
				if (saveTimer) {
					clearTimeout(saveTimer);
					sendAllContent(content);
					_editor.setReadOnly(true);
				} else {
					_editor.setReadOnly(true);
					con.send('completion', resourceName, offset);
				}
									   
				completionCallback = callback;
			}
		};
	}
   
	/**
	*	Handling responses from requests to the server
	*/
	function handleResponse(data) {
		var type;
		if (data instanceof Array) {
			if (data.length === 0) {
				_editor.getSession().clearAnnotations();
				if (_editor.getReadOnly()) {
					_editor.setReadOnly(false);
				}
				return;
			}
			type = data[0].type;
			switch(type) {
			case 'problem':
				updateMarkers(data);
				if (_editor.getReadOnly()) {
					con.send('completion', resourceName, offset);
				}
				break;
			case 'completion':
				completionCallback(null, data);
				completionCallback = null;
				_editor.setReadOnly(false);
				break;
			case 'test':
				resources[currentId].testResults = {
					stamp : new Date(), 
					tests : data
				};
				break;
			default:
				break;
			}
		} else {			
			type = data.type;
			switch(type) {
			case 'refresh':
				// Ignore other resources
				if (data.resource !== resourceName) {
					return;
				}

				// Get the most appropriate position
				var newPos;
				if (switchingResource) {
					newPos = resources[currentId].pos;
				} else {
					newPos = _editor.getCursorPosition();
				}

				// Load the current session and replace content
				switchingResource = true;
				var session = _editor.getSession();
				session.setValue(data.code);
				session.setMode("ace/mode/" + resources[currentId].language);
				_editor.moveCursorToPosition(newPos);
				_editor.focus();

				switchingResource = false;
				break;
			case 'close':
				refreshResource();
				break;
			case 'connectionClosed':
				if (_editor.getReadOnly()) {
					_editor.setReadOnly(false);
				}
				break;
			default:
				break;
			}
		}
	}
   
	function calculateOffset(code, position){
		var lines = code.split("\n");
		var offset = 0;
		for(var i = 0; i < position.row; i++){
			offset += lines[i].length + 1;
		}
		offset += position.column;
		return offset;
	}
   
	function updateMarkers(problems) {
		if (typeof problems == "string") {
			problems = JSON.parse(problems);
		}
		
		var annotations = problems.map(function(problem) {
		return new Annotation(convertProblemSeverity(problem.severity),
								problem.message, 
								problem.lineNumber - 1);
		});
		_editor.getSession().setAnnotations(annotations);
	}

	function Annotation(type, message, lineNumber) {
		this.type = type; // "error", "warning", "info"
		this.text = message;
		this.row = lineNumber;
	}

	function convertProblemSeverity(type) {
		switch (type) {
			case 'Warning': return 'warning';
			case 'Info':    return 'info';
			default:        return 'error';
		}
	}
   
	function refreshResource() {
		con.send('refresh', resourceName);
	}
   
	return {
		init : function(el, baseUrl, id, editorArray) {
			// Configure current editor
			resources = editorArray;
			projectId = id;
			initialize(el);

			// Set up connector
			var connectionConfig = {
				url : baseUrl + "?projectName=" + projectId
			};
			con.init(connectionConfig);
			con.subscribe(this);

			// Return handle 
			return this;
		},
	   
		notify : function(event) {
			handleResponse(event);
		},

		setFirstResource: function(id) {
			currentId = id;
			resourceName = resources[id].resourceRef;
			switchingResource = true;

			// Need to force a connection first time if no websocket
			refreshResource();
		},
	   
	   	// Store info by closing current editor, and refresh with new content
		switchResource : function(id) {
			if (id === currentId) {
				return false;
			}

			// Store current position
			switchingResource = true;
			resources[currentId].pos = _editor.getCursorPosition();

			// Update settings
			currentId = id;
			resourceName = resources[currentId].resourceRef;
			cookies.setCookie(projectId, id, 180);
			con.send('refresh', resourceName);
			return true;
		},
		
		getPreviousTests : function() {
			return resources[currentId].testResults;
		},

		getCurrentIndex : function() {
			return currentId;
		},
		
		refresh : function() {
			refreshEditor();
		},

		run : function() {
			con.send('run', resourceName);
		},

		test : function() {
			con.send('test', resourceName);
		},

		getAce : function() {
			return _editor;
		}
		   
	};
})(ace, connector, cookieManager);
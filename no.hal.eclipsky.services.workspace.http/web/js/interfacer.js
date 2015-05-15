var connector = connector || {},
	editor = editor || {};

var test;
var interfacer = (function(con) {
	'use strict';

	var ed,
		isFetching = false,
		isRunning = false,
		startId = 0,

		logging = false,
		c = (logging ? console : {log : function(){}}),

		startWidthPerc = 0.8,
		startWidth,
		suggestedWidthPerc = 0.65,
		suggestedWidth,
		startDragging = null,
		dragTimeLimit = 200,

		$navbar,
		$editor,
		$console,
		$dragbar,
		$editorWrapper,
		$btnRun,
		$btnTest,
		$test,
		$test_list,
		$test_tmpl,
		$tabs;

	function initialize() {
		$navbar = $('#tabs');
		$test = $('#tests');
		$editor = $('#main_editor');
		$editorWrapper = $('#editor_wrapper');
		$console = $('#console').children()[0];
		$dragbar = $('#dragbar');
		$btnRun = $('#btn_run');
		$btnTest = $('#btn_test');
		$test_list = $('#test_result');
		$test_tmpl = $('#test_tmpl');

		// Adjust CSS in Firefox
		if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
			$dragbar.css('top', 0);
			$test.css('top', 36);
		}

		// Handle navbar
		$tabs = $navbar.find('a');
		$tabs.on('click', function(event) {
			if (isFetching) {
				event.preventDefault();
			}
		});

		// Handle 'run'-button
		$btnRun.on('click', function() {
			if (isRunning) {
				event.preventDefault();
			} else {
				ed.run();
				isRunning = true;
			}
		});

		// Handle 'test'-button
		$btnTest.on('click', function() {
			if (isRunning) {
				event.preventDefault();
			} else {
				ed.test();
				isRunning = true;
			}
		});

		// Handle moving dragbar
		$dragbar.mousedown(function(e){       
			e.preventDefault();
			var pageWidth = $('body').width();
			startDragging = new Date();
			$(document).mousemove(function(e){
				if (e.pageX + 100 < pageWidth && e.pageX - 100 > 0) {
					$editorWrapper.css('width',e.pageX+10);
					$test.css('left',e.pageX+10);
				}
			});
	    });

		// Handling letting go of dragbar
	    $(document).mouseup(function(e){
	    	$(document).unbind('mousemove');

	    	// Verify that it's not a default mousemove
	    	if (startDragging === null) {
	    		return;
	    	}

	    	// Check if the "drag" actually was a "click"
	      	var stopDragging = new Date();
	       	if (stopDragging - startDragging < dragTimeLimit) {
	       		var currentWidth = $editorWrapper.width(),
	       			suggestedDelta = Math.abs(currentWidth - suggestedWidth),
	       			startDelta = Math.abs(currentWidth - startWidth);

	       		if (startDelta > suggestedDelta) {
	       			setDragPosition(startWidth);
	       		} else {
	       			setDragPosition(suggestedWidth);
	       		}
	       	}

	       	startDragging = null;
	    });

	    // Handle window resizing
	    var resizeTimer;
	    $(window).resize(function(e) {
	    	clearTimeout(resizeTimer);
    		resizeTimer = setTimeout(function() {
    			var pageWidth = $('body').width();
       			suggestedWidth = suggestedWidthPerc * pageWidth;
       			startWidth = startWidthPerc * pageWidth;

       			setDragPosition(startWidth);
    		}, 100);
	    })

	    // Store initial meassurements
	    startWidth = $(window).trigger('resize');

	}

	function handleMessage(data) {
		var type;
		if (!(data instanceof Array)) {			
			type = data.type;
			switch(type) {
			case 'run':
				isRunning = false;
				if (data.error === "") {
					$($console).removeClass('error');
					$console.innerHTML = data.console;
				} else {
					$($console).addClass('error');
					$console.innerHTML = data.error;
				}
				break;
			case 'refresh':
				isFetching = false;
				var prevResult = ed.getPreviousTests();
				if (prevResult) {
					c.log('prevResult', prevResult);
					$test_list.show();
					fillTests(prevResult.tests);
					var details = $test_list.find('details');
					details.removeAttr('open');

					var summary = details.find('summary');
					test = summary;
					summary.removeClass('open');
					for (var i = summary.length - 1; i >= 0; i--) {
						summary[i].setAttribute('aria-expanded', 'false');
					}
				}
				break;
			case 'ready':
				startId = getHashId() || startId;
				window.location.hash = "#" + startId;
				switchResource(startId, true);
				break;
			default:
				break;
			}
		} else {
			if (data.length == 0) {
				isRunning = false;
				return;
			}

			type = data[0].type;
			switch(type) {
			case 'test':
				isRunning = false;
				fillTests(data);
				$test_list.show();
				break;
			default:
				break;
			}
		}
	}

	function fillTests(testResults) {
		var newElemLength = testResults.length,
			children = $test_list.children(),
			oldElemLength = children.length;

		// Clear exessive elements
		if (newElemLength < oldElemLength) {
			for (var i = oldElemLength - 1; i >= newElemLength; i--) {
				children[i].remove();
			}
		}

		// Alter existing
		var detailsList = [];
		for (var i = 0; i < oldElemLength && i < newElemLength; i++) {
			var t = testResults[i];
			$listEl = children[i];

			$summary = $($listEl).find('summary');
			$summary.text(t.name);
			$summary.removeClass();
			$summary.addClass(getStatusClass(t.status));

			// Only show textarea if not okay
			var $textarea = $($listEl).find('textarea');
			if (t.status === 'O') {
				$textarea.hide();
			} else {
				detailsList.push($summary.parent());
				$textarea.show().text(t.exception);
			}
		}

		// Optionally add new elements
		for (var i = oldElemLength; i < newElemLength; i++) {
			var $listEl = createListItem(testResults[i], detailsList)[0];
			$listEl.setAttribute('id', 'test_result_' + i);
			$test_list.append($listEl);
		}

		setDragPosition(suggestedWidth);

		// Disable old polyfill and add new if needed
		$('summary').off('click');
		$(detailsList).details();

		// Show indicator/direction
		$('summary').on('click', function(event) {
			var $this = $(this);


			var isOpen = this.getAttribute('aria-expanded');
			c.log(isOpen === 'true');
			if (isOpen) {
				isOpen = (isOpen === 'true');
			} else {
				var parent = $this.parent()[0];
				isOpen = parent.getAttribute('open') == undefined;
			}
			
			if (isOpen) {
				$this.addClass('open');
				$this.removeClass('closed');
			} else {
				$this.addClass('closed');
				$this.removeClass('open');
			}
		})
	}

	function setDragPosition(pos) {
		$editorWrapper.css('width', pos);
		$test.css('left', pos);
	}

	function createListItem(test, detailsList) {
		var $listEl = $('<li />'),
			$details = $('<details />'),
			$summary = $('<summary />'),
			$textarea = $('<textarea />');

		// Set summary info
		$summary.text(test.name);
		$summary.removeClass();
		$summary.addClass(getStatusClass(test.status));
	
		// Build structure
		$details.append($summary)
		$listEl.append($details);
		$details.append($textarea);

		// Only show textarea if status is E or F
		if (test.status === 'O') {
			$textarea.hide();
		} else {
			detailsList.push($details);
			$textarea.text(test.exception);
		}

		return $listEl;
	}

	function getStatusClass(status) {
		switch (status) {
		case 'F':
			return 'failed';
		case 'O':
			return 'ok';
		case 'E':
		default:
			return 'error';
		}
	}

	function switchResource(id, isFirst) {
		var correctedId = id;
		if (isFetching)
			return;

		$editor.css({'opacity': '1.0'});
		isFetching = true;

		if (isNaN(id)) {
			var tabName;
			for (var i = $tabs.length - 1; i >= 0; i--) {
				tabName = $tabs[i].innerHTML;
				if (tabName != id) {
					$($tabs[i]).parent().removeClass('active');
				} else {
					correctedId = i;
					$($tabs[i]).parent().addClass('active');
				}
			}
		} else {
			correctedId = parseInt(id, 10);
			for (var i = $tabs.length - 1; i >= 0; i--) {
				if (i != correctedId) {
					$($tabs[i]).parent().removeClass('active');
				} else {
					$($tabs[i]).parent().addClass('active');
				}
			}
		}

		if (isFirst) {
			ed.setFirstResource(correctedId);
		} else {
			ed.switchResource(correctedId);
			$test_list.hide();
			$console.innerHTML = '';
		}
	}

	function getHashId() {
		return window.location.hash.substr(1);
	}

	return {
		init : function(editor) {
			var ev = new $.Event('style'),
		        orig = $.fn.css;
		    $.fn.css = function() {
		        $(this).trigger(ev);
		        return orig.apply(this, arguments);
		    }

			ed = editor;
			connector.subscribe(this);

			$(window).on('hashchange', function() {
				var hashId = getHashId();
				switchResource(hashId, false);
			});

			initialize();

			// Force first connection if no websocket.
			if (!connector.usesWebSocket()) {
				handleMessage({type: 'ready'});
			}
			
		},

		notify : function(message) {
			handleMessage(message);
		},

		getHash : function() {
			return getHashId();
		}
	};

})(connector);


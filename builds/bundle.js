/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	// var $ = require('jquery');
	// require('jquery-slider');

	var mdata;
	var s;

	function readSwcFile(e) {
		var f = e.target.files[0]; 
		if (f) {
			var r = new FileReader();
			r.onload = function(e2) { 
				var swc_txt = e2.target.result;
				var swc = swc_parser(swc_txt);
				if ( Object.keys(swc).length > 0 ) {
					//remove previous neuron
					document.getElementById('container').innerHTML = "";

					s = new RivuletViewer({
						swc: swc, 
						dom_element: 'container', 
						center_node: -1, 
						show_stats: true, 
						metadata: mdata,
						mode: 'particle'
					});
					s.init();
					s.animate();
				}
				else {
					alert("Please upload a valid swc file.");
				}
			}
			r.readAsText(f);
		} else { 
		      alert("Failed to load file");
		}
	};

	function animateSwc(){
		s.animateSwc = !s.animateSwc;
	};

	function switchMode() {
		if (s.mode == 'particle')	{
	    	s.mode = 'skeleton';
		}

		else if (s.mode == 'skeleton'){
		    s.mode = 'particle';
		}

		if (!s.animateSwc){
			console.log('Rebuild neuron');
	    	s.rebuildNeuron();
	    	s.addSwcToScene();
	    }
	};

	function recentre() {
	    s.recentreNeuron();	
	};

	window.onload = function() {
		$( "#slider" ).slider({	value:5,
								min: 1,
								max: 50,
								step: 1,
								slide: function( event, ui ) {
									$( "#amount" ).val( ui.value );
									s.nodesPerUpdate = ui.value;
								}});
		$( "#amount" ).val( $( "#slider" ).slider( "value" ) );

		document.getElementById('swc_input').addEventListener('change', readSwcFile, false);
		document.getElementById('animate').addEventListener('click', animateSwc);
		document.getElementById('switch').addEventListener('click', switchMode);
		document.getElementById('recentre').addEventListener('click', recentre);
	}

/***/ }
/******/ ]);
// var $ = require('jquery');
// require('jquery-slider');
var React = require('react');
var Dropzone = require('react-dropzone');
var ReactDom = require('react-dom');

var mdata;
var s;

function readSwcFile(f) {
	// var f = e.target.files[0]; 
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


var DropzoneDemo = React.createClass({
    onDrop: function (files) {
	    readSwcFile(files[0]);    	
		// console.log('Received files: ', files);
    },

    render: function () {
      return (
          <Dropzone onDrop={this.onDrop}><div>Drop SWC File here</div></Dropzone>
      );
    }
});

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

	// document.getElementById('swc_input').addEventListener('change', readSwcFile, false);
	document.getElementById('animate').addEventListener('click', animateSwc);
	document.getElementById('switch').addEventListener('click', switchMode);
	document.getElementById('recentre').addEventListener('click', recentre);
}


ReactDom.render(<DropzoneDemo />, document.getElementById('filedrop'));
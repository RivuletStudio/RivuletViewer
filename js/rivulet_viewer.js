var RivuletViewer = function (parameters) {
    SharkViewer.call(this);
    this.animateSwc = false;
    this.setValues(parameters);
	this.fov = 45;
	this.nodectr = 0;
	this.framectr = 0;
	this.nodesPerUpdate = 30;
};

RivuletViewer.prototype = Object.create(SharkViewer.prototype);

RivuletViewer.prototype.setup = function() {
	//set up shaders
	this.vertexShader =  [
		'uniform float particleScale;',
		'attribute float radius;',
		'attribute vec3 typeColor;',
		'varying vec3 vColor;',
		'varying vec4 mvPosition;',
		'varying float vRadius;',
		'void main() ',
		'{',
			'vColor = vec3(typeColor); // set RGB color associated to vertex; use later in fragment shader.',
			'mvPosition = modelViewMatrix * vec4(position, 1.0);',

			'// gl_PointSize = size;',
			'gl_PointSize = radius * ((particleScale*2.0) / length(mvPosition.z));',
			'gl_Position = projectionMatrix * mvPosition;',
			'vRadius = radius;',
		'}'
	].join("\n");
	
	this.fragmentShader = [
		'#extension GL_EXT_frag_depth : enable',
		'uniform sampler2D sphereTexture; // Imposter image of sphere',
		'uniform mat4 projectionMatrix;',
		'varying vec3 vColor; // colors associated to vertices; assigned by vertex shader',
		'varying vec4 mvPosition;',
		'varying float vRadius;',
		'void main() ',
		'{',
			'// what part of the sphere image?',
			'vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);',
			'vec4 sphereColors = texture2D(sphereTexture, uv);',
				'// avoid further computation at invisible corners',
			'if (sphereColors.a < 0.3) discard;',

			'// calculates a color for the particle',
			'// gl_FragColor = vec4(vColor, 1.0);',
			'// sets a white particle texture to desired color',
			'// gl_FragColor = sqrt(gl_FragColor * texture2D(sphereTexture, uv)) + vec4(0.1, 0.1, 0.1, 0.0);',
			'// red channel contains colorizable sphere image',
			'vec3 baseColor = vColor * sphereColors.r;',
				'// green channel contains (white?) specular highlight',
			'vec3 highlightColor = baseColor + sphereColors.ggg;',
			'gl_FragColor = vec4(highlightColor, sphereColors.a);',
			'// TODO blue channel contains depth offset, but we cannot use gl_FragDepth in webgl?',
		'#ifdef GL_EXT_frag_depth',
			'float far = gl_DepthRange.far; float near = gl_DepthRange.near;', 
			'float dz = sphereColors.b * vRadius;', 
			'vec4 clipPos = projectionMatrix * (mvPosition + vec4(0, 0, dz, 0));', 
			'float ndc_depth = clipPos.z/clipPos.w;', 
			'float depth = (((far-near) * ndc_depth) + near + far) / 2.0;', 
			'gl_FragDepthEXT = depth;',
		'#endif',
		'}'
	].join("\n");
	
	var fragmentShaderAnnotation = [
		'#extension GL_EXT_frag_depth : enable',
		'uniform sampler2D sphereTexture; // Imposter image of sphere',
		'uniform mat4 projectionMatrix;',
		'varying vec3 vColor; // colors associated to vertices; assigned by vertex shader',
		'varying vec4 mvPosition;',
		'varying float vRadius;',
		'void main() ',
		'{',
			'// what part of the sphere image?',
			'vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);',
			'vec4 sphereColors = texture2D(sphereTexture, uv);',
				'// avoid further computation at invisible corners',
			'if (sphereColors.a < 0.3) discard;',

			'// calculates a color for the particle',
			'// gl_FragColor = vec4(vColor, 1.0);',
			'// sets a white particle texture to desired color',
			'// gl_FragColor = sqrt(gl_FragColor * texture2D(sphereTexture, uv)) + vec4(0.1, 0.1, 0.1, 0.0);',
			'// red channel contains colorizable sphere image',
			'vec3 baseColor = vColor * sphereColors.r;',
				'// green channel contains (white?) specular highlight',
			'gl_FragColor = vec4(baseColor, sphereColors.a);',
			'// TODO blue channel contains depth offset, but we cannot use gl_FragDepth in webgl?',
		'#ifdef GL_EXT_frag_depth',
			'float far = gl_DepthRange.far; float near = gl_DepthRange.near;', 
			'float dz = sphereColors.b * vRadius;', 
			'vec4 clipPos = projectionMatrix * (mvPosition + vec4(0, 0, dz, 0));', 
			'float ndc_depth = clipPos.z/clipPos.w;', 
			'float depth = (((far-near) * ndc_depth) + near + far) / 2.0;', 
			'gl_FragDepthEXT = depth;',
		'#endif',
		'}'
	].join("\n");

	this.vertexShaderCone = [
		'attribute float radius;',
		'attribute vec3 typeColor;',
		'varying vec3 vColor;',
		'varying vec2 sphereUv;',
		'varying vec4 mvPosition;',
		'varying float depthScale;',
		'void main() ',
		'{',
		'	// TODO - offset cone position for different sphere sizes',
		'	// TODO - implement depth buffer on Chrome',
		'	mvPosition = modelViewMatrix * vec4(position, 1.0);',
		'	// Expand quadrilateral perpendicular to both view/screen direction and cone axis',
		'	vec3 cylAxis = (modelViewMatrix * vec4(normal, 0.0)).xyz; // convert cone axis to camera space',
		'	vec3 sideDir = normalize(cross(vec3(0.0,0.0,-1.0), cylAxis));',
		'	mvPosition += vec4(radius * sideDir, 0.0);',
		'	gl_Position = projectionMatrix * mvPosition;',
		'	// Pass and interpolate color',
		'	vColor = typeColor;',
		'	// Texture coordinates',
		'	sphereUv = uv - vec2(0.5, 0.5); // map from [0,1] range to [-.5,.5], before rotation',
		'	// If sideDir is "up" on screen, make sure u is positive',
		'	float q = sideDir.y * sphereUv.y;',
		'	sphereUv.y = sign(q) * sphereUv.y;',
		'	// rotate texture coordinates to match cone orientation about z',
		'	float angle = atan(sideDir.x/sideDir.y);',
		'	float c = cos(angle);',
		'	float s = sin(angle);',
		'	mat2 rotMat = mat2(',
		'		c, -s, ',
		'		s,  c);',
		'	sphereUv = rotMat * sphereUv;',
		'	sphereUv += vec2(0.5, 0.5); // map back from [-.5,.5] => [0,1]',
		'	// We are painting an angled cone onto a flat quad, so depth correction is complicated',
		'   float foreshortening = length(cylAxis) / length(cylAxis.xy); // correct depth for foreshortening',
		'   // foreshortening limit is a tradeoff between overextruded cone artifacts, and depth artifacts',
		'   if (foreshortening > 4.0) foreshortening = 0.9; // hack to not pop out at extreme angles...',
		'   depthScale = radius * foreshortening; // correct depth for foreshortening',
		'}',
	].join("\n");
	 
	this.fragmentShaderCone = [
		'#extension GL_EXT_frag_depth : enable',
		'uniform sampler2D sphereTexture; // Imposter image of sphere',
		'uniform mat4 projectionMatrix;',
		'varying vec3 vColor;',
		'varying vec2 sphereUv;',
		'varying vec4 mvPosition;',
		'varying float depthScale;',
		'void main() ',
		'{',
		'	vec4 sphereColors = texture2D(sphereTexture, sphereUv);',
		'	if (sphereColors.a < 0.3) discard;',
		'	vec3 baseColor = vColor * sphereColors.r;',
		'	vec3 highlightColor = baseColor + sphereColors.ggg;',
		'	gl_FragColor = vec4(highlightColor, sphereColors.a);',
		'#ifdef GL_EXT_frag_depth',
			'float dz = sphereColors.b * depthScale;', 
			'vec4 mvp = mvPosition + vec4(0, 0, dz, 0);', 
			'vec4 clipPos = projectionMatrix * mvp;', 
			'float ndc_depth = clipPos.z/clipPos.w;', 
			'float far = gl_DepthRange.far; float near = gl_DepthRange.near;', 
			'float depth = (((far-near) * ndc_depth) + near + far) / 2.0;', 
			'gl_FragDepthEXT = depth;',
		'#endif',
		'}',
	].join("\n");

	if (this.effect === 'noeffect') this.effect = false;

	//set up colors and materials based on color array
	this.three_colors = [];
	for (var color in this.colors) {
		if (this.colors.hasOwnProperty(color)) {
			this.three_colors.push(new THREE.Color(this.colors[color]));
		}
	}
	this.three_materials = [];
	for (var color in this.colors) {
		if (this.colors.hasOwnProperty(color)) {
			this.three_materials.push(new THREE.MeshBasicMaterial({ color: this.colors[color] }));
		}
	}
	this.annotation_material = new THREE.MeshBasicMaterial({ color: this.annotation_color });
		
	//initialize bounding box
	this.boundingBox = {
		'xmin' : this.swc['1'].x,
		'xmax' : this.swc['1'].x,
		'ymin' : this.swc['1'].y,
		'ymax' : this.swc['1'].y,
		'zmin' : this.swc['1'].z,
		'zmax' : this.swc['1'].z,
	};
	this.calculateBoundingBox();

	//neuron centers around 1st node by default
	if (this.center_node === -1) {
		this.center = [ (this.boundingBox.xmax + this.boundingBox.xmin) / 2, (this.boundingBox.ymax + this.boundingBox.ymin) / 2, (this.boundingBox.zmax + this.boundingBox.zmin) / 2  ] ;
	}
	else{
		this.center_node = this.center_node.toString();
		this.center = [ this.swc[this.center_node].x, this.swc[this.center_node].y, this.swc[this.center_node].z ] ;
	}

	//setup render
	this.renderer = new THREE.WebGLRenderer({
		antialias : true,	// to get smoother output
	});
	this.renderer.setClearColor(0xffffff, 1);
	//this.renderer.setSize(100 , 150);
	this.renderer.setSize(this.WIDTH , this.HEIGHT);
	document.getElementById(this.dom_element).appendChild(this.renderer.domElement);
	var gl = this.renderer.context
	// Activate depth extension, if available
	gl.getExtension('EXT_frag_depth')

	// create a scene
	this.scene = new THREE.Scene();

	// put a camera in the scene
	var cameraPosition = this.calculateCameraPosition(this.fov);
	this.camera = new THREE.PerspectiveCamera(this.fov, this.WIDTH/this.HEIGHT, 1, cameraPosition * 5);
	this.scene.add(this.camera);
	this.camera.position.z = cameraPosition;
	
	//neuron is object 3d which ensures all components move together
	this.neuron = new THREE.Object3D();
};


RivuletViewer.prototype.rebuildNeuron = function() {
	console.log('rebuildNeuron called');
	this.scene.remove(this.neuron);
	this.neuron = new THREE.Object3D();                
	this.neuron.position.set(-this.center[0], -this.center[1], -this.center[2]);
	this.scene.add(this.neuron);
};


RivuletViewer.prototype.addSwcToScene = function() {

	if (this.animateSwc && this.nodectr == 0){
		this.rebuildNeuron();
	}

	//particle mode uses vertex info to place texture image, very fast
	if (this.mode === 'particle') {

		var sphereImg = this.createSphereImage();
		// properties that may vary from particle to particle. only accessible in vertex shaders!
		//	(can pass color info to fragment shader via vColor.)
		// compute scale for particles, in pixels
		var particleScale =  this.calculateParticleSize(this.fov);
		var customAttributes = 
		{
			radius:   { type: "fv1", value: [] },
			typeColor:   { type: "c", value: [] },
		};
		var customUniforms = 
		{
			particleScale: { type: 'f', value: particleScale },
			sphereTexture: { type: 't', value: sphereImg },
		};

		if (this.animateSwc){
			var geo = new THREE.Geometry();

			for (i = 0; i < this.nodesPerUpdate; i++ ){
		    	var nodeidx = i + this.nodectr;
				var nodeidxstr = nodeidx.toString();
			    if (this.swc.hasOwnProperty(nodeidxstr) ) {
			    	var node = this.swc[nodeidxstr];
			    	// if (this.swc.hasOwnProperty(node.parent)) {
					var particle_vertex = this.generateParticle(node);
					geo.vertices.push(particle_vertex);
					customAttributes.radius.value.push(node.radius);
					customAttributes.typeColor.value.push(this.nodeColor(node));
				}
			}
		}
		else{
			this.geometry = new THREE.Geometry();
			for (var node in this.swc) {
				if (this.swc.hasOwnProperty(node)) {
					var particle_vertex = this.generateParticle(this.swc[node]);
					this.geometry.vertices.push(particle_vertex);
					customAttributes.radius.value.push(this.swc[node].radius);
					customAttributes.typeColor.value.push(this.nodeColor(this.swc[node]));
				}
			} 
		}

		this.material = new THREE.ShaderMaterial(
		{
			uniforms : customUniforms,
			attributes : customAttributes,
			vertexShader : this.vertexShader,
			fragmentShader : this.fragmentShader,
			transparent : true, 
			// alphaTest: 0.5,  // if having transparency issues, try including: alphaTest: 0.5, 
			depthTest : true,
			// blending: THREE.AdditiveBlending, depthTest: false,
			// I guess you don't need to do a depth test if you are alpha blending?
			// 
		});


		if (this.animateSwc){
			var particles = new THREE.PointCloud(geo, this.material);
		}
		else{
			var particles = new THREE.PointCloud(this.geometry, this.material);
		}

		particles.sortParticles = false;
		this.neuron.add(particles);

		if (this.annotation) {
			var radii_avg = this.avgRadii();
			var customAttributesAnnotation = 
			{
				radius:   { type: "fv1", value: [] },
				typeColor:   { type: "c", value: [] },
			};
			this.annotation_geometry = new THREE.Geometry();
			for (var annot in this.annotation) {
				var anno_vertex = this.generateParticle(this.annotation[annot]);
				this.annotation_geometry.vertices.push(anno_vertex);
				customAttributesAnnotation.radius.value.push(radii_avg);
				customAttributesAnnotation.typeColor.value.push(new THREE.Color(this.annotation_color));
			}
			this.material_annotation = new THREE.ShaderMaterial(
			{
				uniforms : customUniforms,
				attributes : customAttributesAnnotation,
				vertexShader : vertexShader,
				fragmentShader : fragmentShaderAnnotation,
				transparent : true, 
				depthTest : true,
			});
			var particles_annotation = new THREE.ParticleSystem(this.annotation_geometry, this.material_annotation);
			particles_annotation.sortParticles = false;
			this.neuron.add(particles_annotation);
		}


		if (this.show_cones){	
			// Cone quad imposters, to link spheres together
			var coneAttributes = 
			{
				radius:   { type: "fv1", value: [] },
				typeColor:   { type: "c", value: [] },
			};
			var coneUniforms = 
			{
				sphereTexture: { type: 't', value: sphereImg },
			};
			var uvs = [
				new THREE.Vector2(0.5, 0),
				new THREE.Vector2(0.5, 1),
				new THREE.Vector2(0.5, 1)
			];
			var coneGeom = new THREE.Geometry();

			if (this.animateSwc){
				for (i = 0; i < this.nodesPerUpdate; i++ ){
			    	var nodeidx = i + this.nodectr;
					var nodeidxstr = nodeidx.toString();
				    if (this.swc.hasOwnProperty(nodeidxstr) ) {
				    	var node = this.swc[nodeidxstr];
					    	if (this.swc.hasOwnProperty(node.parent)) {

							// Child/first position
							var cone = this.generateCone(node, this.swc[node.parent]);
							var ix2 = coneGeom.vertices.push(cone.child.vertex);
							coneAttributes.radius.value.push(cone.child.radius);
							coneAttributes.typeColor.value.push(cone.child.color);
							
							coneGeom.vertices.push(cone.parent.vertex);
							coneAttributes.radius.value.push(cone.parent.radius);
							coneAttributes.typeColor.value.push(cone.parent.color);
							
							// Paint two triangles to make a cone-imposter quadrilateral
							// Triangle #1
							var coneFace = new THREE.Face3(ix2 - 1, ix2 - 1, ix2);
							coneFace.vertexNormals = [ cone.normal1, cone.normal2, cone.normal2 ];
							coneGeom.faces.push(coneFace);
							// Simple texture coordinates should be modified in the vertex shader
							coneGeom.faceVertexUvs[0].push(uvs);
							// Triangle #2
							coneFace = new THREE.Face3(ix2, ix2, ix2-1);
							coneFace.vertexNormals = [ cone.normal1, cone.normal2, cone.normal1 ];
							coneGeom.faces.push(coneFace);
							coneGeom.faceVertexUvs[0].push(uvs);
						}
					}
				}
			}
			else{
				for (var node in this.swc) {
					if (this.swc.hasOwnProperty(node)) {
						if (this.swc.hasOwnProperty(this.swc[node].parent)) {
							// Child/first position
							var cone = this.generateCone(this.swc[node], this.swc[this.swc[node].parent]);
							var ix2 = coneGeom.vertices.push(cone.child.vertex);
							coneAttributes.radius.value.push(cone.child.radius);
							coneAttributes.typeColor.value.push(cone.child.color);
							
							coneGeom.vertices.push(cone.parent.vertex);
							coneAttributes.radius.value.push(cone.parent.radius);
							coneAttributes.typeColor.value.push(cone.parent.color);
							
							// Paint two triangles to make a cone-imposter quadrilateral
							// Triangle #1
							var coneFace = new THREE.Face3(ix2 - 1, ix2 - 1, ix2);
							coneFace.vertexNormals = [ cone.normal1, cone.normal2, cone.normal2 ];
							coneGeom.faces.push(coneFace);
							// Simple texture coordinates should be modified in the vertex shader
							coneGeom.faceVertexUvs[0].push(uvs);
							// Triangle #2
							coneFace = new THREE.Face3(ix2, ix2, ix2-1);
							coneFace.vertexNormals = [ cone.normal1, cone.normal2, cone.normal1 ];
							coneGeom.faces.push(coneFace);
							coneGeom.faceVertexUvs[0].push(uvs);
						}
					}
				} 
			}

			var coneMaterial = new THREE.ShaderMaterial(
			{
				attributes: coneAttributes,
				uniforms: coneUniforms,
				vertexShader:   this.vertexShaderCone,
				fragmentShader: this.fragmentShaderCone,
				transparent: false, 
				depthTest: true,
				side: THREE.DoubleSide
			});
			var coneMesh = new THREE.Mesh(coneGeom, coneMaterial);
			this.neuron.add(coneMesh);
		}
	}
	//sphere mode renders 3d sphere
	else if (this.mode === 'sphere') {
		for (var node in this.swc) {
			if (this.swc.hasOwnProperty(node)) {
				var sphere = this.generateSphere(this.swc[node]);
				this.neuron.add(sphere);
				if (this.show_cones){
					if (this.swc[node].parent != -1) {
						var cone = this.generateConeGeometry(this.swc[node], this.swc[this.swc[node].parent]);
						this.neuron.add(cone);
					}
				}
			}
		} 
		if (this.annotation) {
			for (var annot in this.annotation) {
				var radii_avg = this.avgRadii();
				var a = this.generateAnnotation(this.annotation[annot], radii_avg);
				this.neuron.add(a);
			}
		}
	}
	
	if (this.mode === 'skeleton') {
		this.material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors  });

	    if (this.animateSwc){

	        var geo = new THREE.Geometry();

			for (i = 0; i < this.nodesPerUpdate; i++ ){
		    	var nodeidx = i + this.nodectr;
				var nodeidxstr = nodeidx.toString();
				    if (this.swc.hasOwnProperty(nodeidxstr) ) {
				    	var node = this.swc[nodeidxstr];
				    	if (this.swc.hasOwnProperty(node.parent)) {
							var verticies = this.generateSkeleton(node, this.swc[node.parent]);
							geo.vertices.push(verticies.child);
							geo.colors.push(verticies.child_color);
							geo.vertices.push(verticies.parent);
							geo.colors.push(verticies.parent_color);

					        var line = new THREE.Line(geo, this.material, THREE.LinePieces);
							this.neuron.add(line);
				    	}
				    }
			}
            
	    }
	    else{
			this.geometry = new THREE.Geometry();
			
			for (var node in this.swc) {
				if (this.swc.hasOwnProperty(node)) {
					if (this.swc.hasOwnProperty(this.swc[node].parent)) {
						var verticies = this.generateSkeleton(this.swc[node], this.swc[this.swc[node].parent]);
						this.geometry.vertices.push(verticies.child);
						this.geometry.colors.push(verticies.child_color);
						this.geometry.vertices.push(verticies.parent);
						this.geometry.colors.push(verticies.parent_color);
					}
				}
			} 

			var line = new THREE.Line(this.geometry, this.material, THREE.LinePieces);
			this.neuron.add(line);

            // The Annotaion is not currently used for simplicity
			// if (this.annotation) {
			// 	var sphereImg = this.createSphereImage();
			// 	// properties that may vary from particle to particle. only accessible in vertex shaders!
			// 	//	(can pass color info to fragment shader via vColor.)
			// 	// compute scale for particles, in pixels
			// 	var particleScale =  this.calculateParticleSize(this.fov);
			// 	var radii_avg = this.avgRadii();
			// 	var customUniforms = 
			// 	{
			// 		particleScale: { type: 'f', value: particleScale },
			// 		sphereTexture: { type: 't', value: sphereImg },
			// 	};
			// 	var customAttributesAnnotation = 
			// 	{
			// 		radius:   { type: "fv1", value: [] },
			// 		typeColor:   { type: "c", value: [] },
			// 	};
			// 	this.annotation_geometry = new THREE.Geometry();
			// 	for (var annot in this.annotation) {
			// 		var anno_vertex = this.generateParticle(this.annotation[annot]);
			// 		this.annotation_geometry.vertices.push(anno_vertex);
			// 		customAttributesAnnotation.radius.value.push(radii_avg);
			// 		customAttributesAnnotation.typeColor.value.push(new THREE.Color(this.annotation_color));
			// 	}
			// 	this.material_annotation = new THREE.ShaderMaterial(
			// 	{
			// 		uniforms : customUniforms,
			// 		attributes : customAttributesAnnotation,
			// 		vertexShader : vertexShader,
			// 		fragmentShader : fragmentShaderAnnotation,
			// 		transparent : true, 
			// 		depthTest : true,
			// 	});
			// 	var particles_annotation = new THREE.ParticleSystem(this.annotation_geometry, this.material_annotation);
			// 	particles_annotation.sortParticles = false;
			// 	this.neuron.add(particles_annotation);
			// }
		}
	}

};


//Sets up three.js scene 
RivuletViewer.prototype.init = function () {

    // Count the number of swc nodes
    this.nswc = 0;
    for (var n in this.swc){
    	if (this.swc.hasOwnProperty(n)){
    		++this.nswc;
    	}
    }

	this.setup();
	this.addSwcToScene();
	
	//centers neuron
	this.neuron.position.set(-this.center[0], -this.center[1], -this.center[2]);
	this.scene.add(this.neuron);

	//Lights
	//doesn't actually work with any of the current shaders
	var light = new THREE.DirectionalLight( 0xffffff);
	light.position.set(0, 0, 1000);
	this.scene.add(light);
	
	if (this.show_stats) {
		//FPS stats
		this.stats = new Stats();
		this.stats.domElement.style.position = 'absolute';
		document.getElementById(this.dom_element).style.position = 'relative';
		this.stats.domElement.style.top = '0px';
		this.stats.domElement.style.zIndex = 100;
		document.getElementById(this.dom_element).appendChild(this.stats.domElement);
	}
	if (this.metadata){
		var melement = this.createMetadataElement(this.metadata, this.colors);
		document.getElementById(this.dom_element).appendChild(melement);
	}

	//Effects
	if (this.effect) {
		if (this.effect === 'rift') {
			this.my_effect = new THREE.OculusRiftEffect(this.renderer, { worldScale: 100 });
		}
		else if (this.effect === 'parallax') {
			this.my_effect = new THREE.ParallaxBarrierEffect(this.renderer);
		}
		this.my_effect.setSize(this.WIDTH, this.HEIGHT);
	}

	//Controls
	this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
	this.controls.addEventListener('change', this.render.bind(this));
};

// animation loop
RivuletViewer.prototype.animate = function () {
	// loop on request animation loop
	// - it has to be at the begining of the function
	// - see details at http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
	requestAnimationFrame(this.animate.bind(this));
	this.controls.update();

    if (this.animateSwc){
        this.addSwcToScene();

	    this.nodectr += this.nodesPerUpdate;
		this.framectr++;

	    if (this.nodectr > this.nswc) { // To go all over again
	    	this.nodectr = 0;
			this.framectr = 0;
	    }
    }

	this.render();

};
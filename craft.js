
class debug {
    static clear() {
	document.getElementById("webby-log").innerHTML = ""; }

    static log(msg) {
	var webbylog=document.getElementById("webby-log");
	webbylog.innerHTML += msg;
	webbylog.scrollTop = webbylog.scrollHeight; } }

// GENERAL //

var mouseX=0, mouseY=0, mouseWheel=0;
var _vk_is_up,_vk_key;

var onScroll;

document.onmousemove = function(event) {
    event = event || window.event;
    
    mouseX=event.pageX;
    mouseY=event.pageY; }

if(window.navigator.userAgent.search("Firefox")!=-1) {
      document.addEventListener ("DOMMouseScroll",
				 function(event) {
				     event = event || window.event;
				     onScroll(event.detail/3.0);
				     mouseWheel = event.detail/3.0; });
} else {
    document.onmousewheel = function(event) {
        event = event || window.event;
	onScroll(event.wheelDelta/120);
        mouseWheel = event.wheelDelta / 120; } }

Math.radians = function(degrees) { return degrees * Math.PI / 180; };
Math.degrees = function(radians) { return radians * 180 / Math.PI; };

/// ############# ///       /// ############# ///
/// #### /// #### /// WEBGL /// #### /// #### ///
/// ############# ///       /// ############# ///

var vbox;
var gl;
var gl_mode;
var gl_force_wgl1=false;
var gl_aspect;
var wvao;
    
function initgl(name) {
    debug.log("[INIT] Loading WebGL2...");
    var vbox = document.getElementById(name);
    vbox.width =vbox.clientWidth;
    vbox.height=vbox.clientHeight;
    gl_aspect = vbox.width/vbox.height;
    if(!gl_force_wgl1) gl = vbox.getContext("webgl2");
    
    if(gl == null || gl_force_wgl1) {
        if(!gl_force_wgl1) { debug.log(" Failed\n"); } else { debug.log(" Forcing WebGL1\n"); }
        debug.log("[INIT] Loading Experimental WebGL...");
        gl = document.getElementById(name).getContext("experimental-webgl");
        gl_mode = 1;
        
        if(gl == null) {
            debug.log(" Failed\n[INIT] Loading WebGL...");
            gl = document.getElementById(name).getContext("webgl");
            
            if(gl == null) {
		debug.log(" Failed\n[INIT] Failed to load WebGL\n"); return; } }
    } else {
	gl_mode = 2; }
    
    debug.log("\n");
    
    debug.log(  "[ GL ] WebGL Info :"
		+ "\n[ GL ]   Version  : " + gl.getParameter(gl.VERSION )
		+ "\n[ GL ]   Vendor   : " + gl.getParameter(gl.VENDOR  )
		+ "\n[ GL ]   Renderer : " + gl.getParameter(gl.RENDERER)
		+ "\n[ GL ]   Shader V : " + gl.getParameter(gl.SHADING_LANGUAGE_VERSION) + "\n");

    wvao = new VAO();
    
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT); }

class VAO {
    constructor() {
	this.create();
    }

    create() {
	this.glid = gl.createVertexArray();
    }

    bind() {
	gl.bindVertexArray(this.glid);
    }
}

/// ############# ///        /// ############# ///
/// #### /// #### /// SHADER /// #### /// #### ///
/// ############# ///        /// ############# ///
    
class Shader {
    constructor(type,source) {
        this.glid = 0;
        if(source.search("webby.shader")==-1) {
	    this.name = "unknown shader";
	    debug.log("[ GL ] Loading Shader '" + this.name + "'\n");
	    this.create(type,source); }
        else {
	    this.name = source;
            if(gl_mode == 2) {
                debug.log("[ GL ] Loading Shader '" + this.name + "'\n");
                this.create(type,document.getElementById(source).innerText);
	    } else {
		debug.log("[ GL ] (WGL1) Loading Shader '" + (this.name+=".wgl1") + "\n");
		this.create(type,document.getElementById(this.name).innerText); } } }

    create(type,source) {
        this.destroy();
        this.glid = gl.createShader(type);
        gl.shaderSource (this.glid,source);
        gl.compileShader(this.glid);
	
        var cstat = gl.getShaderParameter(this.glid,gl.COMPILE_STATUS);
	
        if(cstat) return this.glid;
	
        debug.log("[ GL ] Shader Compilation failed for '"+this.name+"'!\n");
        debug.log(gl.getShaderInfoLog(this.glid)+"\n");
	
        this.destroy(); }
    
    destroy() {
        if(!this.glid) return;
	
        gl.deleteShader(this.glid);
        this.glid = 0; } }

/// ############# ///                /// ############# ///
/// #### /// #### /// SHADER PROGRAM /// #### /// #### ///
/// ############# ///                /// ############# ///
    
class ShaderProgram {
    constructor(shaders,name) {
        if(arguments.length > 1) {
            this.name = name;
        } else {
            this.name = "unknown program"; }
	
        debug.log("[ GL ] Creating program '"+this.name+"'\n");
	
        this.create(shaders); }
        
    create(shaders) {
        this.destroy();
        this.glid=gl.createProgram();
        for(var i = 0; i < shaders.length; ++i) {
            if(shaders[i].glid == null) {
		debug.log("[ GL ] Attaching unknown shader\n");
		gl.attachShader(this.glid, shaders[i]);
            } else {
		debug.log("[ GL ] Attaching shader '"+shaders[i].name+"'\n");
		gl.attachShader(this.glid, shaders[i].glid); } }
        gl.linkProgram(this.glid);
        
        var lstat = gl.getProgramParameter(this.glid,gl.LINK_STATUS);
        
        if(lstat) return this.glid;
        
        debug.log("[ GL ] Program linking failed for '"+this.name+"'\n");
        debug.log(gl.getProgramInfoLog(this.glid)+"\n");
        
        this.destroy(); }
    
    destroy() {
        if(!this.glid) return;
        
        gl.deleteProgram(this.glid);
        this.glid = 0; } }

/// ############# ///                     /// ############# ///
/// #### /// #### /// BUFFER ARRAY OBJECT /// #### /// #### ///
/// ############# ///                     /// ############# ///

class BAO {
    constructor(type,data,draw) {
        this.create(type,data,draw); }
    
    create(type,data,draw) {
        this.destroy();
        this.glid = gl.createBuffer();
        gl.bindBuffer(type,this.glid);
        gl.bufferData(type,data,draw); }
    
    destroy() {
        if(!this.glid) return;
        
        gl.deleteBuffer(this.glid);
        this.glid = 0; } }





function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

    const image = new Image();
    image.onload = function() {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                      srcFormat, srcType, image);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); };
  image.src = url;

  return texture; }

/// ############# ///       /// ############# ///
/// #### /// #### /// CHUNK /// #### /// #### ///
/// ############# ///       /// ############# ///

class BlockCollider {
    constructor(W,H,D,X,Y,Z) {
	this.create(W,H,D,X,Y,Z); }

    create(W,H,D,X,Y,Z) {
	this.width=W;
	this.height=H;
	this.depth=D;

	this.posx=X;
	this.posy=Y;
	this.posz=Z; }

    isSolid(X,Y,Z) {
	return (X>=this.posx&&X<=this.posx+this.width &&
		Y>=this.posy&&Y<=this.posy+this.height&&
		Z>=this.posz&&Z<=this.posz+this.depth); }

    getDirection(X,Y,Z) {
	var XD=Math.abs((this.posx+(this.width /2.0))-X);
	var YD=Math.abs((this.posy+(this.height/2.0))-Y);
	var ZD=Math.abs((this.posz+(this.depth /2.0))-Z);

	switch(Math.max.apply(Math, [XD,YD,ZD])) {
	case XD:
	    return (((this.posx+(this.width/2.0 ))-X)<0)+0;
	case YD:
	    return (((this.posy+(this.height/2.0))-Y)<0)+2;
	case ZD:
	    return (((this.posz+(this.depth/2.0 ))-Z)<0)+4; }

	debug.log("Can't decide direction\n");
	return null; }
    
    isColliding(BC) {

    }
}

class Block {
    constructor(NAME,FACES) {
	this.create(NAME,FACES); }

    create(NAME,FACES) {
	this.name=NAME;
	this.faces=FACES; } }

class Chunk {
    constructor(W,H,D,X,Y,Z,seed,BLOCKS,world) {
	this.create(W,H,D,X,Y,Z,seed,BLOCKS,world); }

    getVal(X,Y,Z) {
	var out=0;
	var biome=(noise.perlin3(X/417.0,Y/112.0,Z/417.0))*2.0;

	if(biome>0.125) {
	    var val=(noise.perlin3(noise.perlin2(X/32.0,Z/32.0),
				   Y/12.0,
				   noise.perlin2(Z/32.0,X/32.0))
		     +(((this.height-Y)-32.0)/25.0)
		     +noise.perlin2((X)/96.0,(Z)/96.0)*2.0);
	    if(val>0.14) out=2; }
	else {
	    var val=(noise.perlin3(X/45.0,Y/26.0,Z/30.0)+(((this.height-Y)-32.0)/25.0)
		     +((Math.sin(X/20.0)*Math.cos(Z/20.0))/2.0)
		     +(noise.perlin2(X/10.0,Z/10.0)/4.0));

	    if(val>0.14) out=4; }

	var cave=(noise.perlin3(X/32.0,Y/45.0,Z/32.0)/2.0);
	if(cave>0.10) out=0;

	if(Y==0) { out=14; }
	
	return out; }

    getPostVal(X,Y,Z) {
	var out=this.data[X+(Y*this.width)+(Z*this.width*this.height)];
	if(out==2) {
	    if(this.data[X+((Y+3)*this.width)+(Z*this.width*this.height)]==0) out=3;
	    if(this.data[X+((Y+1)*this.width)+(Z*this.width*this.height)]==0) out=1; }
	return out; }

    isSolid(X,Y,Z) {
	if(X<0||X>=this.width||Y<0||Y>=this.height||Z<0||Z>=this.depth) {
	    return this.getVal(X+this.posx,Y+this.posy,Z+this.posz)!=0; }

	return (this.data[X+(Y*this.width)+(Z*this.width*this.height)]!=0); }
    
    create(W,H,D,X,Y,Z,seed,BLOCKS,world) {
	this.data     = [];

	this.width  = W;
	this.height = H;
	this.depth  = D;

	this.posx = X;
	this.posy = Y;
	this.posz = Z;

	this.world = world;

	if(BLOCKS!=null) {
	    this.blocks=BLOCKS; }

	this.matrix=mat4.create();
	mat4.identity(this.matrix);
	mat4.translate(this.matrix,this.matrix,vec3.fromValues(X,Y,Z));

	noise.seed(seed);

	for(var i=0; i < W*H*D; ++i) this.data.push(0);

	for(var i=0; i < W; ++i) {
	    for(var j=0; j < H; ++j) {
		for(var k=0; k < D; ++k) {
		    this.data[i+(j*W)+(k*W*H)]=this.getVal(i+X,j+Y,k+Z); } } }

	for(var i=0; i < W; ++i) {
	    for(var j=0; j < H; ++j) {
		for(var k=0; k < D; ++k) {
		    if(this.data[i+(j*W)+(k*W*H)]!=0) {
			this.data[i+(j*W)+(k*W*H)]=this.getPostVal(i,j,k); } } } }

	this.genMesh(W,H,D,X,Y,Z); }
    
    changeBlock(X,Y,Z,b) {
	this.data[X+(this.width*Y)+(this.width*this.height*Z)]=b;

	if(X==0) {
	    var c=this.world.findChunk(this.posx-1,Z+this.posz);

	    c.cleanMesh();
	    c.genMesh(this.width,this.height,this.depth,c.posx,c.posy,c.posz);
	}

	this.cleanMesh();
	this.genMesh(this.width,this.height,this.depth,this.posx,this.posy,this.posz); }

    cleanMesh() {
	this.vbuffer.destroy();
	this.ibuffer.destroy();
	this.ubuffer.destroy();

	this.vertices.length=0;
	this.indices.length=0;
	this.uvs.length=0;
	this.collider.length=0;
    }

    genMesh(W,H,D,X,Y,Z) {
	this.vertices = [];
	this.indices  = [];
	this.uvs      = [];
	this.collider = [];
	this.normals  = [];

	for(var i=0; i < W; ++i) {
	    for(var j=0; j < H; ++j) {
		for(var k=0; k < D; ++k) {
		    if(this.data[i+(j*W)+(k*W*H)]!=0) {
			var block = this.data[i+(j*W)+(k*W*H)];
			var mkSolid=false;
			if(this.isSolid(i+1,j,k)==0) {
			    mkSolid=true;
			    this.genFace(i+1,j,k , 0.0,0.0,1.0 , 0.0,1.0,0.0 , true  , block , 0, 'l'); }
			if(this.isSolid(i-1,j,k)==0) {
			    mkSolid=true;
			    this.genFace(i  ,j,k , 0.0,0.0,1.0 , 0.0,1.0,0.0 , false , block , 1, 'r'); }

			if(this.isSolid(i,j+1,k)==0) {
			    mkSolid=true;
			    this.genFace(i,j+1,k , 0.0,0.0,1.0 , 1.0,0.0,0.0 , false , block , 2, 'd'); }
			if(this.isSolid(i,j-1,k)==0) {
			    mkSolid=true;
			    this.genFace(i,j  ,k , 0.0,0.0,1.0 , 1.0,0.0,0.0 , true  , block , 3, 'u'); }

			if(this.isSolid(i,j,k+1)==0) {
			    mkSolid=true;
			    this.genFace(i,j,k+1 , 0.0,1.0,0.0 , 1.0,0.0,0.0 , true  , block , 4, 'b'); }
			if(this.isSolid(i,j,k-1)==0) {
			    mkSolid=true;
			    this.genFace(i,j,k   , 0.0,1.0,0.0 , 1.0,0.0,0.0 , false , block , 5, 'f'); }

			if(mkSolid) {
			    this.collider.push(new BlockCollider(1.0,1.0,1.0,i+X,j,k+Z)); }
		    } } } }

	this.vbuffer = new BAO(gl.ARRAY_BUFFER        ,new Float32Array(this.vertices),gl.STATIC_DRAW);
	this.ibuffer = new BAO(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array (this.indices ),gl.STATIC_DRAW);
	this.ubuffer = new BAO(gl.ARRAY_BUFFER        ,new Float32Array(this.uvs     ),gl.STATIC_DRAW);
	this.nbuffer = new BAO(gl.ARRAY_BUFFER        ,new Float32Array(this.normals ),gl.STATIC_DRAW);

	this.vao = new VAO();
	this.vao.bind();

	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);
	gl.enableVertexAttribArray(2);
	
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuffer.glid);
	gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER,this.ubuffer.glid);
	gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER,this.nbuffer.glid);
	gl.vertexAttribPointer(2,3,gl.FLOAT,false,0,0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuffer.glid);

	wvao.bind();
    }

    genFace(CX,CY,CZ,RX,RY,RZ,UX,UY,UZ,REV,BLOCK,FACE,NDIR) {
	var index = this.vertices.length/3;
	
        Array.prototype.push.apply(this.vertices,[CX      ,CY      ,CZ      ]);
        Array.prototype.push.apply(this.vertices,[CX+RX   ,CY+RY   ,CZ+RZ   ]);
        Array.prototype.push.apply(this.vertices,[CX+RX+UX,CY+RY+UY,CZ+RZ+UZ]);
	Array.prototype.push.apply(this.vertices,[CX+UX   ,CY+UY   ,CZ+UZ   ]);

	switch(NDIR) {
	case 'l':
	    Array.prototype.push.apply(this.normals,[-1,0,0]);
	    Array.prototype.push.apply(this.normals,[-1,0,0]);
	    Array.prototype.push.apply(this.normals,[-1,0,0]);
	    Array.prototype.push.apply(this.normals,[-1,0,0]);
	    break;
	case 'r':
	    Array.prototype.push.apply(this.normals,[1,0,0]);
	    Array.prototype.push.apply(this.normals,[1,0,0]);
	    Array.prototype.push.apply(this.normals,[1,0,0]);
	    Array.prototype.push.apply(this.normals,[1,0,0]);
	    break;
	case 'd':
	    Array.prototype.push.apply(this.normals,[0,-1,0]);
	    Array.prototype.push.apply(this.normals,[0,-1,0]);
	    Array.prototype.push.apply(this.normals,[0,-1,0]);
	    Array.prototype.push.apply(this.normals,[0,-1,0]);
	    break;
	case 'u':
	    Array.prototype.push.apply(this.normals,[0,1,0]);
	    Array.prototype.push.apply(this.normals,[0,1,0]);
	    Array.prototype.push.apply(this.normals,[0,1,0]);
	    Array.prototype.push.apply(this.normals,[0,1,0]);
	    break;
	case 'b':
	    Array.prototype.push.apply(this.normals,[0,0,-1]);
	    Array.prototype.push.apply(this.normals,[0,0,-1]);
	    Array.prototype.push.apply(this.normals,[0,0,-1]);
	    Array.prototype.push.apply(this.normals,[0,0,-1]);
	    break;
	case 'f':
	    Array.prototype.push.apply(this.normals,[0,0,1]);
	    Array.prototype.push.apply(this.normals,[0,0,1]);
	    Array.prototype.push.apply(this.normals,[0,0,1]);
	    Array.prototype.push.apply(this.normals,[0,0,1]);
	    break;
	}

	var td=1.0/16.0;
	var xoff=this.blocks[BLOCK-1].faces[(FACE*2)]*td;
	var yoff=this.blocks[BLOCK-1].faces[(FACE*2)+1]*td;

	switch(FACE) {
	case 0:
	    Array.prototype.push.apply(this.uvs,[td+xoff,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,yoff   ]);
	    break;
	case 1:
	    Array.prototype.push.apply(this.uvs,[td+xoff,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,yoff   ]);
	    break;
	case 2:
	    Array.prototype.push.apply(this.uvs,[xoff   ,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,td+yoff]);
	    break;
	case 3:
	    Array.prototype.push.apply(this.uvs,[xoff   ,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,td+yoff]);
	    break;
	case 4:
	    Array.prototype.push.apply(this.uvs,[xoff   ,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,td+yoff]);
	    break;
	case 5:
	    Array.prototype.push.apply(this.uvs,[xoff   ,td+yoff]);
	    Array.prototype.push.apply(this.uvs,[xoff   ,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,yoff   ]);
	    Array.prototype.push.apply(this.uvs,[td+xoff,td+yoff]);
	    break;
	}
	            
        if(!REV) {
	    Array.prototype.push.apply(this.indices,[index,index+1,index+2,index+2,index+3,index]);
        } else {
	    Array.prototype.push.apply(this.indices,[index+1,index,index+2, index+3,index+2,index]);
	} } }

class World {
    constructor(CWIDTH,CHEIGHT,CDEPTH,SEED,BLOCKS) {
	this.create(CWIDTH,CHEIGHT,CDEPTH,SEED,BLOCKS); }

    findChunk(X,Z) {
	var x=Math.ceil(X/this.chunkWidth) * this.chunkWidth;
	var z=Math.ceil(Z/this.chunkDepth) * this.chunkDepth;
	
	for(var i=0;i<this.chunks.length;++i) {
	    if(this.chunks[i].posx==x&&this.chunks[i].posz==z) {
		return this.chunks[i]; } }
	// debug.log("No chunk at: " + X + "," + Z + "\n");
	return null; }

    getChunkIndex(X,Z) {
	var x=Math.ceil(X/this.chunkWidth) * this.chunkWidth;
	var z=Math.ceil(Z/this.chunkDepth) * this.chunkDepth;
	
	for(var i=0;i<this.chunks.length;++i) {
	    if(this.chunks[i].posx==x&&this.chunks[i].posz==z) {
		return i; } }
	// debug.log("No chunk at: " + X + "," + Z + "\n");
	return null; }

    scan(X,Z,R) {
	for(var c=0;c<this.chunks.length;++c) {
	    var px=this.chunks[c].posx;
	    var pz=this.chunks[c].posz;

	    var a=X-px;
	    var b=Z-pz;

	    if(Math.sqrt(a*a+b*b)>R+(this.chunkWidth*4)) {
		this.chunks[c].vbuffer.destroy();
		this.chunks[c].ibuffer.destroy();
		this.chunks[c].ubuffer.destroy();
		this.chunks[c].nbuffer.destroy();

		this.chunks.splice(c,1);
	    } }
	
	for(var x=X-R; x<X+R; x+=this.chunkWidth) {
	    for(var z=Z-R; z<Z+R; z+=this.chunkDepth) {
		var px=Math.floor(x/this.chunkWidth)*this.chunkWidth;
		var pz=Math.floor(z/this.chunkDepth)*this.chunkDepth;

		var a=X-px;
		var b=Z-pz;
		
		if(Math.sqrt(a*a+b*b)>R) continue;

		if(this.findChunk(px,pz)==null) {
		    // debug.log("Creating chunk\n");
		    this.chunks.push(new Chunk(this.chunkWidth,this.chunkHeight,this.chunkDepth , px,0,pz ,this.seed,this.blocks,this)); } } } }
    
    create(CWIDTH,CHEIGHT,CDEPTH,SEED,BLOCKS) {
	this.chunks=[];

	this.chunkWidth  = CWIDTH;
	this.chunkHeight = CHEIGHT;
	this.chunkDepth  = CDEPTH;

	this.seed = SEED;

	this.blocks = BLOCKS;

	debug.log("World Detail : W: " + this.width + " H: " + this.height + " D: " + this.depth
		  + " CW: " + this.chunkWidth + " CH: " + this.chunkHeight + " CD " + this.chunkDepth + " SEED: " + this.seed + "\n");
    } }

window.onload = function() {
    debug.log("\
\n\
              #   # #-- ##. ##. # #   .#- ##. .#. #-- #-# \n\
              # : # #-- #-: #-: '.'   #   #-: :-: #--  :  \n\
              '#'#' #-- ##' ##'  :    '#- # : : : #    :  \n\
\n\
                         By: Jacob Langevin\n\
                       'Why did I make this?'\n\
\n\
                     Email   : comfykernel@gmail.com\n\
                     Twitter : @ComfyKernel\n\
\n");

    debug.log("[INIT] Using browser : " + window.navigator.userAgent + "\n");

    initgl("webby-box");

    debug.log("[INIT] Loading shaders\n");
    var shadSolV = new Shader(gl.VERTEX_SHADER  ,"webby.shader.solid.vertex"  );
    var shadSolF = new Shader(gl.FRAGMENT_SHADER,"webby.shader.solid.fragment");
    
    var shadUvV = new Shader(gl.VERTEX_SHADER  ,"webby.shader.uv.vertex"  );
    var shadUvF = new Shader(gl.FRAGMENT_SHADER,"webby.shader.uv.fragment");
    
    debug.log("[INIT] Creating Shader Programs\n");
    var shadSol = new ShaderProgram([shadSolV,shadSolF],"webby.program.solid");
    var shadUv  = new ShaderProgram([shadUvV ,shadUvF ],"webby.program.uv"   );
    
    var solpro = gl.getUniformLocation(shadSol.glid,"projection");
    var solvie = gl.getUniformLocation(shadSol.glid,"view");
    var solmod = gl.getUniformLocation(shadSol.glid,"model");
    
    var uvpro = gl.getUniformLocation(shadUv.glid,"projection");
    var uvvie = gl.getUniformLocation(shadUv.glid,"view");
    var uvmod = gl.getUniformLocation(shadUv.glid,"model");

    var uvtex = gl.getUniformLocation(shadUv.glid,"terrain");

    debug.log("[INIT] Creating world\n");
    
    var grassBlock = new Block("Grass"   ,[3,0 , 3,0 , 0,0 , 2,0 , 3,0 , 3,0]);
    var stoneBlock = new Block("Stone"   ,[1,0 , 1,0 , 1,0 , 1,0 , 1,0 , 1,0]);
    var dirtyBlock = new Block("Dirt"    ,[2,0 , 2,0 , 2,0 , 2,0 , 2,0 , 2,0]);
    var sandyBlock = new Block("Sand"    ,[2,1 , 2,1 , 2,1 , 2,1 , 2,1 , 2,1]);
    var gravlBlock = new Block("Gravel"  ,[3,1 , 3,1 , 3,1 , 3,1 , 3,1 , 3,1]);
    var loggyBlock = new Block("Oak Log" ,[4,1 , 4,1 , 5,1 , 5,1 , 4,1 , 4,1]);
    var obsidBlock = new Block("Obsidian",[5,2 , 5,2 , 5,2 , 5,2 , 5,2 , 5,2]);
    var pumpdBlock = new Block("Pumpkin" ,[6,6 , 6,6 , 6,6 , 6,6 , 6,6 , 6,6]);

    var goldoBlock = new Block("Gold Ore"    ,[0,2 , 0,2 , 0,2 , 0,2 , 0,2 , 0,2]);
    var ironoBlock = new Block("Iron Ore"    ,[1,2 , 1,2 , 1,2 , 1,2 , 1,2 , 1,2]);
    var coaloBlock = new Block("Coal Ore"    ,[2,2 , 2,2 , 2,2 , 2,2 , 2,2 , 2,2]);
    var diamoBlock = new Block("Diamond Ore" ,[2,3 , 2,3 , 2,3 , 2,3 , 2,3 , 2,3]);
    var reddoBlock = new Block("Redstone Ore",[3,3 , 3,3 , 3,3 , 3,3 , 3,3 , 3,3]);

    var beddyBlock = new Block("Bedrock"   ,[1,1 , 1,1 , 1,1 , 1,1 , 1,1 , 1,1]);
    var netheBlock = new Block("Netherrack",[7,6 , 7,6 , 7,6 , 7,6 , 7,6 , 7,6]);
    var glowyBlock = new Block("Glowstone" ,[9,6 , 9,6 , 9,6 , 9,6 , 9,6 , 9,6]);

    var cobblBlock = new Block("Cobblestone"      ,[ 0,1 ,  0,1 ,  0,1 ,  0,1 ,  0,1 ,  0,1]);
    var gobblBlock = new Block("Mossy Cobblestone",[ 4,2 ,  4,2 ,  4,2 ,  4,2 ,  4,2 ,  4,2]);
    var plankBlock = new Block("Oak Plank"        ,[ 4,0 ,  4,0 ,  4,0 ,  4,0 ,  4,0 ,  4,0]);
    var smothBlock = new Block("Smooth Stone"     ,[ 5,0 ,  5,0 ,  6,0 ,  6,0 ,  5,0 ,  5,0]);
    var brickBlock = new Block("Brick"            ,[ 7,0 ,  7,0 ,  7,0 ,  7,0 ,  7,0 ,  7,0]);
    var dynamBlock = new Block("Explosives"       ,[ 8,0 ,  8,0 ,  9,0 , 10,0 ,  8,0 ,  8,0]);
    var chestBlock = new Block("Chest"            ,[11,1 , 10,1 ,  9,1 ,  9,1 , 10,1 , 10,1]);
    var craftBlock = new Block("Crafting Table"   ,[11,3 , 11,3 , 11,2 ,  4,0 , 12,3 , 12,3]);
    var furnaBlock = new Block("Furnace"          ,[12,2 , 13,2 ,  0,1 ,  0,1 , 13,2 , 13,2]);
    var jukeyBlock = new Block("Jukebox"          ,[10,4 , 10,4 , 11,4 , 10,4 , 10,4 , 10,4]);
    var clayuBlock = new Block("Clay"             ,[ 8,4 ,  8,4 ,  8,4 ,  8,4 ,  8,4 ,  8,4]);
    var whoolBlock = new Block("White Whool"      ,[ 0,4 ,  0,4 ,  0,4 ,  0,4 ,  0,4 ,  0,4]);
    var booksBlock = new Block("Bookshelf"        ,[ 3,2 ,  3,2 ,  4,0 ,  4,0 ,  3,2 ,  3,2]);
    var spongBlock = new Block("Sponge"           ,[ 0,3 ,  0,3 ,  0,3 ,  0,3 ,  0,3 ,  0,3]);
    
    var goldyBlock = new Block("Gold Block"   ,[7,2 , 7,2 , 7,1 , 7,3 , 7,2 , 7,2]);
    var ironyBlock = new Block("Iron Block"   ,[6,2 , 6,2 , 6,1 , 6,3 , 6,2 , 6,2]);
    var diamyBlock = new Block("Diamond Block",[8,2 , 8,2 , 8,1 , 8,3 , 8,2 , 8,2]);

    var debugBlock = new Block("Debug Block",[1,7 , 2,7 , 1,8 , 2,8 , 1,9 , 2,9]);
    
    var blocks=[ grassBlock , stoneBlock , dirtyBlock , sandyBlock , gravlBlock , loggyBlock , obsidBlock , pumpdBlock,
		 goldoBlock , ironoBlock , coaloBlock , diamoBlock , reddoBlock,
		 beddyBlock , netheBlock , glowyBlock,
		 cobblBlock , gobblBlock , plankBlock , smothBlock , brickBlock , dynamBlock , chestBlock , craftBlock , furnaBlock , jukeyBlock , clayuBlock , whoolBlock , booksBlock , spongBlock,
		 goldyBlock , ironyBlock , diamyBlock,
		 debugBlock ];

    var tWorld = new World(16,128,16 , Math.random() , blocks);

    /*if(gl_mode == 2) {
        debug.log("[ GL ] (WGL2) Creating Vertex Array Object\n");
        
        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao); }*/

    wvao.bind();

    var proMat = mat4.create();
    mat4.identity     (proMat);
    mat4.perspective  (proMat,Math.radians(90.0),gl_aspect,0.1,500.0);

    var vieMat = mat4.create();
    mat4.identity     (vieMat);

    var modMat = mat4.create();
    mat4.identity     (modMat);

    var terrain=loadTexture(gl,"terrain.png");

    setInterval(loop,16);

    var camPos=vec3.create();
    var cx=0,cy=-128,cz=0;
    var dx,dy,dz;
    var rx,ry,rz;

    var currBlock=1;

    var canMoveF=true,canMoveB=true,canMoveL=true,canMoveR=true;
    var moveFW=false,moveBW=false,moveLW=false,moveRW=false,moveUW=false,moveDW=false;
    var moveSpeed=0.125;

    var isJumping=false;
    var fullJumpSpeed=0.175;
    var progJumpSpeed=0.0075;
    var realJumpSpeed=0.0;

    var canJump=false;
    var shouldJump=false;
    
    var progGravity=0.0075;
    var realGravity=0.0;

    var upHolder = function() {
	if(currBlock<1) currBlock=0;
	if(currBlock>blocks.length) currBlock=blocks.length;
	debug.log("Active Block : " + blocks[currBlock-1].name + " Index : " + currBlock + "\n"); }

    onScroll = function(V) { }

    window.addEventListener("mousedown", function(event) {
	for(var i=0.0; i<10.0; i+=0.1) {
	    var posx=-cx-(dx*i);
	    var posy=-cy-(dy*i);
	    var posz=-cz-(dz*i);
	    if(isColliding(posx,posy,posz)) {
		var col=getCollider(posx,posy,posz);

		if(!(currBlock<=0)) {
		    var face=col.getDirection(posx,posy,posz);
		    
		    switch(face) {
		    case 0:
			posx-=1;
			break;
		    case 1:
			debug.log("posx\n");
			posx+=1;
			break;
			
		    case 2:
			posy-=1;
			break;
		    case 3:
			debug.log("posy\n");
			posy+=1;
			break;
			
		    case 4:
			posz-=1;
			break;
		    case 5:
			debug.log("posz\n");
			posz+=1;
			break; } }
		
		var npx=Math.floor(posx);
		var npy=Math.floor(posy);
		var npz=Math.floor(posz);

		var cpx=Math.floor(npx/16)*16;
		var cpz=Math.floor(npz/16)*16;

		var p=tWorld.getChunkIndex(cpx,cpz);

		if(p!=null&&tWorld.chunks[p]!=null)
		    tWorld.chunks[p].changeBlock(npx-cpx,npy,npz-cpz,currBlock);
		
		break;
	    }
	}
    }, true);

    window.addEventListener("keyup", function(event) {
	switch(event.keyCode) {
	case 87:
	    moveFW=false;
	    break;
	case 83:
	    moveBW=false;
	    break;
	case 65:
	    moveLW=false;
	    break;
	case 68:
	    moveRW=false;
	    break;
	case 32:
	    moveUW=false;
	    break;
	case 67:
	    moveDW=false;
	    break; }
    }, true);
    
    window.addEventListener("keydown", function(event) {
	switch(event.keyCode) {
	case 40:
	    currBlock-=1;
	    upHolder();
	    break;
	case 38:
	    currBlock+=1;
	    upHolder();
	    break;
	case 87:
	    moveFW=true;
	    break;
	case 83:
	    moveBW=true;
	    break;
	case 65:
	    moveLW=true;
	    break;
	case 68:
	    moveRW=true;
	    break;
	case 32:
	    moveUW=true;
	    break;
	case 67:
	    moveDW=true;
	    break; }
    }, true);

    function getCollider(X,Y,Z) {
	for(var i=0;i<tWorld.chunks.length;++i) {
	    for(var b=0;b<tWorld.chunks[i].collider.length;++b) {
		if(tWorld.chunks[i].collider[b].isSolid(X,Y,Z)) {
		    return tWorld.chunks[i].collider[b]; } } }
	return null; }

    function isColliding(X,Y,Z) {
	for(var i=0;i<tWorld.chunks.length;++i) {
	    for(var b=0;b<tWorld.chunks[i].collider.length;++b) {
		if(tWorld.chunks[i].collider[b].isSolid(X,Y,Z)) {
		    // debug.log("Hit Block at : " + tWorld.chunks[i].collider[b].posx + " " + tWorld.chunks[i].collider[b].posy + " " + tWorld.chunks[i].collider[b].posz+"\n");
		    // debug.log("Pos at : " + X + " " + Y + " " + Z + "\n");
		    return true; } } }
	return false; }

    function loop() {
	wvao.bind();
	
	if(moveFW) {
	    if(canMoveF) cx+=dx*moveSpeed;
	    // cy+=dy*moveSpeed;
	    if(canMoveF) cz+=dz*moveSpeed; }
	else if(moveBW) {
	    if(canMoveB) cx-=dx*moveSpeed;
	    // cy-=dy*moveSpeed;
	    if(canMoveB) cz-=dz*moveSpeed; }

	if(moveLW) {
	    if(canMoveL) cx+=rx*moveSpeed;
	    // cy+=ry*moveSpeed;
	    if(canMoveL) cz+=rz*moveSpeed; }
	else if(moveRW) {
	    if(canMoveR) cx-=rx*moveSpeed;
	    // cy-=ry*moveSpeed;
	    if(canMoveR) cz-=rz*moveSpeed; }

	if(moveUW) {
	    if(canJump) {
		canJump=false;
		realJumpSpeed=fullJumpSpeed;
		isJumping=true;
		moveUW=false; }
	    else {
		shouldJump=true;
	    } }
	else if(moveDW) { }

	if(isColliding(-cx-dx,-cy-1.0,-cz-dz)) {
	    canMoveF=false;
	} else {
	    canMoveF=true; }

	if(isColliding(-cx+dx,-cy-1.0,-cz+dz)) {
	    canMoveB=false;
	} else {
	    canMoveB=true; }

	if(isColliding(-cx-rx,-cy-1.0,-cz-rz)) {
	    canMoveL=false;
	} else {
	    canMoveL=true; }

	if(isColliding(-cx+rx,-cy-1.0,-cz+rz)) {
	    canMoveR=false;
	} else {
	    canMoveR=true; }

	/*if(isColliding(-cx+0.5,-cy-1,-cz)) {
	    canMoveNX=false;
	} else {
	    canMoveNX=true; }*/

	if(cy<=-5&&!isColliding(-cx,-cy-2,-cz)||realJumpSpeed==fullJumpSpeed) {
	    if(!isJumping) {
		realGravity+=progGravity;
		cy+=realGravity;
		canJump=false;
	    } else {
		realJumpSpeed-=progJumpSpeed;
		cy-=realJumpSpeed; }
	} else {
	    canJump=true;
	    cy=Math.floor(cy);
	    realJumpSpeed=0.0;
	    isJumping=false;
	    realGravity=0.0;
	    if(shouldJump) {
		shouldJump=false;
		realJumpSpeed=fullJumpSpeed;
		isJumping=true; } }
	
	gl.enable   (gl.CULL_FACE );
	gl.enable   (gl.DEPTH_TEST);
	gl.depthFunc(   gl.LESS   );

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, terrain);

	tWorld.scan(-cx,-cz,128);
	
	mat4.identity (vieMat);
	mat4.rotate   (vieMat,vieMat,Math.radians(mouseY),vec3.fromValues(1.0,0.0,0.0));
	mat4.rotate   (vieMat,vieMat,Math.radians(mouseX),vec3.fromValues(0.0,1.0,0.0));
	
	mat4.translate(vieMat,vieMat,vec3.fromValues(cx,cy,cz));

	var ndv=vec3.create();
	vec3.normalize(ndv,vec3.fromValues(vieMat[2],vieMat[6],vieMat[10]));
	
	dx=ndv[0];
	dy=ndv[1];
	dz=ndv[2];

	vec3.normalize(ndv,vec3.fromValues(vieMat[0],vieMat[4],vieMat[8]));

	rx=ndv[0]*1.5;
	ry=ndv[1]*1.5;
	rz=ndv[2]*1.5;

	var ccd=1.0/256.0;
	gl.clearColor(ccd*134.0,ccd*200.0,ccd*244.0,1.0);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

/*	gl.useProgram(shadSol.glid);

	gl.uniformMatrix4fv(solvie,false,vieMat);
	gl.uniformMatrix4fv(solpro,false,proMat);

	var emod=mat4.create();
	mat4.identity(emod);

	gl.uniformMatrix4fv(solmod,false,emod);

	var ting=gl.getAttribLocation(shadSol.glid,"pos");
	
	gl.enableVertexAttribArray(ting);
	
	for(var i=0;i<tWorld.chunks.length;++i) {
	    gl.bindBuffer(gl.ARRAY_BUFFER,tWorld.chunks[i].pbuffer.glid);
	    gl.vertexAttribPointer(ting,3,gl.FLOAT,false,0,0);
	    
	    gl.drawArrays(gl.POINTS, 0, tWorld.chunks[i].debugPoints.length/3); }*/

	gl.useProgram(shadUv.glid);
	gl.uniform1i(uvtex,0);
	
	gl.uniformMatrix4fv(uvvie,false,vieMat);
	gl.uniformMatrix4fv(uvpro,false,proMat);

	for(var i=0;i<tWorld.chunks.length;++i) {
	    tWorld.chunks[i].vao.bind();
	    gl.uniformMatrix4fv(uvmod,false,tWorld.chunks[i].matrix);
	    /*gl.enableVertexAttribArray(0);
	    gl.enableVertexAttribArray(1);
	    gl.enableVertexAttribArray(2);
	    
	    gl.uniformMatrix4fv(uvmod,false,tWorld.chunks[i].matrix);
	    
	    gl.bindBuffer(gl.ARRAY_BUFFER,tWorld.chunks[i].vbuffer.glid);
	    gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
	    
	    gl.bindBuffer(gl.ARRAY_BUFFER,tWorld.chunks[i].ubuffer.glid);
	    gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0);

	    gl.bindBuffer(gl.ARRAY_BUFFER,tWorld.chunks[i].nbuffer.glid);
	    gl.vertexAttribPointer(2,3,gl.FLOAT,false,0,0);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,tWorld.chunks[i].ibuffer.glid);*/
            gl.drawElements(gl.TRIANGLES,tWorld.chunks[i].indices.length,gl.UNSIGNED_INT,0);
	}

	mouseWheel = 0;
    }
}

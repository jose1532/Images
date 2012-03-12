qx.Class.define("desk.volumeSlice", 
{
  extend : qx.core.Object,

	construct : function(file, fileBrowser, orientation, parameters)
	{
		this.base(arguments);

		this.setOrientation(orientation);

		if (parameters!=null) {
			if (parameters.imageFormat!=null) {
				this.setImageFormat(parameters.imageFormat);
			}

			if (parameters.colors!=null) {
				this.setLookupTables(parameters.colors);
			}
		}
		

		this.__image=new Image();
		this.__canvas = new qx.ui.embed.Canvas();
		this.__originalImageCanvas = new qx.ui.embed.Canvas();

		this.__fileBrowser=fileBrowser;
		this.__file=file;
		this.update();

		this.__initChangeSliceTrigger();

		this.addListener("changeImageFormat", function(){
				this.update();
			},this);

		return (this);		
	},

	properties : {
		slice : { init : 0, check: "Number", event : "changeSlice"},
		imageFormat : { init : 1, check: "Number", event : "changeImageFormat"},
		ready : { init : false, check: "Boolean", event : "changeReady"},
		orientation : { init : 0, check: "Number", event : "changeOrientation"}
	},

	events : {
		// the "changeSlice" event is fired whenever the image changes
		"changeImage" : "qx.event.type.Event"
	},

	members : {

		__availableImageFormat : null,

		__fileBrowser : null,
		__file : null,

		__path : null,
		__offset : null,
		__prefix : null,
		__image : null,
		__canvas : null,

		__timestamp : null,
		__fileFormatBox : null,

		__extent : null,
		__origin : null,
		__spacing : null,
		__dimensions: null,

		__scalarTypeString : null,
		__scalarType : null,
		__scalarSize : null,
		__scalarMin : null,
		__scalarMax : null,

		//THREE.js objects
		__scene : null,
		__camera : null,
		__renderer : null,
		__controls : null,

		__brightness : 0,
		__contrast : 1,

		__lookupTableRed : null,
		__lookupTableGreen : null,
		__lookupTableBlue : null,

		getFileName : function () {
			return this.__file;
		},

		getDimensions : function () {
			return this.__dimensions;
		},

		getExtent : function () {
			return this.__extent;
		},

		getOrigin : function () {
			return this.__origin;
		},

		getSpacing : function () {
			return this.__spacing;
		},

		getScalarType : function () {
			return this.__scalarType;
		},

		getScalarTypeAsString : function () {
			return this.__scalarTypeString;
		},

		getScalarSize : function () {
			return this.__scalarSize;
		},

		getScalarBounds : function () {
			return [this.__scalarMin, this.__scalarMax];
		},

		update : function () {
			var _this=this;
			if (this.__fileBrowser==null)
				alert ("error! no file browser was provided");
			else
			{
				function getAnswer(e)
					{
						var req = e.getTarget();
						var slicesDirectory=req.getResponseText().split("\n")[0];
						_this.openXMLURL(_this.__fileBrowser.getFileURL(slicesDirectory)+"/volume.xml");
					}

				var parameterMap={
					action : "slice_volume",
					input_volume : this.__file,
					output_directory : "cache\/",
					format : this.getImageFormat(),
					slice_orientation : this.getOrientation()};
				this.__fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);
			}
		},

		getBrightness : function () {
			return (this.__brightness);
		},

		getContrast : function () {
			return (this.__contrast);
		},

		setBrightnessAndContrast : function (brightness, contrast)
		{
			this.__brightness=brightness;
			this.__contrast=contrast;
			this.redraw();
		},

		getDimensions : function () {
			return this.__dimensions;
		},

		getSlicesIdOffset : function () {
			return this.__offset;
		},

		setLookupTables : function ( luts ) {
			this.__lookupTableRed=luts[0];
			this.__lookupTableGreen=luts[1];
			this.__lookupTableBlue=luts[2];
			if (this.isReady()) {
				this.redraw();
			}
		},

		getLookupTables : function () {
			return [this.__lookupTableRed, this.__lookupTableGreen, this.__lookupTableBlue];
		},

		removeLookupTables : function () {
			this.__lookupTableRed=null;
			this.__lookupTableGreen=null;
			this.__lookupTableBlue=null;
			if (this.isReady()) {
				this.redraw();
			}
		},

		getImageCanvas : function(){
			return this.__canvas;
		},

		getCornersCoordinates : function () {
			switch (this.getOrientation())
			{
			// XY Z
			case 0 :
			default:
				var z=this.__origin[2]+(this.getSlice()+this.__extent[4])*this.__spacing[2];
				var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
				var xmax=this.__origin[0]+this.__extent[1]*this.__spacing[0];
				var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
				var ymax=this.__origin[1]+this.__extent[3]*this.__spacing[1];
				var coordinates=[];
				coordinates[0]=xmin;
				coordinates[1]=ymin;
				coordinates[2]=z;
				coordinates[3]=xmax;
				coordinates[4]=ymin;
				coordinates[5]=z;
				coordinates[6]=xmax;
				coordinates[7]=ymax;
				coordinates[8]=z;
				coordinates[9]=xmin;
				coordinates[10]=ymax;
				coordinates[11]=z;
				return (coordinates);
			// ZY X
			case 1 :
				var x=this.__origin[0]+(this.getSlice()+this.__extent[0])*this.__spacing[0];
				var ymin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
				var ymax=this.__origin[2]+this.__extent[5]*this.__spacing[2];
				var zmin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
				var zmax=this.__origin[1]+this.__extent[3]*this.__spacing[1];
				var coordinates=[];
				coordinates[0]=x;
				coordinates[1]=zmin;
				coordinates[2]=ymin;
				coordinates[3]=x;
				coordinates[4]=zmin;
				coordinates[5]=ymax;
				coordinates[6]=x;
				coordinates[7]=zmax;
				coordinates[8]=ymax;
				coordinates[9]=x;
				coordinates[10]=zmax;
				coordinates[11]=ymin;
				return (coordinates);
			// XZ Y
			case 2 :
				var y=this.__origin[1]+(this.getSlice()+this.__extent[2])*this.__spacing[1];
				var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
				var xmax=this.__origin[0]+this.__extent[1]*this.__spacing[0];
				var zmin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
				var zmax=this.__origin[2]+this.__extent[5]*this.__spacing[2];
				var coordinates=[];
				coordinates[0]=xmin;
				coordinates[1]=y;
				coordinates[2]=zmin;
				coordinates[3]=xmax;
				coordinates[4]=y;
				coordinates[5]=zmin;
				coordinates[6]=xmax;
				coordinates[7]=y;
				coordinates[8]=zmax;
				coordinates[9]=xmin;
				coordinates[10]=y;
				coordinates[11]=zmax;
				return (coordinates);
			}
		},

		getBoundingBoxDiagonalLength : function () {
			var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
			var xmax=this.__origin[0]+this.__extent[1]*this.__spacing[0];
			var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
			var ymax=this.__origin[1]+this.__extent[3]*this.__spacing[1];
			var zmin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
			var zmax=this.__origin[2]+this.__extent[5]*this.__spacing[2];
			return Math.sqrt((xmax-xmin)*(xmax-xmin)+
								(ymax-ymin)*(ymax-ymin)+
								(zmax-zmin)*(zmax-zmin));
		},

		get2DDimensions: function () {
			var dims=[];
			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					dims[0]=this.__dimensions[2];
					dims[1]=this.__dimensions[1];
					break;
				// XZ Y
				case 2 :
					dims[0]=this.__dimensions[0];
					dims[1]=this.__dimensions[2];
					break;
				// XY Z
				default :
					dims[0]=this.__dimensions[0];
					dims[1]=this.__dimensions[1];
			}
			return (dims);
		},

		get2DCornersCoordinates : function () {
			var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
			var xmax=this.__origin[0]+this.__extent[1]*this.__spacing[0];
			var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
			var ymax=this.__origin[1]+this.__extent[3]*this.__spacing[1];
			var zmin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
			var zmax=this.__origin[2]+this.__extent[5]*this.__spacing[2];
			var coordinates=[];

			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					coordinates[0]=zmin;
					coordinates[1]=ymax;
					coordinates[2]=zmax;
					coordinates[3]=ymax;
					coordinates[4]=zmax;
					coordinates[5]=ymin;
					coordinates[6]=zmin;
					coordinates[7]=ymin;
					break;
				// XZ Y
				case 2 :
					coordinates[0]=xmin;
					coordinates[1]=zmax;
					coordinates[2]=xmax;
					coordinates[3]=zmax;
					coordinates[4]=xmax;
					coordinates[5]=zmin;
					coordinates[6]=xmin;
					coordinates[7]=zmin;
					break;
				// XY Z
				default :
					coordinates[0]=xmin;
					coordinates[1]=ymax;
					coordinates[2]=xmax;
					coordinates[3]=ymax;
					coordinates[4]=xmax;
					coordinates[5]=ymin;
					coordinates[6]=xmin;
					coordinates[7]=ymin;
			}
			return (coordinates);
		},

		getNumberOfSlices : function () {
			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					return this.__dimensions[0];
				// XZ Y
				case 2 :
					return this.__dimensions[1];
				// XY Z
				default :
					return this.__dimensions[2];
			}
		},

		openXMLURL : function (xmlURL) {

			var xmlhttp=new XMLHttpRequest();
			xmlhttp.open("GET",xmlURL+"?nocache=" + Math.random(),true);
			var _this=this;

			xmlhttp.onreadystatechange = function() {
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(xmlhttp.responseXML!=null)
					{
						var response = xmlhttp.responseXML;
						_this.__parseXMLresponse(response,xmlURL);
					}
					else
						alert("open volume slice : Failure...");
				}
				else if (xmlhttp.readyState == 4 && xmlhttp.status != 200)
				{
					// fetched the wrong page or network error...
					alert('open volume slice : "Fetched the wrong page" OR "Network error"');
				}
			}
			xmlhttp.send();
		},

		__parseXMLresponse : function (xmlDoc, xmlURL) {

			this.__availableImageFormat=this.getImageFormat();

			var volume=xmlDoc.getElementsByTagName("volume")[0];
			if (volume==null)
				return;

			// parse extent, dimensions, origin, spacing
			var XMLextent=volume.getElementsByTagName("extent")[0];
			this.__extent=new Array(parseInt(XMLextent.getAttribute("x1")),
							parseInt(XMLextent.getAttribute("x2")),
							parseInt(XMLextent.getAttribute("y1")),
							parseInt(XMLextent.getAttribute("y2")),
							parseInt(XMLextent.getAttribute("z1")),
							parseInt(XMLextent.getAttribute("z2")));

			var XMLdimensions=volume.getElementsByTagName("dimensions")[0];

			this.__dimensions=new Array(parseInt(XMLdimensions.getAttribute("x")),
							parseInt(XMLdimensions.getAttribute("y")),
							parseInt(XMLdimensions.getAttribute("z")));

			var XMLspacing=volume.getElementsByTagName("spacing")[0];
			this.__spacing=new Array(parseFloat(XMLspacing.getAttribute("x")),
							parseFloat(XMLspacing.getAttribute("y")),
							parseFloat(XMLspacing.getAttribute("z")));

			var XMLorigin=volume.getElementsByTagName("origin")[0];
			this.__origin=new Array(parseFloat(XMLorigin.getAttribute("x")),
							parseFloat(XMLorigin.getAttribute("y")),
							parseFloat(XMLorigin.getAttribute("z")));

			var XMLscalars=volume.getElementsByTagName("scalars")[0];
			this.__scalarType=parseInt(XMLscalars.getAttribute("type"),10);
			this.__scalarSize=parseInt(XMLscalars.getAttribute("size"),10);
			this.__scalarMin=parseFloat(XMLscalars.getAttribute("min"),10);
			this.__scalarMax=parseFloat(XMLscalars.getAttribute("max"),10);
			this.__scalarTypeString=XMLscalars.childNodes[0].nodeValue;;

			var slices=volume.getElementsByTagName("slicesprefix")[0];
			this.__offset=parseInt(slices.getAttribute("offset"));
			this.__timestamp=slices.getAttribute("timestamp");
			if (this.__timestamp==null)
				this.__timestamp=Math.random();
			this.__prefix=slices.childNodes[0].nodeValue;

			var slashIndex=xmlURL.lastIndexOf("/");
			this.__path="";
			if (slashIndex>0)
				this.__path=xmlURL.substring(0,slashIndex)+"\/";

			var dims=this.get2DDimensions();

			this.__canvas.set({
				canvasWidth: dims[0],
				canvasHeight: dims[1],
				width: dims[0],
				height: dims[1],
				syncDimension: true
				});

			this.__originalImageCanvas.set({
				canvasWidth: dims[0],
				canvasHeight: dims[1],
				width: dims[0],
				height: dims[1],
				syncDimension: true
				});

			this.__updateTriggered=true;
			this.__updateImage();
		},

		__applyBrightnessToCanvas : function () {
			var canvas=this.__originalImageCanvas;
			var dataDesc = canvas.getContext2d().getImageData
					(0, 0, canvas.getCanvasWidth(), canvas.getCanvasHeight());

			var data = dataDesc.data;

			var pix = data.length, pix1, pix2;
			var p= pix/4;
			var mul, add;
			var legacy=true;
			var contrast=this.__contrast;
			var brightness=this.__brightness;
			var brightMul=1;

			if (contrast != 1) {
				if (legacy) {
					mul = contrast;
					add = (brightness - 128) * contrast + 128;
				} else {
					mul = brightMul * contrast;
					add = - contrast * 128 + 128;
				}
			} else {  // this if-then is not necessary anymore, is it?
				if (legacy) {
					mul = 1;
					add = brightness;
				} else {
					mul = brightMul;
					add = 0;
				}
			}

			var r, g, b,a,c;
			var r1=1/256;
			var r2=1/(256*256);
			var max=this.__scalarMax;
			var min=this.__scalarMin;
			var shift=-min;
			var scale=255/(max-min);
			
			if (this.__availableImageFormat==0)
			{
				switch (this.__scalarSize)
				{
				case 1:
					if (this.__scalarType==3)
					{
						pix=0;
					// unsigned char: no need to check for sign
						while (p--) {
							c=data[pix];
							c=(c+shift)*scale;
							c=c* mul + add;
							
							if (c>255)
								c=255;
							else if (c<0)
								c=0;
							data[pix++]=c;
							data[pix++]=c;
							data[pix++]=c;
							data[pix++]=255;
							}
						}
						else
						{
							pix=0;
							while (p--) {
								c=data[pix];
								if (c>127)
									c-=256;
								c=(c+shift)*scale;
								c=c* mul + add;
								
								if (c>255)
									c=255;
								else if (c<0)
									c=0;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=255;
							}
						}
						break;
					case 2:
						if (this.__scalarType==4)
						{
						// signed short : need to check for sign
							pix=0;
							while (p--){
								r= data[pix];
								g= data[pix+1];
								c=r+256*g;
								// check sign
								if (g>127)
									c-=65536;
								c=(c+shift)*scale;
								c=c* mul + add;
								
								if (c>255)
									c=255;
								else if (c<0)
									c=0;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=255;
							}
						}
						else
						{
						// unsigned short : no need to check sign
							pix=0;
							while (p--){
								r= data[pix];
								g= data[pix+1];
								c=r+256*g;
								c=(c+shift)*scale;
								c=c* mul + add;
								if (c>255)
									c=255;
								else if (c<0)
									c=0;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=255;
							}
						}
						break;
					case 4:
						if (this.__scalarType==7)
						{
							// unsigned int : no need to check sign
							pix=0;
							while (p--){
								r= data[pix];
								g= data[pix+1];
								b= data[pix+2];
								a= data[pix+3];
								c=r+256*g+65536*b;
								c=(c+shift)*scale;
								c=c* mul + add;
								if (c>255)
								c=255;
								else if (c<0)
								c=0;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=255;
							}
						}
						else
						{
							// signed int : check sign
							pix=0;
							while (p--){
								r= data[pix];
								g= data[pix+1];
								b= data[pix+2];
								a= data[pix+3];
								c=r+256*g+65536*b;
								if (c>8388607)
									c-=16777216;
								c=(c+shift)*scale;
								c=c* mul + add;
								if (c>255)
									c=255;
								else if (c<0)
									c=0;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=c;
								data[pix++]=255;
							}
						}
						break;
						default :
							alert("format not supported. please repport");
				}
			}
			else
			{
				// format is jpeg : just copy the pixels
				pix=0;
				while (p--){
					c= data[pix];
					c=c* mul + add;
					if (c>255)
						c=255;
					else if (c<0)
						c=0;
					data[pix++]=c;
					data[pix++]=c;
					data[pix++]=c;
					data[pix++]=255;
					}
			}
			dataDesc.data = data;
			this.__canvas.getContext2d().putImageData(dataDesc,0,0);
			return;
		},

		__applyLookupTablesToCanvas : function () {
			var canvas=this.__originalImageCanvas;
			var dataDesc = canvas.getContext2d().getImageData
					(0, 0, canvas.getCanvasWidth(), canvas.getCanvasHeight());

			var data = dataDesc.data;

			var pix=0;
			var p= data.length/4;
			var r, g, b,a,c;

			var max=this.__scalarMax;
			var min=this.__scalarMin;

			var redArray=this.__lookupTableRed;
			var greenArray=this.__lookupTableGreen;
			var blueArray=this.__lookupTableBlue;

			if (this.__availableImageFormat==0)
			{
				switch (this.__scalarSize)
				{
				case 1:
					if (this.__scalarType==3)
					{
						pix=0;
					// unsigned char: no need to check for sign
						while (p--) {
							r= data[pix];
							data[pix++]=redArray[r];
							data[pix++]=greenArray[r];
							data[pix++]=blueArray[r];
							data[pix++]=255;
							}
						}
						else
						{
							pix=0;
							// to finish...
							while (p--) {
								r= data[pix];
								data[pix++]=redArray[r];
								data[pix++]=greenArray[r];
								data[pix++]=blueArray[r];
								data[pix++]=255;
								}
						}
						break;
					case 2:
						if (this.__scalarType==4)
						{
						// signed short : need to check for sign
							pix=0;
							// to finish...
							while (p--) {
								r= data[pix];
								data[pix++]=redArray[r];
								data[pix++]=greenArray[r];
								data[pix++]=blueArray[r];
								data[pix++]=255;
								}
						}
						else
						{
						// unsigned short : no need to check sign
							pix=0;
							// to finish...
							while (p--) {
								r= data[pix];
								data[pix++]=redArray[r];
								data[pix++]=greenArray[r];
								data[pix++]=blueArray[r];
								data[pix++]=255;
								}
						}
						break;
					case 4:
						if (this.__scalarType==7)
						{
							// unsigned int : no need to check sign
							pix=0;
							// to finish...
							while (p--) {
								r= data[pix];
								data[pix++]=redArray[r];
								data[pix++]=greenArray[r];
								data[pix++]=blueArray[r];
								data[pix++]=255;
								}
						}
						else
						{
							// signed int : check sign
							pix=0;
							while (p--){
								r= data[pix];
								data[pix++]=redArray[r];
								data[pix++]=greenArray[r];
								data[pix++]=blueArray[r];
								data[pix++]=255;
							}
						}
						break;
						default :
							alert("format not supported. please repport");
				}
			}
			else
			{
				// format is jpeg : just copy the pixels
				// to finish...
				while (p--) {
					r= data[pix];
					data[pix++]=redArray[r];
					data[pix++]=greenArray[r];
					data[pix++]=blueArray[r];
					data[pix++]=255;
					}
			}
			dataDesc.data = data;
			this.__canvas.getContext2d().putImageData(dataDesc,0,0);
			return;
		},

		redraw : function () {
			if (this.__lookupTableRed!=null) {
				this.__applyLookupTablesToCanvas();
			}
			else {
				this.__applyBrightnessToCanvas();
			}
			this.setReady(true);
			this.fireEvent("changeImage");
		},

		__updateTriggered : true,
		__updateInProgress : false,

		__initChangeSliceTrigger : function () {
			this.addListener("changeSlice", function(){
				this.__updateTriggered=true;
				this.__updateImage();
			},this);

			var _this=this;
			this.__image.onload=function(){
				_this.__originalImageCanvas.getContext2d().drawImage(_this.__image, 0, 0);
				_this.redraw();
				_this.__updateInProgress=false;
				_this.__updateImage();
				};
		},

		__updateImage : function () {
			if (this.__updateInProgress) {
				this.__updateTriggered=true;
				return;
			}
			if (this.__updateTriggered) {
				this.__reallyUpdateImage();
			}
		},

		__reallyUpdateImage : function() {
			var fileSuffix;
			if (this.__availableImageFormat==0) {
				fileSuffix=".png";
			}
			else {
				fileSuffix=".jpg";
			}

			var orientationString;
			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					orientationString="ZY";
					break;
				// XZ Y
				case 2 :
					orientationString="XZ";
					break;
				// XY Z
				default :
					orientationString="XY";
					break;
				}
			this.__updateInProgress=true;
			this.__updateTriggered=false;
			this.__image.src=this.__path+this.__prefix+orientationString+(this.__offset+this.getSlice())
				+fileSuffix+"?nocache="+this.__timestamp;
		}
	}
});

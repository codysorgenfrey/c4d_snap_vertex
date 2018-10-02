//©June 2018 Cody Sorgenfrey
//
//Snaps points of shapes and masks to pixel
// 
//version history
//1.0 Initial release. June 2018

var proj = app.project;
var undoStr = "Snap Vertex";
var fvt_scriptName = "Snap Vertex";
var fvt_version = "1.0";
var numLayers = 0;

function buildUI(thisObj){
    if (thisObj instanceof Panel) {
        var myPal = thisObj;
    } else {
        var myPal = new Window("palette",fvt_scriptName + " v" + fvt_version,undefined, {resizeable:true});
    }

    if (myPal != null) {
        var res =
        "group { \
                alignment: ['fill', 'fill'], \
                alignChildren: ['left','top'], \
                orientation: 'column', \
            toolsGrp: Panel { \
                alignment: ['fill','top'], \
                alignChildren: ['left','top'], \
                orientation: 'row', \
                text:'Tools', \
                maskToolsGrp: Group { \
                    orientation: 'row', \
                    alignment: ['fill','top'], \
                    selectMaskBtn: Button {text: 'Select masks', alignment:['fill','center']}, \
                },\
                shapeToolsGrp: Group { \
                    orientation: 'row', \
                    alignment: ['fill','top'], \
                    selectShapeBtn: Button {text: 'Select shapes', alignment:['fill','center']}, \
                }\
            }, \
            btnGrp: Group { \
                orientation: 'row', \
                alignment: ['fill','top'], \
                helpBtn: Button {text: '?', alignment:['left','top']},\
                editBtn: Button {text:'Snap', alignment:['fill','top']}, \
            } \
        }";
        
        myPal.grp = myPal.add(res);
        
        // Add fuctions to buttons
        myPal.grp.btnGrp.editBtn.onClick = snap;
        myPal.grp.btnGrp.helpBtn.onClick = helpFunc;
        myPal.grp.toolsGrp.maskToolsGrp.selectMaskBtn.onClick = selectAllMasks;
        myPal.grp.toolsGrp.shapeToolsGrp.selectShapeBtn.onClick = selectAllShapes;

        // -- Final Cleanup
        myPal.layout.layout(true);
        myPal.layout.resize();
        myPal.onResizing = myPal.onResize = function () {this.layout.resize();}
    }
    return myPal;
}

function helpFunc(){
	var btnPnlResource =
	"Panel { \
		alignment: ['fill', 'fill'], \
		alignChildren: ['left','top'], \
		orientation:'column', \
		text: 'Help', \
		helpGrp: Group { \
            orientation: 'column', \
            alignment: ['fill','top'], \
            helpText: StaticText { text:'Snap Vertex will snap your shape or masks verticies to be on pixel, as well as align all of the layers transforms to be on pixel.', alignment:['fill','center'], properties:{multiline:true} }\
        }\
	}";
	dlg = new Window("palette",fvt_scriptName + " v" + fvt_version,undefined, {resizeable:true});
	dlg.add(btnPnlResource);
	dlg.show();
}

function selectAllMasks(){
    var selectedLayers = app.project.activeItem.selectedLayers;
    
	for (x=0;x<selectedLayers.length;x++){
	    var Masks = selectedLayers[x].property("ADBE Mask Parade");
	    for (y=1;y<=Masks.numProperties;y++){
		    Masks.property(y).selected = true;
	    }
    }   
}
function selectAllShapes(){
    var selectedLayers = app.project.activeItem.selectedLayers;
    
	for (x=0;x<selectedLayers.length;x++){
	    var shapeContents = selectedLayers[x].property("ADBE Root Vectors Group");
        selectShapes(shapeContents);
    }   
}

function selectShapes(propParent){
	if (propParent !== null){
		var prop;
		
		for (var i=1; i<=propParent.numProperties; i++)
		{
			prop = propParent.property(i);
			switch (prop.propertyType)
			{
				case PropertyType.INDEXED_GROUP:
					selectShapes(prop);
					break;
				case PropertyType.NAMED_GROUP:
					if (prop.matchName == "ADBE Vector Shape - Group" ||
						prop.matchName == "ADBE Vector Shape - Rect" ||
						prop.matchName == "ADBE Vector Shape - Ellipse" ||
						prop.matchName == "ADBE Vector Shape - Star"){
					    try{
						    prop.selected = true;
						}
						catch (e){alert(e);}
					}
					selectShapes(prop);
					break;
				default:
					break;
			}
		}
	}
}

function snapSelectedPoints(myMaskShape){
	var verts = myMaskShape.vertices;
	var newVerts = [];
	
	for (z=0;z<verts.length;z++){
		newVerts[z] = [Math.round(verts[z][0]), Math.round(verts[z][1])];
	}
	myMaskShape.vertices = newVerts;
	
	return myMaskShape;
}

function snapSelectedPositionAndAnchor(myProp){
	var position = myProp.transform.position.value;
	var anchor = myProp.transform.anchorPoint.value;
	for (y=0; y<position.length;y++){
		position[y] = Math.round(position[y]);
		anchor[y] = Math.round(anchor[y]);
	}
	myProp.transform.position.setValue(position);
	myProp.transform.anchorPoint.setValue(anchor);
}

function snap(){
	if (proj){
		var myComp = app.project.activeItem;
	
		if (myComp != null && (myComp instanceof CompItem)){
			app.beginUndoGroup(undoStr);
			var selectedProps = app.project.activeItem.selectedProperties;
			var selectedLayers = app.project.activeItem.selectedLayers;
	
			if (selectedLayers.length != 0){
				for (x=0;x<selectedLayers.length;x++){
					snapSelectedPositionAndAnchor(selectedLayers[x]);
				  }
		   
				if (selectedProps.length != 0){
					for (x=0;x<selectedProps.length;x++){
						if (selectedProps[x].maskShape){ //selection is mask
							selectedProps[x].maskShape.setValue(snapSelectedPoints(selectedProps[x].maskShape.value));
						} else { //selection is shape
							if (selectedProps[x].path){
								selectedProps[x].path.setValue(snapSelectedPoints(selectedProps[x].path.value));
							} else if (selectedProps[x].matchName == "ADBE Vector Shape - Rect"){
								var position = selectedProps[x]("ADBE Vector Rect Position").value;
								var size = selectedProps[x]("ADBE Vector Rect Size").value;
								for (y=0; y<position.length;y++){
									position[y] = Math.round(position[y]);
									size[y] = Math.round(size[y]);
								}
								selectedProps[x]("ADBE Vector Rect Position").setValue(position);
								selectedProps[x]("ADBE Vector Rect Size").setValue(size);
							} else if (selectedProps[x].matchName == "ADBE Vector Shape - Ellipse"){
								var position = selectedProps[x]("ADBE Vector Ellipse Position").value;
								var size = selectedProps[x]("ADBE Vector Ellipse Size").value;
								for (y=0; y<position.length;y++){
									position[y] = Math.round(position[y]);
									size[y] = Math.round(size[y]);
								}
								selectedProps[x]("ADBE Vector Ellipse Position").setValue(position);
								selectedProps[x]("ADBE Vector Ellipse Size").setValue(size);
							} else if (selectedProps[x].matchName == "ADBE Vector Shape - Star"){
								var position = selectedProps[x]("ADBE Vector Star Position").value;
								var outerRad = Math.round(selectedProps[x]("ADBE Vector Star Outer Radius").value);
								var rot = Math.round(selectedProps[x]("ADBE Vector Star Rotation").value);
								var innerRad = Math.round(selectedProps[x]("ADBE Vector Star Inner Radius").value);
								for (y=0; y<position.length;y++){
									position[y] = Math.round(position[y]);
								}
								selectedProps[x]("ADBE Vector Star Position").setValue(position);
								selectedProps[x]("ADBE Vector Star Outer Radius").setValue(outerRad);
								selectedProps[x]("ADBE Vector Star Rotation").setValue(rot);
								selectedProps[x]("ADBE Vector Star Inner Radius").setValue(innerRad);
							}
							var curProp = selectedProps[x].parentProperty;
							while(curProp != null){
								if (curProp.matchName == "ADBE Vector Group"){
									snapSelectedPositionAndAnchor(curProp);
								}
								curProp = curProp.parentProperty;
							}
						} 
					}				 
				}
				app.endUndoGroup();
			} else {
			alert("Please select at least one layer to use this script.");
			}
		} else {
		alert("Please select an active comp to use this script");
		}
	} else {
		alert("Please open a project first to use this script.");
	}
}

// -- Main
var myPanel = buildUI(this);
if (parseFloat(app.version) < 8) {
    alert("This script requires Adobe After Effects CS3 or later.");
} else {
    if (myPanel != null && myPanel instanceof Window) { myPanel.show(); }
}
 // End
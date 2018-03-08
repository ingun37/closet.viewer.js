function DoSomething(pattern, decorList, topstitchList) {

	var ret = [];
	var ThickParametricLineList = LoadDecorStitchList(decorList); //Shape2D -> m_DecorStitchList

	for(var k = 0 ; k < ThickParametricLineList.length ; ++k)
	{
		var thickregion = ThickParametricLineList[k].ThickRegionList;
		var type = ThickParametricLineList[k].ThickLineType;

		if(type === ThickLineType.FREE_STITCH_PUCKERING_THICKLINE || type === ThickLineType.SEAM_LINE_PUCKERING_THICKLINE || 
			type === ThickLineType.SEAM_LINE_STITCH_PUCKERING_THICKLINE || type === ThickLineType.GHOST_PUCKERING_THICKLINE)
			continue;

		for(var l = 0 ; l <  thickregion.length ; ++l)
		{
			var stitch = {StitchIndex: 0, Vertex: [], Index: null, TexCoord: null};
			var trianglePointArray = readByteArrayFromArrayBuffer("None", thickregion[l].TrianglePointList);
			for(var m = 0 ; m < trianglePointArray.length ; ++m)
			{
				var alpha = trianglePointArray[m].Alpha;
				var beta = trianglePointArray[m].Beta;
				var gamma = trianglePointArray[m].Gamma;

				var position3D_Index0 = pattern.Vertex[trianglePointArray[m].PtIndex[0]];
				var position3D_Index1 = pattern.Vertex[trianglePointArray[m].PtIndex[1]];
				var position3D_Index2 = pattern.Vertex[trianglePointArray[m].PtIndex[2]];

				var VertexPosition = {x: alpha * position3D_Index0.x + beta * position3D_Index1.x + gamma * position3D_Index2.x,
									  y: alpha * position3D_Index0.y + beta * position3D_Index1.y + gamma * position3D_Index2.y,
									  z: alpha * position3D_Index0.z + beta * position3D_Index1.z + gamma * position3D_Index2.z};

				stitch.Vertex.push(VertexPosition);
			}

			stitch.Index = readByteArray("Uint", thickregion[l].Index);
			stitch.TexCoord = readByteArray("Vec2", thickregion[l].TexCoord);
			stitch.StitchIndex = ThickParametricLineList[k].Index;

			ret.push(stitch);
		}
	}
	return ret;
}

function LoadDecorStitchList(decorList) {
	var ret = [];

	for(var j = 0 ; j < decorList.length ; ++j) {
		
		var ParametricLine = {Color: null, StartIndex: 0, EndIndex: 0, RatioStart: 0, RatioEnd: 0, Direction: false};
		var ThickParametricLine = {ThickRegionList: [], Flip: false, ExtendStart: false, ExtendEnd: false, ThickLineType: 0, Curved: false, Index: 0, ParamLine: null};
		
		var mapParamLine = decorList[j].get("mapParamLine");
		ParametricLine.Color = mapParamLine.get("v3Color");
		ParametricLine.StartIndex = mapParamLine.get("uiStartIndex");
		ParametricLine.EndIndex = mapParamLine.get("uiEndIndex");
		ParametricLine.RatioStart = mapParamLine.get("fRatioStart");
		ParametricLine.RatioEnd = mapParamLine.get("fRatioEnd");
		ParametricLine.Direction = mapParamLine.get("bDirection");
		
		ThickParametricLine.Flip = decorList[j].get("bFlip");
		ThickParametricLine.ExtendStart = decorList[j].get("bExtendStart");
		ThickParametricLine.ExtendEnd = decorList[j].get("bExtendEnd");
		ThickParametricLine.ThickLineType = decorList[j].get("enThickLineType");
		ThickParametricLine.Curved = decorList[j].get("bCurved");
		ThickParametricLine.Index = decorList[j].get("iIndex");
		ThickParametricLine.ParamLine = ParametricLine;

		var thickregionList = decorList[j].get("listThickRegion");
		//console.log("Decorlist" +j);
		for(var k = 0 ; k < thickregionList.length ; ++k)
		{
			if(thickregionList[k].get("arrTrianglePoint") === null)
			{
				//console.log("arr");
				continue;
			}
			//console.log("ThickRegion");
			var thickRegion = {TrianglePointList: null, Index: null, TexCoord: null};

			thickRegion.TrianglePointList = thickregionList[k].get("arrTrianglePoint");

			//console.log(thickRegion.TrianglePointList);
			thickRegion.Index = thickregionList[k].get("baIndex");

			//console.log(thickRegion.Index);
			thickRegion.TexCoord = thickregionList[k].get("baTexCoord");

			//console.log(thickRegion.TexCoord);
			ThickParametricLine.ThickRegionList.push(thickRegion);
		}
		ret.push(ThickParametricLine);
	}

	return ret;
}
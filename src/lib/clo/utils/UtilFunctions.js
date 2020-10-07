
function SafeDeallocation(object, type, type_cb, nontype_cb){
	if(object instanceof type){type_cb(object);}
	else{nontype_cb(object);}
}

function getAngle(x, y){
  var ret = 0.0;

  var v = new Vector2(x, y);
  v.normalize();

  if(v.x > 0)
  {
    if(v.y > 0)
      ret = Math.acos(v.x) * 180.0 / Math.PI;
    else
      ret = 360.0 - Math.acos(v.x) * 180.0 / Math.PI;
  }
  else
  {
    if(v.y > 0)
      ret = 180.0 - Math.acos(-v.x) * 180.0 / Math.PI;
    else
      ret = 180.0 + Math.acos(-v.x) * 180.0 / Math.PI;
  }

  if(ret >= 360.0)
    ret = 0.0;

  if(ret < 0.0)
    ret = 0.0;

  return ret;
}

function getAngleAtWorld(m){
  
  var matrix = m;

  var yAxis = new Vector3(0, 1, 0);

  var angleVec = multiplyMatrix3AndVector3(matrix , yAxis);

  var ret = getAngle(angleVec.x, angleVec.y);
  //console.log(ret);

  return ret;
}

//Matrix3 is column matrix
//column0    column1   column2
//(element0, element3, element6) row0
//(element1, element4, element7) row1
//(element2, element5, element8) row2


function convertToMatrix3(m){
  return new Matrix3().set(m.a00, m.a01, m.a02, m.a10, m.a11, m.a12, m.a20, m.a21, m.a22);
}

function convertToMatrix4(m){
  return new Matrix4().set(m.a00, m.a01, m.a02, m.a03, m.a10, m.a11, m.a12, m.a13, m.a20, m.a21, m.a22, m.a23, m.a30, m.a31, m.a32, m.a33);
}

function getInverseMatrixFromPatternRotationAndTranslation(matrix){
  
  var angle = getAngleAtWorld(matrix);

  var cos = Math.cos(Math.PI * angle / 180.0);
  //console.log(cos);
  var sin = Math.sin(Math.PI * angle / 180.0);
  //console.log(sin);

  var m = new Matrix3();
  m.set(cos, -sin, matrix.elements[6], sin, cos, matrix.elements[7], 0, 0, 1);

  var ret = getInvert(m);
  //console.log(ret);

  return ret;
}

function multiplyMatrix3AndVector2(m, v){
  return new Vector2(m.elements[0] * v.x + m.elements[3] * v.y + m.elements[2], m.elements[1] * v.x + m.elements[4] * v.y + m.elements[7]);
}

function multiplyMatrix3AndVector3(m, v){
  return new Vector3(m.elements[0] * v.x + m.elements[3] * v.y + m.elements[6] * v.z, m.elements[1] * v.x + m.elements[4] * v.y + m.elements[7] * v.z, m.elements[2] * v.x + m.elements[5] * v.y + m.elements[8] * v.z);
}

function getInvert(m){
  
  var det, oodet;

  var ret = new Matrix3();

  ret.elements[0] = (m.elements[4] * m.elements[8] - m.elements[5] * m.elements[7]);
  ret.elements[1] = -(m.elements[1] * m.elements[8] - m.elements[2] * m.elements[4]);
  ret.elements[2] = (m.elements[1] * m.elements[5] - m.elements[2] * m.elements[4]);
  ret.elements[3] = -(m.elements[3] * m.elements[8] - m.elements[5] * m.elements[6]);
  ret.elements[4] = (m.elements[0] * m.elements[8] - m.elements[2] * m.elements[6]);
  ret.elements[5] = -(m.elements[0] * m.elements[5] - m.elements[2] * m.elements[7]);
  ret.elements[6] = (m.elements[4] * m.elements[7] - m.elements[4] * m.elements[6]);
  ret.elements[7] = -(m.elements[0] * m.elements[7] - m.elements[1] * m.elements[6]);
  ret.elements[8] = (m.elements[0] * m.elements[4] - m.elements[1] * m.elements[7]);

  det = (m.elements[0] * ret.elements[0]) + (m.elements[1] * ret.elements[3]) + (m.elements[6] * ret.elements[2]);
  oodet = 1.0 / det;

  ret.multiplyScalar(oodet);

  return ret;
}
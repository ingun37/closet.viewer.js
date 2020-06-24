function SafeDeallocation(object, type, type_cb, nontype_cb) {
  if (object instanceof type) {
    type_cb(object);
  } else {
    nontype_cb(object);
  }
}

function getAngle(x, y) {
  var ret = 0.0;

  var v = new THREE.Vector2(x, y);
  v.normalize();

  if (v.x > 0) {
    if (v.y > 0) ret = (Math.acos(v.x) * 180.0) / Math.PI;
    else ret = 360.0 - (Math.acos(v.x) * 180.0) / Math.PI;
  } else {
    if (v.y > 0) ret = 180.0 - (Math.acos(-v.x) * 180.0) / Math.PI;
    else ret = 180.0 + (Math.acos(-v.x) * 180.0) / Math.PI;
  }

  if (ret >= 360.0) ret = 0.0;

  if (ret < 0.0) ret = 0.0;

  return ret;
}

function getAngleAtWorld(m) {
  var matrix = m;

  var yAxis = new THREE.Vector3(0, 1, 0);

  var angleVec = multiplyMatrix3AndVector3(matrix, yAxis);

  var ret = getAngle(angleVec.x, angleVec.y);
  //console.log(ret);

  return ret;
}

//THREE.Matrix3 is column matrix
//column0    column1   column2
//(element0, element3, element6) row0
//(element1, element4, element7) row1
//(element2, element5, element8) row2

function convertToMatrix3(m) {
  return new THREE.Matrix3().set(
    m.a00,
    m.a01,
    m.a02,
    m.a10,
    m.a11,
    m.a12,
    m.a20,
    m.a21,
    m.a22
  );
}

function convertToMatrix4(m) {
  return new THREE.Matrix4().set(
    m.a00,
    m.a01,
    m.a02,
    m.a03,
    m.a10,
    m.a11,
    m.a12,
    m.a13,
    m.a20,
    m.a21,
    m.a22,
    m.a23,
    m.a30,
    m.a31,
    m.a32,
    m.a33
  );
}

function getInverseMatrixFromPatternRotationAndTranslation(matrix) {
  var angle = getAngleAtWorld(matrix);

  var cos = Math.cos((Math.PI * angle) / 180.0);
  //console.log(cos);
  var sin = Math.sin((Math.PI * angle) / 180.0);
  //console.log(sin);

  var m = new THREE.Matrix3();
  m.set(cos, -sin, matrix.elements[6], sin, cos, matrix.elements[7], 0, 0, 1);

  var ret = getInvert(m);
  //console.log(ret);

  return ret;
}

function multiplyMatrix3AndVector2(m, v) {
  return new THREE.Vector2(
    m.elements[0] * v.x + m.elements[3] * v.y + m.elements[2],
    m.elements[1] * v.x + m.elements[4] * v.y + m.elements[7]
  );
}

function multiplyMatrix3AndVector3(m, v) {
  return new THREE.Vector3(
    m.elements[0] * v.x + m.elements[3] * v.y + m.elements[6] * v.z,
    m.elements[1] * v.x + m.elements[4] * v.y + m.elements[7] * v.z,
    m.elements[2] * v.x + m.elements[5] * v.y + m.elements[8] * v.z
  );
}

function getInvert(m) {
  var det, oodet;

  var ret = new THREE.Matrix3();

  ret.elements[0] =
    m.elements[4] * m.elements[8] - m.elements[5] * m.elements[7];
  ret.elements[1] = -(
    m.elements[1] * m.elements[8] -
    m.elements[2] * m.elements[4]
  );
  ret.elements[2] =
    m.elements[1] * m.elements[5] - m.elements[2] * m.elements[4];
  ret.elements[3] = -(
    m.elements[3] * m.elements[8] -
    m.elements[5] * m.elements[6]
  );
  ret.elements[4] =
    m.elements[0] * m.elements[8] - m.elements[2] * m.elements[6];
  ret.elements[5] = -(
    m.elements[0] * m.elements[5] -
    m.elements[2] * m.elements[7]
  );
  ret.elements[6] =
    m.elements[4] * m.elements[7] - m.elements[4] * m.elements[6];
  ret.elements[7] = -(
    m.elements[0] * m.elements[7] -
    m.elements[1] * m.elements[6]
  );
  ret.elements[8] =
    m.elements[0] * m.elements[4] - m.elements[1] * m.elements[7];

  det =
    m.elements[0] * ret.elements[0] +
    m.elements[1] * ret.elements[3] +
    m.elements[6] * ret.elements[2];
  oodet = 1.0 / det;

  ret.multiplyScalar(oodet);

  return ret;
}

function getClosestValue(inputValue, avgValue, stepSize, minValue, maxValue) {
  var localMin =
    stepSize * parseInt((inputValue - avgValue) / stepSize) + avgValue;
  var localMax = localMin + stepSize;
  var closestValue = 0;
  if (Math.abs(inputValue - localMin) < Math.abs(inputValue - localMax))
    closestValue = localMin;
  else closestValue = localMax;

  if (closestValue < minValue) closestValue = minValue;
  else if (closestValue > maxValue) closestValue = maxValue;

  return closestValue;
}

// inputHeight, inputWeight 는 float value
// samplingConfiguration. 해당 json 은 {s3domain}.clo-set.com/public/fitting/{styleId}/{version}/G{grading index}/{avatarID}/sampling.json 에 위치함. 이 json을 parsing하여 다음 변수를 채워줘야 함
// 관련 정보는 https://clo.atlassian.net/browse/NXPT-993 참고
// - version : integer value. ex) 100 -> 1.00,  234 -> 2.34
// - category : "female", "male" or "kid"
// - avgHeight : Integer. Average height (cm)
// - avgWeight : Integer. Average weight (kg)
// - minWeight : Integer
// - heightOffset : Integer
// - weightOffset : Integer
// - heightStepSize : Integer
// - weightStepSize : Integer
function getClosestSize(inputHeight, inputWeight, samplingConfiguration) {
  var returnValue = new Object();
  returnValue.height = getClosestValue(
    inputHeight,
    samplingConfiguration.avgHeight,
    samplingConfiguration.heightStepSize,
    samplingConfiguration.avgHeight - samplingConfiguration.heightOffset,
    samplingConfiguration.avgHeight + samplingConfiguration.heightOffset
  );

  const avgWeight =
    samplingConfiguration.avgWeight +
    returnValue.height -
    samplingConfiguration.avgHeight;
  var minWeight = Math.max(
    samplingConfiguration.minWeight,
    avgWeight - samplingConfiguration.weightOffset
  );
  var maxWeight = avgWeight + samplingConfiguration.weightOffset;

  returnValue.weight = getClosestValue(
    inputWeight,
    avgWeight,
    samplingConfiguration.weightStepSize,
    minWeight,
    maxWeight
  );

  return returnValue;
}

export function getGarmentFileName(height, weight, samplingConfiguration) {
  var closestSize = getClosestSize(height, weight, samplingConfiguration);
  return (
    "P0_" +
    String(closestSize.height) +
    "_" +
    String(closestSize.weight) +
    ".zcrp"
  );
}
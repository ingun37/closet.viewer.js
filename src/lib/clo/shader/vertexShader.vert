uniform mat4 gRotMatrix;
uniform mat4 gTransMatrix;

varying vec2 vUV;
varying vec3 vNormal;
varying vec3 posAtEye;
varying vec3 ambientCubeColor;
//varying vec3 ambientCubeColorMinus; // 사용하지 않으니 일단 주석처리. backface 렌더링 필요할 때 사용하자
varying vec3 viewDirAtEye;

void main(void)
{
	mat4 transform = gRotMatrix * gTransMatrix;

	vec4 p = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * p;

	posAtEye = p.xyz;
	viewDirAtEye = normalize(-p.xyz);
	vNormal = normalize(normalMatrix * normal);
	vUV = (transform * vec4(uv.st, 0.0, 1.0)).xy;

	vec3 nSquared = normal * normal;
	bvec3 isNegative = lessThan(normal , vec3(0.0));
	bvec3 isNegativeInverseNormal = lessThan(-normal , vec3(0.0));

	vec3 cAmbientCube[6];
	cAmbientCube[0] = vec3(0.6, 0.6, 0.6);
	cAmbientCube[1] = vec3(1.0, 1.0, 1.0);
	cAmbientCube[2] = vec3(0.3, 0.3, 0.3);
	cAmbientCube[3] = vec3(0.9, 0.9, 0.9);
	cAmbientCube[4] = vec3(0.4, 0.4, 0.4);
	cAmbientCube[5] = vec3(1.0, 1.0, 1.0);

	if (isNegative.x && isNegative.y && isNegative.z) // 1,1,1
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[1]) + (nSquared.y * cAmbientCube[3]) + (nSquared.z * cAmbientCube[5]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[0])
		//+ (nSquared.y * cAmbientCube[2])
		//+ (nSquared.z * cAmbientCube[4]);
	}
	else if (isNegative.x && isNegative.y && !isNegative.z) // 1,1,0
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[1]) + (nSquared.y * cAmbientCube[3]) + (nSquared.z * cAmbientCube[4]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[0])
		//+ (nSquared.y * cAmbientCube[2])
		//+ (nSquared.z * cAmbientCube[5]);
	}
	else if (isNegative.x && !isNegative.y && isNegative.z) // 1,0,1
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[1]) + (nSquared.y * cAmbientCube[2]) + (nSquared.z * cAmbientCube[5]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[0])
		//+ (nSquared.y * cAmbientCube[3])
		//+ (nSquared.z * cAmbientCube[4]);
	}
	else if (isNegative.x && !isNegative.y && !isNegative.z) // 1,0,0
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[1]) + (nSquared.y * cAmbientCube[2]) + (nSquared.z * cAmbientCube[4]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[0])
		//+ (nSquared.y * cAmbientCube[3])
		//+ (nSquared.z * cAmbientCube[5]);
	}
	else if (!isNegative.x && isNegative.y && isNegative.z) // 0,1,1
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[0]) + (nSquared.y * cAmbientCube[3]) + (nSquared.z * cAmbientCube[5]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[1])
		//+ (nSquared.y * cAmbientCube[2])
		//+ (nSquared.z * cAmbientCube[4]);
	}
	else if (!isNegative.x && isNegative.y && !isNegative.z) // 0,1,0
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[0]) + (nSquared.y * cAmbientCube[3]) + (nSquared.z * cAmbientCube[4]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[1])
		//+ (nSquared.y * cAmbientCube[2])
		//+ (nSquared.z * cAmbientCube[5]);
	}
	else if (!isNegative.x && !isNegative.y && isNegative.z) // 0,0,1
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[0]) + (nSquared.y * cAmbientCube[2]) + (nSquared.z * cAmbientCube[5]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[1])
		//+ (nSquared.y * cAmbientCube[3])
		//+ (nSquared.z * cAmbientCube[4]);
	}
	else if (!isNegative.x && !isNegative.y && !isNegative.z) // 0,0,0
	{
		ambientCubeColor = (nSquared.x * cAmbientCube[0]) + (nSquared.y * cAmbientCube[2]) + (nSquared.z * cAmbientCube[4]);
		//ambientCubeColorMinus = (nSquared.x * cAmbientCube[1])
		//+ (nSquared.y * cAmbientCube[3])
		//+ (nSquared.z * cAmbientCube[5]);
	}
}
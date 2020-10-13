// --- begin shader chunk "shadowmap_pars_vertex" from three@r89
#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHTS > 0

		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHTS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];

	#endif

	#if NUM_SPOT_LIGHTS > 0

		uniform mat4 spotShadowMatrix[ NUM_SPOT_LIGHTS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHTS ];

	#endif

	#if NUM_POINT_LIGHTS > 0

		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHTS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHTS ];

	#endif

	/*
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): uniforms for area light shadows

	#endif
	*/

#endif
// --- end "shadowmap_pars_vertex"


attribute vec2 uv2;
uniform mat4 gRotMatrix;
uniform mat4 gTransMatrix;

varying vec2 vUV;
varying vec2 vUV2;
varying vec3 vNormal;
varying vec3 posAtEye;

uniform float positionOffset;
uniform float cameraNear;
uniform float cameraFar;

/// 
float GetPolygonOffset(float z)
{
	float FN = cameraFar * cameraNear;
	float FminusN = cameraFar - cameraNear;

	return 2.0 * FN / (positionOffset * -0.0000005 * z * FminusN + 2.0 * FN) * z - z;
}

void main(void)
{
    vec4 p = modelViewMatrix * vec4(position, 1.0);

	if (positionOffset != 0.0)
		p.z += GetPolygonOffset(p.z);

    gl_Position = projectionMatrix * p;

    posAtEye = p.xyz;
    vNormal = normalize(normalMatrix * normal);

    mat4 transform = gRotMatrix * gTransMatrix;
    vUV = (transform * vec4(uv.st, 0.0, 1.0)).xy;
    vUV2 = uv2.st;

// --- begin shader chunk "begin_vertex" from three@r89

    vec3 transformed = vec3( position );
// --- end "begin_vertex"

// --- begin shader chunk "worldpos_vertex" from three@r89
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )

	vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

#endif
// --- end "worldpos_vertex"

// --- begin shader chunk "shadowmap_vertex" from three@r89
#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHTS > 0

	#if 0<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 0 ] = directionalShadowMatrix[ 0 ] * worldPosition;
    #endif
    #if 1<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 1 ] = directionalShadowMatrix[ 1 ] * worldPosition;
    #endif
    #if 2<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 2 ] = directionalShadowMatrix[ 2 ] * worldPosition;
    #endif
    #if 3<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 3 ] = directionalShadowMatrix[ 3 ] * worldPosition;
    #endif
    #if 4<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 4 ] = directionalShadowMatrix[ 4 ] * worldPosition;
    #endif
    #if 5<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 5 ] = directionalShadowMatrix[ 5 ] * worldPosition;
    #endif
    #if 6<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 6 ] = directionalShadowMatrix[ 6 ] * worldPosition;
    #endif
    #if 7<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 7 ] = directionalShadowMatrix[ 7 ] * worldPosition;
    #endif
    #if 8<NUM_DIR_LIGHTS
    vDirectionalShadowCoord[ 8 ] = directionalShadowMatrix[ 8 ] * worldPosition;
    #endif

	#endif

	#if NUM_SPOT_LIGHTS > 0

    #if 0<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 0 ] = spotShadowMatrix[ 0 ] * worldPosition;
    #endif
    #if 1<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 1 ] = spotShadowMatrix[ 1 ] * worldPosition;
    #endif
    #if 2<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 2 ] = spotShadowMatrix[ 2 ] * worldPosition;
    #endif
    #if 3<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 3 ] = spotShadowMatrix[ 3 ] * worldPosition;
    #endif
    #if 4<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 4 ] = spotShadowMatrix[ 4 ] * worldPosition;
    #endif
    #if 5<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 5 ] = spotShadowMatrix[ 5 ] * worldPosition;
    #endif
    #if 6<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 6 ] = spotShadowMatrix[ 6 ] * worldPosition;
    #endif
    #if 7<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 7 ] = spotShadowMatrix[ 7 ] * worldPosition;
    #endif
    #if 8<NUM_DIR_LIGHTS
    vSpotShadowCoord[ 8 ] = spotShadowMatrix[ 8 ] * worldPosition;
    #endif

	#endif

	#if NUM_POINT_LIGHTS > 0

    #if 0<NUM_DIR_LIGHTS
    vPointShadowCoord[ 0 ] = pointShadowMatrix[ 0 ] * worldPosition;
    #endif
    #if 1<NUM_DIR_LIGHTS
    vPointShadowCoord[ 1 ] = pointShadowMatrix[ 1 ] * worldPosition;
    #endif
    #if 2<NUM_DIR_LIGHTS
    vPointShadowCoord[ 2 ] = pointShadowMatrix[ 2 ] * worldPosition;
    #endif
    #if 3<NUM_DIR_LIGHTS
    vPointShadowCoord[ 3 ] = pointShadowMatrix[ 3 ] * worldPosition;
    #endif
    #if 4<NUM_DIR_LIGHTS
    vPointShadowCoord[ 4 ] = pointShadowMatrix[ 4 ] * worldPosition;
    #endif
    #if 5<NUM_DIR_LIGHTS
    vPointShadowCoord[ 5 ] = pointShadowMatrix[ 5 ] * worldPosition;
    #endif
    #if 6<NUM_DIR_LIGHTS
    vPointShadowCoord[ 6 ] = pointShadowMatrix[ 6 ] * worldPosition;
    #endif
    #if 7<NUM_DIR_LIGHTS
    vPointShadowCoord[ 7 ] = pointShadowMatrix[ 7 ] * worldPosition;
    #endif
    #if 8<NUM_DIR_LIGHTS
    vPointShadowCoord[ 8 ] = pointShadowMatrix[ 8 ] * worldPosition;
    #endif
    
	#endif

	/*
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): update vAreaShadowCoord with area light info

	#endif
	*/

#endif
// --- end "shadowmap_vertex"

}
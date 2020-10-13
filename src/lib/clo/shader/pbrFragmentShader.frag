// normal map 을 위해 다음 extension 필요함 -> 아니다 three.js 에서는 ShaderMateiral.extensions.derivative = true 로 해 주면 된다. 다음과 같이 하면 warning만 생길 뿐
//#extension GL_OES_standard_derivatives : enable

uniform bool m_bUseMetalnessRoughnessPBR;
uniform float m_Metalness;
uniform float m_Glossiness;
uniform bool m_bInvertGlossinessMap;
uniform float m_GlossinessMapIntensity;
//uniform float m_EnvironmentAngle;
uniform float m_EnvironmentLightIntensity;
uniform float m_CameraLightIntensity;
uniform float m_ReflectionIntensity;
uniform int m_RoughnessUIType;
uniform float m_FrontColorMult;
uniform float m_SideColorMult;

uniform bool bUseGlobal;
uniform bool bUseNormal;
uniform bool bUseSeamPuckeringNormal;
uniform bool bUseTransparent;
uniform bool bUseGlossinessMap;
uniform bool bUseMetalnessMap;
//uniform bool bUseAmbientOcclusion;

uniform mat4 matGlobal;
uniform mat4 matNormal;
uniform mat4 matTransparent;
uniform mat4 matGlossiness;
uniform mat4 matMetalness;

uniform sampler2D sGlobal;
uniform sampler2D sNormal; //normal map texture. 가장 마지막에서 두번째 유닛 선택
uniform sampler2D sSeamPuckeringNormal;
uniform sampler2D sTransparent;
uniform sampler2D sGlossiness;

uniform samplerCube sDiffuseEnvironmentMap;
uniform samplerCube sSpecularEnvironmentMap;

uniform vec3 materialBaseColor;
uniform vec3 materialSpecular;
uniform float materialOpacity;
uniform float normalMapIntensityInPercentage;

// 다음 불러줘야 한다. three.js 버전 업 후에 #include <lights_pars_begin> 로 대체하면 됨
#if NUM_DIR_LIGHTS > 0
struct DirectionalLight {
    vec3 direction;
    vec3 color;

    int shadow;
    float shadowBias;
    float shadowRadius;
    vec2 shadowMapSize;
};

uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
#endif

varying vec3 vNormal;
varying vec3 posAtEye;
varying vec2 vUV;
varying vec2 vUV2;

#define M_PI 3.1415926535897932384626433832795

// --- begin shader chunk "packing" from three@r89
vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}

vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}

const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)

const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );

const float ShiftRight8 = 1. / 256.;

vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8; // tidy overflow
	return r * PackUpscale;
}

float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}

// NOTE: viewZ/eyeZ is < 0 when in front of the camera per OpenGL conventions

float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
	return linearClipZ * ( near - far ) - near;
}

float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return (( near + viewZ ) * far ) / (( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * invClipZ - far );
}
// --- end "packing"

// --- begin shader chunk "shadowmap_pars_fragment" from three@r89
#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHTS > 0

		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHTS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];

	#endif

	#if NUM_SPOT_LIGHTS > 0

		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHTS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHTS ];

	#endif

	#if NUM_POINT_LIGHTS > 0

		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHTS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHTS ];

	#endif

	/*
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): create uniforms for area light shadows

	#endif
	*/

	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {

		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );

	}

	float texture2DShadowLerp( sampler2D depths, vec2 size, vec2 uv, float compare ) {

		const vec2 offset = vec2( 0.0, 1.0 );

		vec2 texelSize = vec2( 1.0 ) / size;
		vec2 centroidUV = floor( uv * size + 0.5 ) / size;

		float lb = texture2DCompare( depths, centroidUV + texelSize * offset.xx, compare );
		float lt = texture2DCompare( depths, centroidUV + texelSize * offset.xy, compare );
		float rb = texture2DCompare( depths, centroidUV + texelSize * offset.yx, compare );
		float rt = texture2DCompare( depths, centroidUV + texelSize * offset.yy, compare );

		vec2 f = fract( uv * size + 0.5 );

		float a = mix( lb, lt, f.y );
		float b = mix( rb, rt, f.y );
		float c = mix( a, b, f.x );

		return c;

	}

	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

		float shadow = 1.0;

		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;

		// if ( something && something ) breaks ATI OpenGL shader compiler
		// if ( all( something, something ) ) using this instead

		bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
		bool inFrustum = all( inFrustumVec );

		bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );

		bool frustumTest = all( frustumTestVec );

		if ( frustumTest ) {

		#if defined( SHADOWMAP_TYPE_PCF )

			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;

			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;

			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 9.0 );

		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )

			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;

			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;

			shadow = (
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy, shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 9.0 );

		#else // no percentage-closer filtering:

			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );

		#endif

		}

		return shadow;

	}

	// cubeToUV() maps a 3D direction vector suitable for cube texture mapping to a 2D
	// vector suitable for 2D texture mapping. This code uses the following layout for the
	// 2D texture:
	//
	// xzXZ
	//  y Y
	//
	// Y - Positive y direction
	// y - Negative y direction
	// X - Positive x direction
	// x - Negative x direction
	// Z - Positive z direction
	// z - Negative z direction
	//
	// Source and test bed:
	// https://gist.github.com/tschw/da10c43c467ce8afd0c4

	vec2 cubeToUV( vec3 v, float texelSizeY ) {

		// Number of texels to avoid at the edge of each square

		vec3 absV = abs( v );

		// Intersect unit cube

		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;

		// Apply scale to avoid seams

		// two texels less per square (one texel will do for NEAREST)
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );

		// Unwrap

		// space: -1 ... 1 range for each square
		//
		// #X##		dim    := ( 4 , 2 )
		//  # #		center := ( 1 , 1 )

		vec2 planar = v.xy;

		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;

		if ( absV.z >= almostOne ) {

			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;

		} else if ( absV.x >= almostOne ) {

			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;

		} else if ( absV.y >= almostOne ) {

			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;

		}

		// Transform to UV space

		// scale := 0.5 / dim
		// translate := ( center + 0.5 ) / dim
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );

	}

	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {

		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );

		// for point lights, the uniform @vShadowCoord is re-purposed to hold
		// the vector from the light to the world-space position of the fragment.
		vec3 lightToPosition = shadowCoord.xyz;

		// dp = normalized distance from light to fragment position
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear ); // need to clamp?
		dp += shadowBias;

		// bd3D = base direction 3D
		vec3 bd3D = normalize( lightToPosition );

		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT )

			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;

			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );

		#else // no percentage-closer filtering

			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );

		#endif

	}

#endif
// --- end "shadowmap_pars_fragment"

// --- begin shader chunk "shadowmask_pars_fragment" from three@r89
float getShadowMask() {

	float shadow = 1.0;

	#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHTS > 0

	DirectionalLight directionalLight;

#if 0<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 0 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 0 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.0;
#endif


#if 1<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 1 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 1 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 1 ] ) : 1.0;
#endif


#if 2<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 2 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 2 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 2 ] ) : 1.0;
#endif


#if 3<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 3 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 3 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 3 ] ) : 1.0;
#endif


#if 4<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 4 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 4 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 4 ] ) : 1.0;
#endif


#if 5<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 5 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 5 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 5 ] ) : 1.0;
#endif


#if 6<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 6 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 6 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 6 ] ) : 1.0;
#endif


#if 7<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 7 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 7 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 7 ] ) : 1.0;
#endif


#if 8<NUM_DIR_LIGHTS
directionalLight = directionalLights[ 8 ];
shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ 8 ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ 8 ] ) : 1.0;
#endif
	#endif

	#if NUM_SPOT_LIGHTS > 0

	SpotLight spotLight;


#if 0<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 0 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 0 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 0 ] ) : 1.0;
#endif


#if 1<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 1 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 1 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 1 ] ) : 1.0;
#endif


#if 2<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 2 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 2 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 2 ] ) : 1.0;
#endif


#if 3<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 3 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 3 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 3 ] ) : 1.0;
#endif


#if 4<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 4 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 4 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 4 ] ) : 1.0;
#endif


#if 5<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 5 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 5 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 5 ] ) : 1.0;
#endif


#if 6<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 6 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 6 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 6 ] ) : 1.0;
#endif


#if 7<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 7 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 7 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 7 ] ) : 1.0;
#endif


#if 8<NUM_SPOT_LIGHTS
		spotLight = spotLights[ 8 ];
		shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ 8 ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ 8 ] ) : 1.0;
#endif
	#endif

	#if NUM_POINT_LIGHTS > 0

	PointLight pointLight;

	#if 0<NUM_POINT_LIGHTS
		pointLight = pointLights[ 0 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 0 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 0 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 1<NUM_POINT_LIGHTS
		pointLight = pointLights[ 1 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 1 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 1 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 2<NUM_POINT_LIGHTS
		pointLight = pointLights[ 2 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 2 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 2 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 3<NUM_POINT_LIGHTS
		pointLight = pointLights[ 3 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 3 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 3 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 4<NUM_POINT_LIGHTS
		pointLight = pointLights[ 4 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 4 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 4 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 5<NUM_POINT_LIGHTS
		pointLight = pointLights[ 5 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 5 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 5 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 6<NUM_POINT_LIGHTS
		pointLight = pointLights[ 6 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 6 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 6 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 7<NUM_POINT_LIGHTS
		pointLight = pointLights[ 7 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 7 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 7 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif


#if 8<NUM_POINT_LIGHTS
		pointLight = pointLights[ 8 ];
		shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ 8 ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ 8 ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
#endif

	#endif

	/*
	#if NUM_RECT_AREA_LIGHTS > 0

		// TODO (abelnation): update shadow for Area light

	#endif
	*/

	#endif

	return shadow;

}
// --- end "shadowmask_pars_fragment"

mat3 cotangent_frame( vec3 N, vec3 p, vec2 uv )
{
    /* get edge vectors of the pixel triangle */
    vec3 dp1 = dFdx( p );
    vec3 dp2 = dFdy( p );
    vec2 duv1 = dFdx( uv );
    vec2 duv2 = dFdy( uv );

    /* solve the linear system */
    vec3 dp2perp = cross( dp2, N );
    vec3 dp1perp = cross( N, dp1 );
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

    /* construct a scale-invariant frame */
    float invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );
    return mat3( T * invmax, B * invmax, N );
}

vec3 perturb_normal(vec3 N, vec3 V)
{
    /* assume N, the interpolated vertex normal and V, the view vector (vertex to eye) */
    vec3 seamPuckeringVec = vec3(0.0, 0.0, 1.0);
    vec3 normalVec = vec3(0.0, 0.0, 1.0);
            
    if (bUseSeamPuckeringNormal)
    {
        vec2 uv = vUV2.st;
        seamPuckeringVec = texture2D(sSeamPuckeringNormal, uv).xyz;
        // WITH_NORMALMAP_UNSIGNED
        seamPuckeringVec = seamPuckeringVec * 2.0 - 1.0;

        seamPuckeringVec.z = seamPuckeringVec.z * 0.5; // seam puckering 은 opengl blending으로 인해 약해진 intensity를 여기서 보상해 준다.

        // 안전하게 여기서 최종 노말라이즈 해 주자. cotangent_frame 적용 전에 normalize 하면 이상하게 seam puckering 노말맵이 깨지는 경우 발생
        seamPuckeringVec = normalize(cotangent_frame(N, -V, uv) * seamPuckeringVec);
    }

    if (bUseNormal)
    {
        vec2 uv = (matNormal * vec4(vUV.st, 0.0, 1.0)).st;
        normalVec = texture2D(sNormal, uv).xyz;

        // WITH_NORMALMAP_UNSIGNED
        normalVec = normalVec * 2.0 - 1.0;
        normalVec = normalize(normalVec);

        // 노멀로 변경했으니, intensity 조절
        int direction = 1;

        if (normalMapIntensityInPercentage < 0.0)
        direction = -1;

        if (normalMapIntensityInPercentage == 0.0)
        {
        normalVec.x = 0.0;
        normalVec.y = 0.0;
        normalVec.z = 1.0;
        }
        else
        {
        normalVec.x = normalVec.x * float(direction);
        normalVec.y = normalVec.y * float(direction);
        normalVec.z = 3.0 * normalVec.z / ((abs(normalMapIntensityInPercentage * 0.1) - 1.0)*0.3 + 1.0);
        }

        // 안전하게 여기서 최종 노말라이즈 해 주자. cotangent_frame 적용 전에 normalize 하면 이상하게 seam puckering 노말맵이 깨지는 경우 발생
        normalVec = normalize(cotangent_frame(N, -V, uv) * normalVec);
    }

    vec3 map;
    if (bUseSeamPuckeringNormal && bUseNormal)
    {
        // z 값을 곱해주고 xy 값은 더해줘야 그럴싸하게 normal map이 blending 된다. 
        float z0 = dot(N, seamPuckeringVec);
        float z1 = dot(N, normalVec);
        return normalize(seamPuckeringVec - z0 * N + normalVec - z1 * N + z0 * z1 * N);
    }
    else if (bUseNormal)
    {
        return normalVec;
    }
    else
        return seamPuckeringVec;

        // vray 처럼 노말맵 적용된 경우에는 back face 되지 않게 하려고 했는데 결과가 좋지 않아 주석 처리
        /*if (dot(TBN * map, V) < 0.0)
        {
        vec3 plz = TBN * map;
        vec3 normalizedE = normalize(V);
        return normalize(plz - dot(plz, normalizedE) * normalizedE);
        }
        else*/
        
}

float F_Schlick(float f0, float f90, float VoH)
{
    return f0 + (f90 - f0) * pow(1.0 - VoH, 5.0);
}

float Fd_Burley(float linearRoughness, float NoV, float NoL, float LoH) {
    // Burley 2012, "Physically-Based Shading at Disney"
    float f90 = 0.5 + 2.0 * linearRoughness * LoH * LoH;
    float lightScatter = F_Schlick(1.0, f90, NoL);
    float viewScatter = F_Schlick(m_FrontColorMult, m_SideColorMult * f90, NoV); // front, side color 커스터마이제이션 for velvet
    return lightScatter * viewScatter;
}

#define OneOnLN2_x6 8.656170 // == 1/ln(2) * 6   (6 is SpecularPower of 5 + 1)
vec3 FresnelSchlick(vec3 SpecularColor, float dot, float glossiness)
{
    // original FresnelSchlick
    //return SpecularColor + (1.0f - SpecularColor) * pow(1.0f - max(dot(E, H),0.0), 5); // max 사용하면 backface에 대해 최대값 나와버려 안된다. 아래처럼 쓰고 이 함수 사용시 걸러주자
    //return SpecularColor + (1.0f - SpecularColor) * pow(1.0f - dot, 5);

    // SphericalGoussianApproximation 한 것
    // In this case SphericalGaussianApprox(1.0f - saturate(dot(E, H)), OneOnLN2_x6) is equal to exp2(-OneOnLN2_x6 * x)
    return SpecularColor + (max(vec3(glossiness), SpecularColor) - SpecularColor) * exp2(-OneOnLN2_x6 * dot);
}

float GetIntensityFromLinearRGB(vec3 v)
{
    return v.r * 0.2126 + v.g * 0.7152 + v.b * 0.0722;
}

// 0: none
// 1: gamma correction
// 2: Reinhard
// 3: Reinhard max
#define TONE_MAP 1
#define GAMMA 2.2
#define MIN_DIV 0.000000001

float max3(vec3 color) { 
    return max(color.x, max(color.y, color.z)); 
}

vec3 InverseToneMapping(vec3 color)
{
    #if (TONE_MAP == 0)
    return color;
    #endif

    #if (TONE_MAP == 1)
    return pow(color, vec3(GAMMA));
    #endif

    #if (TONE_MAP == 2)
    color = pow(color, vec3(GAMMA));
    return color / max(1.0 - color, MIN_DIV);
    #endif

    #if (TONE_MAP == 3)
    color = pow(color, vec3(GAMMA));
    return color / max(1.0 - max3(color), MIN_DIV);
    #endif

    #if (TONE_MAP == 4)
    color = pow(color, vec3(GAMMA));
    return color / (1.0 - max3(color));
    #endif
}

vec3 Tonemapping(vec3 color)
{
    #if (TONE_MAP == 0)
    return color;
    #endif

    #if (TONE_MAP == 1)
    return pow(color, vec3(1.0 / GAMMA));
    #endif

    #if (TONE_MAP == 2)
    color = color / (color + 1.0);
    return pow(color, vec3(1.0 / GAMMA));
    #endif

    #if (TONE_MAP == 3)
    color = color / (max3(color) + 1.0);
    return pow(color, vec3(1.0 / GAMMA));
    #endif

    #if (TONE_MAP == 4)
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    color = (color * (a * color + b)) / (color * (c * color + d) + e);
    return pow(color, vec3(1.0 / GAMMA));
    #endif
}

vec3 RGBEToVec3(vec4 rgbe)
{
    return rgbe.rgb * exp2( rgbe.a * 255.0 - 128.0 );
}

void main( void )
{
    // 모든 라이트에 대해 phong shading 계산하기.
    vec4 diffuse = vec4(0.0);
    vec4 specular = vec4(0.0);

    vec3 diffuseColor = materialBaseColor.rgb; // albedo/baseColor
    vec3 specularColor = materialSpecular.rgb;
    float texAlpha = 1.0;
    float glossiness = 0.0;
    float metalness = m_Metalness;

    if (bUseGlobal)
    {
        vec4 texColor = texture2D(sGlobal, (matGlobal * vec4(vUV.st, 0.0, 1.0)).st);
        diffuseColor *= texColor.rgb;
        texAlpha = texColor.a;

            if (!m_bUseMetalnessRoughnessPBR)
            specularColor *= texColor.rgb;
    }

    // linear -> sRGB 감마 코렉션
    diffuseColor.rgb = InverseToneMapping(diffuseColor.rgb);
    specularColor.rgb = InverseToneMapping(specularColor.rgb);

    if (bUseTransparent)
    {
        vec4 texColor = texture2D(sTransparent, (matTransparent * vec4(vUV.st, 0.0, 1.0)).st);
        texAlpha = texColor.a;
    }

    if (m_RoughnessUIType == 0)
    {
        glossiness = m_Glossiness;
    }
    else
    {
        if (bUseGlossinessMap)
        {
            // glossiness은 linear RGB겠지. gamma correction 필요없다.
            vec3 texColor = m_GlossinessMapIntensity * texture2D(sGlossiness, (matGlossiness * vec4(vUV.st, 0.0, 1.0)).st).rgb;

            if (m_bInvertGlossinessMap)
                glossiness = clamp(1.0 - GetIntensityFromLinearRGB(texColor), 0.0, 1.0);
            else
                glossiness = clamp(GetIntensityFromLinearRGB(texColor), 0.0, 1.0);
        }
        else
            glossiness = 0.0;
    }

    vec3 E = -normalize(posAtEye);
    vec3 N = normalize(vNormal);

    if (bUseNormal || bUseSeamPuckeringNormal)
    {
        N = perturb_normal(N, -posAtEye); // 여기서 E (즉, normalized vector)를 넣으면 안된다.
    }

    float glossinessSquare = glossiness * glossiness;
    float specularPower = exp2(10.0 * glossinessSquare + 1.0);

    // metalness-roughness pbr을 디폴트로 한다.
    if (m_bUseMetalnessRoughnessPBR)
    {
        // 비금속일 때는 specular 가 생각보다 강하기 때문에(gamma correction 적용시) glossiness 로 조절해 준다. 그래야 원래 채도 유지한다. glossiness 높을 때는 원래 specular color대로 나오게 하고.
        if (metalness == 0.0)
            specularColor = vec3(mix(0.025 * m_ReflectionIntensity, 0.078 * m_ReflectionIntensity, glossiness)); // vray와 맞추기 위해서 specular color 0.04 로 고정하지 않는다.
        else
            specularColor = mix(vec3(0.04), diffuseColor, metalness);
        
        diffuseColor = mix(diffuseColor, vec3(0.0), metalness);				
    }

    // diffuse environment light
    vec3 worldNormal = vec3(vec4(N, 0.0) * viewMatrix); // 월드좌표계로 해야 cubemap 제대로 가져올 수 있다
    vec3 worldMinusE = vec3(vec4(-E, 0.0) * viewMatrix); // 월드좌표계로 해야 cubemap 제대로 가져올 수 있다
    vec3 worldR = reflect(worldMinusE, worldNormal);

    // 표준 Environment 로 보여지게 하기 위해
    worldR.z = -worldR.z;
    float preX = worldR.x;
    float preZ = worldR.z;
    float radian = 0.0;//m_EnvironmentAngle / 180.0 * M_PI;
    worldR.x = cos(radian) * preX - sin(radian) * preZ;
    worldR.z = sin(radian) * preX + cos(radian) * preZ;

    float dotNE = max(dot(N, E), 0.0);
    float faceIntensity = 1.0;

    vec3 diffuseEnvColor = m_EnvironmentLightIntensity * RGBEToVec3(textureCube(sDiffuseEnvironmentMap, worldR));
    diffuse.rgb += faceIntensity * diffuseColor * diffuseEnvColor.rgb; // ambient 효과 내기 위해 일부러 backface도 라이팅되게 한다.

    // specular environment light
    // max_mip_level = 7 로 하드코딩.
    float mipLevel = 7.0 - glossinessSquare * 7.0;
            
    #ifdef GL_EXT_shader_texture_lod
    vec3 specularEnvColor = m_EnvironmentLightIntensity * RGBEToVec3(textureCubeLodEXT(sSpecularEnvironmentMap, worldR, mipLevel));           
    #else
    
    // 지원 안될 경우는 다음과 같이 glsl 120 만 지원하는 pc 버전 코드와 동일한 결과 나오게 하기
    vec3 specularEnvColor = diffuseEnvColor;
    #endif

    // 이 조건 없으면 back face에 대해 Fresnel 값이 최대치로 나오므로 이 조건 넣어줘야 한다. FresnelSchlick 함수 안에서 max 사용해도 안됨
    // dot(N,E) 대신 gl_FrontFacing으로 검사하자. 안그러면 노말맵 있는 material의 경우 앞면인데도 불구하고 normal은 뒤로 돌아가서 fresnel 적용안되어서 새까맣게 나오는 경우 발생한다.
    if (gl_FrontFacing)
        specular.rgb += FresnelSchlick(specularColor, dotNE, 0.25 * m_ReflectionIntensity) * specularEnvColor.rgb;

    // direct light
    for (int i = 0; i < 2; ++i)
    {
        vec3 lightColor;

        // 현재 픽셀 위치에 대한 라이트 방향
        vec3 L = vec3(0.0);
        if(i == 0)
        {
            L = E;
            lightColor = vec3(m_CameraLightIntensity);
        }
        else
        {
            L = normalize(vec4(viewMatrix * vec4(15,30,15,0)).xyz);
            lightColor = pow(vec3(150.0/255.0), vec3(GAMMA));
        }

        vec3 R = reflect(-L, N);

        // 쉐도우 켜져 있고 쉐도우 조명이면
        float shadowIntensity = 1.0;
        if (i != 0)        
        {
            // ios 에서는 shadow map 접근하면 옷이 메탈처럼 보이고 아바타가 사라져 버리는 버그 생긴다. 
            // shadow map 과 sSpecularEnvironmentMap 을 같이 쓸때 버그 생긴다. 
            // ios에서는 shadow 끄는 식으로 처리하자. 2019.04.12 
            // -> viewer.js에 관련 처리 부분 있음
            // FIXME: This causes poor performance
            shadowIntensity = getShadowMask(); 
        }

        vec3 H = normalize(L + E);
        float dotNL = max(dot(N, L), 0.0);
        float dotLH = max(dot(L, H), 0.0);
        float dotNH = max(dot(N, H), 0.0);

        diffuse.rgb += faceIntensity * shadowIntensity * diffuseColor * Fd_Burley(1.0 - glossiness, dotNE, dotNL, dotLH) * lightColor * dotNL;
        
        // dot(L, H)는 항상 양수이므로 위에 specular environment 처리때처럼 음수일 때 조건문으로 걸러줄 필요 없다.
        // light.specular 는 사용하지 않는다. diffuse 하나로 통일해서 사용한다. 실제처럼.
        // direct 라잇의 경우 Fresnel 최대값은 glossiness가 아닌 1.0으로
        specular.rgb += faceIntensity * shadowIntensity * FresnelSchlick(specularColor, dotLH, 1.0) * ((specularPower + 2.0) / 8.0) * pow(dotNH, specularPower) * dotNL * lightColor;
    }

    gl_FragColor.rgb = diffuse.rgb + specular.rgb;

    /*if (bUseAmbientOcclusion)
    {
    vec3 ao = texture2D(sAmbientOcclusionMap, gl_FragCoord.xy / m_ScreenSize).xyz;
    gl_FragColor.rgb *= ao;
    }*/

    // tone mapping 해 줘야 HDR (shader가 output하는 linear RGB space color) 이미지를 사실적으로 보여줄 수 있다.
    // 안에서 감마 코렉션(linear -> sRGB) 도 수행한다
    gl_FragColor.rgb = Tonemapping(gl_FragColor.rgb);
    gl_FragColor.a = materialOpacity * texAlpha;
}
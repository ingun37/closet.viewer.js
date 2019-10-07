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
#include <packing>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

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
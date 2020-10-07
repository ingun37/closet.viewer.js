    
    // normal map 을 위해 다음 extension 필요함 -> 아니다 three.js 에서는 ShaderMateiral.extensions.derivative = true 로 해 주면 된다. 다음과 같이 하면 warning만 생길 뿐
    //#extension GL_OES_standard_derivatives : enable

    uniform sampler2D sGlobal;
    uniform sampler2D sDiffuse;
    uniform sampler2D sAmbient;
    uniform sampler2D sSpecular;
    uniform sampler2D sNormal; //normal map texture. 가장 마지막에서 두번째 유닛 선택
    uniform sampler2D sTransparent;
    
    uniform bool bUseGlobal;
    uniform bool bUseAmbient;
    uniform bool bUseDiffuse;
    uniform bool bUseSpecular;
    uniform bool bUseNormal;
    uniform bool bUseTransparent;
    
    uniform mat4 matGlobal;    
    uniform mat4 matAmbient;
    uniform mat4 matDiffuse;
    uniform mat4 matSpecular;
    uniform mat4 matNormal;
    uniform mat4 matTransparent;
    #include <common>
#include <lights_pars_begin>


    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec3 posAtEye;
    varying vec3 ambientCubeColor;
    //varying vec3 ambientCubeColorMinus;
    varying vec3 viewDirAtEye;

    uniform vec3 materialAmbient;
    uniform vec3 materialDiffuse;
    uniform vec3 materialSpecular;
    uniform vec3 materialEmission;
    uniform float materialOpacity;
    uniform float materialShininess;
    uniform float normalMapIntensityInPercentage;

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

    vec3 perturb_normal( vec3 N, vec3 V, vec2 texcoord )
    {
        /* assume N, the interpolated vertex normal and V, the view vector (vertex to eye) */
        vec3 map = texture2D( sNormal, texcoord ).xyz;
        // WITH_NORMALMAP_UNSIGNED
        map = map * 2.0 - 1.0;

        map = normalize(map);

        // 노멀로 변경했으니, intensity 조절
        // normal map intensity in Shader (26 Feb 2015 by Joshua)

        int direction = 1;

        if (normalMapIntensityInPercentage < 0.0)
        direction = -1;

        if (normalMapIntensityInPercentage == 0.0)
        {
            map.x = 0.0;
            map.y = 0.0;
            map.z = 1.0;
        }
        else
        {
            map.x = map.x * float(direction);
            map.y = map.y * float(direction);
            map.z = map.z / ((abs(normalMapIntensityInPercentage * 0.1) - 1.0)*0.3 + 1.0);
            map = normalize(map);
        }

        //map.z = map.z * 0.3; // normal intensity 입력받아서 CLO와 동일하게 맞추자
    
        // WITH_NORMALMAP_2CHANNEL
        // map.z = sqrt( 1. - dot( map.xy, map.xy ) );
        // WITH_NORMALMAP_GREEN_UP
        // map.y = -map.y;
        mat3 TBN = cotangent_frame( N, -V, texcoord );
        return normalize( TBN * map );
    }


    void phongModel(inout vec4 ambient, inout vec4 diffuse, inout vec4 specular, in vec3 normal)
    {    
        ambient.rgb += materialEmission.rgb + materialAmbient * vec3(280.0/255.0, 280.0/255.0, 280.0/255.0) * ambientCubeColor.rgb; // ambient light 의 intensity는 하드코딩. CLO와 three.js 의 light 구조가 다르므로 이렇게 처리 Jaden 2017.06.12

        vec3 faceNormal = normalize(normal);

#ifdef GL_OES_standard_derivatives
        // Normal map 적용
        if(bUseNormal)
        {
            vec2 realUV = (matNormal * vec4(vUV.st, 0.0, 1.0)).st;
            faceNormal = perturb_normal( normalize( normal ), normalize( viewDirAtEye ), realUV.st );            

            //vec3 map = texture2D( sNormal, realUV ).xyz;
            //diffuse = vec4(map.xyz, 1.0);
            //ambient.rgb = vec3(0,0,0);
        }
#endif
        for (int i=0; i<NUM_DIR_LIGHTS; ++i)
        {
                // 완전 하드 코딩. 0번째 light 는 카메라 따라다니는 녀석. 두번째부터는 절대 direction light. 
                 vec3 L = vec3(0.0);
                 if(i==0)
                    L = normalize((vec4(directionalLights[i].direction, 1.0) * viewMatrix).xyz);
                 else
                    L = normalize((vec4(directionalLights[i].direction, 1.0)).xyz);
                 vec3 E =normalize(-posAtEye);
                 vec3 R =-reflect(L, faceNormal);

                 vec3 frontLightProductDiffuse=materialDiffuse * directionalLights[i].color;
                vec3 frontLightProductSpecular = materialSpecular * vec3(70.0/255.0, 70.0/255.0, 70.0/255.0);
                

                 diffuse +=(0.3 * max(dot(faceNormal,L), 0.0) + 0.7 * pow(0.5 * dot(faceNormal,L) + 0.5, 2.0)) * vec4(frontLightProductDiffuse, 1.0);
                specular += pow(max(dot(R,E),0.0), materialShininess) * vec4(frontLightProductSpecular, 1.0);
        }
    }

    void main( void )
    {
        vec4 ambient = vec4(0.0);
        vec4 diffuse = vec4(0.0);        
        vec4 specular = vec4(0.0);        
        phongModel(ambient, diffuse, specular, vNormal);
        ambient = clamp(ambient, 0.0, 1.0);
        diffuse = clamp(diffuse, 0.0, 1.0);
        specular = clamp(specular, 0.0, 1.0);

        float texAlpha = 1.0;
        vec4 texColor = vec4(1.0);
        
        if(bUseGlobal)
        {
            texColor = texture2D(sGlobal, (matGlobal * vec4(vUV.st, 0.0, 1.0)).st);
            ambient *= texColor;
            diffuse *= texColor;
            texAlpha = texColor.a;   
        }
        if(bUseAmbient)
        {
            texColor = texture2D(sAmbient, (matAmbient * vec4(vUV.st, 0.0, 1.0)).st);
            ambient *= texColor;
            if (texColor.a < texAlpha)
                texAlpha = texColor.a;
        }
        if(bUseDiffuse)
        {
            texColor = texture2D(sDiffuse, (matDiffuse * vec4(vUV.st, 0.0, 1.0)).st);
            diffuse *= texColor;
            if (texColor.a < texAlpha)
                texAlpha = texColor.a;
        }        
        if(bUseSpecular)
        {
            texColor = texture2D(sSpecular, (matSpecular * vec4(vUV.st, 0.0, 1.0)).st);
            specular *= texColor;            
        }

        if (bUseTransparent)
        {
            texColor = texture2D(sTransparent, (matTransparent * vec4(vUV.st, 0.0, 1.0)).st);
            texAlpha = texColor.a;
        }

        gl_FragColor = vec4(ambient.rgb + diffuse.rgb + specular.rgb, materialOpacity * texAlpha);
    }

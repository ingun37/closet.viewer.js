    
        #include    <shadowmap_pars_vertex>
        attribute vec2 uv2;
        uniform mat4 gRotMatrix;
        uniform mat4 gTransMatrix;

        varying vec2 vUV;
        varying vec2 vUV2;
        varying vec3 vNormal;
        varying vec3 posAtEye;

        void main(void)
        {
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;

        posAtEye = p.xyz;
        vNormal = normalize(normalMatrix * normal);

        mat4 transform = gRotMatrix * gTransMatrix;
        vUV = (transform * vec4(uv.st, 0.0, 1.0)).xy;
        vUV2 = uv2.st;

        #include <begin_vertex>
                     #include <worldpos_vertex>
                         #include <shadowmap_vertex>

                             }

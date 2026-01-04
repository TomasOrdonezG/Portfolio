precision mediump float;

varying vec2 vUv;

uniform sampler2D uTex;
uniform sampler2D uTexGrain;
uniform vec2 uRes;
uniform float uRadius;
uniform float uTime;

#define M_PI (3.1415926535897932384626433832795)

float qScanLine(vec2 uv, float n)
{
    return pow(abs(sin(M_PI * uv.y * n)), 0.5);
}

float qVignete(vec2 uv, float q, float o)
{
    float x = clamp(1.0 - distance(uv, vec2(0.5,0.5)) * q, 0.0, 1.0);
    return (log((o - 1.0/exp(o)) * x + 1.0/exp(o)) + o) / (log(o) + o);
}

vec2 vCrtCurvature(vec2 uv, float q)
{
    float x = 1.0 - distance(uv, vec2(0.5, 0.5));
    vec2 g = vec2(0.5, 0.5) - uv;
    return uv + g * x * q;
}

vec4 v2DNoiseSample(vec2 gPos)
{
    vec2 nPos = vec2(
        mod(gPos.x + uTime * 9.66, 1.0),
        mod(gPos.y + uTime * 7.77, 1.0)
    );		
    return texture2D(uTexGrain, nPos);
}

vec4 v1DNoiseSample(float idx, float s)
{
    return texture2D(uTexGrain, vec2(
        mod(idx, 1.0),
        mod(uTime * s, 1.0))
    );
}

float q2DNoiseSample(vec2 gPos)
{
    vec4 nPnt = v2DNoiseSample(gPos);
    return nPnt.x;
}

float q1DNoiseSample(float idx, float s)
{
    vec4 nPnt = v1DNoiseSample(idx, s);
    return nPnt.x;
}

vec4 cSignalNoise(vec4 c,float q, vec2 gPos)
{
    return c * (1.0 - q) + q * q2DNoiseSample(gPos);
}

vec2 vScanShift(vec2 uv, float q, float dy, float dt)
{
    return vec2(uv.x + q1DNoiseSample(uv.y * dy, dt) * q, uv.y);
}

vec2 vFrameShift(vec2 uv, float q, float dt)
{
    float s = (q1DNoiseSample(0.5, dt) - 0.5) / 500.0;
    return vec2(uv.x, mod(uv.y + uTime * (q + s), 1.0));	
}

vec2 vDirShift(vec2 uv, float angle, float q)
{
    float a = (angle / 180.0) * M_PI;
    vec2 dir = vec2(sin(a), cos(a));
    return uv + dir * q;
}

vec4 vRGBWithShift(vec2 uv, float angle, float q)
{
    vec2 rPos = vDirShift(uv, angle, q);
    vec2 gPos = uv;
    vec2 bPos = vDirShift(uv, -angle, q);
    vec4 rPix = texture2D(uTex, rPos);
    vec4 gPix = texture2D(uTex, gPos);
    vec4 bPix = texture2D(uTex, bPos);
    return vec4(rPix.x, gPix.y, bPix.z, 1.0);
}

vec4 vPowerNoise(vec4 col, vec2 uv, float b, float dt, float w)
{
    float s = q1DNoiseSample(0.0, 0.001) / 500.0;
    float y = mod(uTime * (dt + s) , 1.0);
    float d = 1.0 - clamp(abs(uv.y - y), 0.0, w) / w;
    return pow(col, vec4(1.0 / (1.0 + b * d)));
}

vec4 qGamma(vec4 i, vec4 g)
{
    return pow(i, 1.0 / g);
}

vec4 vRGBTint(vec4 col, vec3 g, float q)
{	
    return qGamma(col, vec4(g, 1.0)) * q + (1.0 - q) * col;	
}

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 vColorDrift(vec4 col, float q) {
    vec3 hsv = rgb2hsv(col.xyz);
    hsv.y = mod(hsv.y * q, 1.0);
    return vec4(hsv2rgb(hsv), col.w);
}

void main()
{
    vec2 cRes = uRes;
    vec2 gRes = uRes;
    vec2 gPos = vUv;	
    vec2 cPos = gPos;
    vec4 cCol = vec4(1.0);
    vec2 bPos = vec2(1.0);
    
    float scanShiftStrength = 0.002;  // 0.02
    float scanShiftCount = 0.2;  // 0.1
    float scanShiftSpeed = 0.2;  // 0.1
    
    float screenCurve = 0.2;  // 0.3
    
    float frameShiftSpeed = 0.01;  // 0.01
    float frameShiftShake = 0.001;  // 0.001
    
    float RGBShift = 0.003;  // 0.01
    
    float signalNoiseOpacity = 0.3;  // 0.8
    
    float powerLineOpacity = 4.0;  // 4.0
    float powerLineVelocity = -0.2;  // -0.2
    float powerLineSize = 0.05;  // 0.1
    
    vec3 gammaTintColor = vec3(0.624, 0.929, 0.624);  // vec3(0.9, 0.7, 1.2)
    float gammaTintStrength = 1.0;  // 1.0
    
    float scanlineCount = 150.0;  // 120.0
    
    float vigneteSize = 1.0;  // 1.5
    float vigneteFade = 2.0;  // 3.0
    
    float noiseSpeed = 0.01;
    
    vec2 center = vec2(0.5, 0.5);
    float scale = 0.85;
    cPos = (cPos - center) / scale + center;
    cPos = vCrtCurvature(cPos, screenCurve);					                            // crt curving of coords
    
    float qNoise = q1DNoiseSample(0.01, noiseSpeed);
    if (cPos.x > 0.0 && cPos.y > 0.0 && cPos.x < 1.0 && cPos.y < 1.0)
    {
        cPos = vScanShift(cPos, scanShiftStrength, scanShiftCount, scanShiftSpeed);             // scanline shift
        bPos = vCrtCurvature(gPos, screenCurve);					                            // curvature for the noize bar
        // cPos = vFrameShift(cPos, frameShiftSpeed, frameShiftShake);				                // frame shift		
        cCol = vRGBWithShift(cPos, 100.0, RGBShift);                                            // sample signal color	
        // cCol = vColorDrift(cCol, 1.0 - qNoise);
        // cCol = cSignalNoise(cCol, qNoise * signalNoiseOpacity, gPos);		                    // add signal noise
        // cCol = vPowerNoise(cCol, bPos, powerLineOpacity, powerLineVelocity, powerLineSize); 	// power line noize
        // cCol = vRGBTint(cCol, gammaTintColor, gammaTintStrength);	                            // gamma tint
        cCol = cCol * qScanLine(bPos, scanlineCount); 				                            // add scanlines
        // cCol = cCol * qVignete(gPos, vigneteSize, vigneteFade); 			                    // add edge darkening
        gl_FragColor = cCol;
    }
    else 
    {
        gl_FragColor = vec4(0.01, 0.01, 0.01, 1.0);
    }
}

const frag = `
precision mediump float;

varying vec2 vUv;

uniform sampler2D uTex;
uniform float uTime;

#define M_PI (3.1415926535897932384626433832795)

float qScanLine(vec2 uv, float n)
{
    return pow(abs(sin(M_PI * uv.y * n)), 0.5);
}

vec2 vCrtCurvature(vec2 uv, float q)
{
    float x = 1.0 - distance(uv, vec2(0.5, 0.5));
    vec2 g = vec2(0.5, 0.5) - uv;
    return uv + g * x * q;
}

float smooth_(float t)
{
    return t * t * (3.0 - 2.0 * t);
}

float hash(float x, float y)
{
    return fract(sin(127.1 * x + 311.7 * y) * 43758.5453);
}

float valueNoise(float x, float y)
{
    float floorX = floor(x);
    float floorY = floor(y);

    float fractX = x - floorX;
    float fractY = y - floorY;

    float a = hash(floorX,       floorY);
    float b = hash(floorX + 1.0, floorY);
    float c = hash(floorX,       floorY + 1.0);
    float d = hash(floorX + 1.0, floorY + 1.0);

    float ux = smooth_(fractX);
    float uy = smooth_(fractY);

    return mix(mix(a, b, ux), mix(c, d, ux), uy);
}

vec2 vScanShift(vec2 uv, float q, float dy, float speed)
{
    float noise = valueNoise(vUv.y * dy, uTime * speed) - 0.5;
    return vec2(uv.x + noise * q, uv.y);
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

void main()
{
    vec2 cPos = vUv;
    vec4 cCol = vec4(1.0);
    vec2 bPos = vec2(1.0);
    
    float scanShiftStrength = 0.002;  // 0.002
    float scanShiftDensity = 100.0;  // 100.0
    float scanShiftSpeed = 30.0;  // 30.0
    
    float screenCurve = 0.2;  // 0.3
    
    float RGBShift = 0.003;  // 0.01
    
    float scanlineCount = 150.0;  // 120.0
    
    vec2 center = vec2(0.5, 0.5);
    float scale = 0.85;
    cPos = (cPos - center) / scale + center;
    cPos = vCrtCurvature(cPos, screenCurve);					                                // crt curving of coords
    
    if (cPos.x > 0.0 && cPos.y > 0.0 && cPos.x < 1.0 && cPos.y < 1.0)
    {
        cPos = vScanShift(cPos, scanShiftStrength, scanShiftDensity, scanShiftSpeed);           // scanline shift
        cCol = vRGBWithShift(cPos, 100.0, RGBShift);                                            // sample signal color	
        bPos = vCrtCurvature(cPos, screenCurve);					                            // curvature for the scanlines bar
        cCol = cCol * qScanLine(bPos, scanlineCount); 				                            // add scanlines
        gl_FragColor = cCol;
    }
    else 
    {
        gl_FragColor = vec4(0.01, 0.01, 0.01, 1.0);
    }
}
`;

export default frag;

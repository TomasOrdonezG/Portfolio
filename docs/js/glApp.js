class GlApp {
    constructor(vertexShaderCode, fragShaderCode, grainImgBlob) {
        // DPR
        this.DPR = Math.max(1, window.devicePixelRatio || 1);

        // GL canvas
        this.glCanvas = document.createElement('canvas');
        this.glCanvas.id = 'glCanvas';
        Object.assign(this.glCanvas.style, { position: 'fixed', left: 0, top: 0, width: '100%', height: '100%' });
        document.body.appendChild(this.glCanvas);

        const gl = this.glCanvas.getContext("webgl");
        this.gl = gl;
        if (!gl) {
            throw new Error('WebGL not supported');
        }

        // UI canvas and context
        this.uiCanvas = document.createElement('canvas');
        this.uiCtx = this.uiCanvas.getContext('2d');

        // Shader program
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, this.compileShader(gl.VERTEX_SHADER, vertexShaderCode));
        gl.attachShader(this.shaderProgram, this.compileShader(gl.FRAGMENT_SHADER, fragShaderCode));
        gl.linkProgram(this.shaderProgram);
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(this.shaderProgram));
        }
        gl.useProgram(this.shaderProgram);

        // Quad
        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        const verts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(this.shaderProgram, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        // UI canvas texture
        this.uiTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.uiTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Grain texture
        this.texGrain = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texGrain);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const tmpData = new Uint8Array([0, 0, 0, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, tmpData);

        const grainImg = new Image();
        grainImg.src = URL.createObjectURL(grainImgBlob);
        grainImg.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, this.texGrain);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, grainImg);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        };

        // Shader uniforms
        this.uTex = gl.getUniformLocation(this.shaderProgram, 'uTex');
        this.uTexGrain = gl.getUniformLocation(this.shaderProgram, 'uTexGrain');
        this.uRes = gl.getUniformLocation(this.shaderProgram, 'uRes');
        this.uTime = gl.getUniformLocation(this.shaderProgram, 'uTime');

        // Window resize event listener
        this.resize = this.resize.bind(this)
        window.addEventListener('resize', this.resize);
        this.resize();
    }

    compileShader(type, src) {
        const s = this.gl.createShader(type);
        this.gl.shaderSource(s, src);
        this.gl.compileShader(s);
        if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
            throw new Error(this.gl.getShaderInfoLog(s));
        }
        return s;
    }

    resize() {
        const w = Math.max(1, Math.floor(window.innerWidth));
        const h = Math.max(1, Math.floor(window.innerHeight));
        this.glCanvas.width = Math.floor(w * this.DPR);
        this.glCanvas.height = Math.floor(h * this.DPR);
        this.glCanvas.style.width = w + 'px';
        this.glCanvas.style.height = h + 'px';

        this.uiCanvas.width = Math.floor(w * this.DPR);
        this.uiCanvas.height = Math.floor(h * this.DPR);
        this.uiCanvas.style.width = w + 'px';
        this.uiCanvas.style.height = h + 'px';

        this.uiCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.uiCtx.imageSmoothingEnabled = true;

        this.gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        this.gl.uniform2f(this.uRes, this.glCanvas.width, this.glCanvas.height);

        this.onResize(this.uiCanvas.width, this.uiCanvas.height);
    }

    onResize(canvasW, canvasH) {
        throw new Error("onResize not implemented.");
    }

    run() {
        let start = performance.now();
        let lastTime = start;
        const frame = (t) => {
            const delta = (t - lastTime) * 0.001;
            const timeSec = (t - start) * 0.001;
            lastTime = t;

            // Redraw every frame (for now)
            this.render();

            // upload uiCanvas to texture
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.uiTex);
            this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.uiCanvas);

            // draw quad
            this.gl.clearColor(0, 0, 0, 1); this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            this.gl.useProgram(this.shaderProgram);

            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.uiTex);
            this.gl.uniform1i(this.uTex, 0);

            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texGrain);
            this.gl.uniform1i(this.uTexGrain, 1);

            this.gl.uniform1f(this.uTime, timeSec);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    render() {
        throw new Error("render not implemented.");
    }
}

export default GlApp;

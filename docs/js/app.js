import GlApp from "./glApp.js";
import Terminal from "./terminal.js";
import repo from "./repository.js";

const GRAIN_IMG_PATH = "images/grain.png";

class App extends GlApp {
    constructor(vertexShaderCode, fragShaderCode, grainImgBlob, dirStructure) {
        super(vertexShaderCode, fragShaderCode, grainImgBlob);
        this.term = new Terminal(dirStructure, this.uiCtx);
        this.resize();
    }

    static async create() {
        const vs = await repo.getShader("main.vert");
        const fs = await repo.getShader("tv.frag");
        const dirStructure = await repo.getDirStructure();
        const grainImgBlob = await repo.downloadFile(GRAIN_IMG_PATH);
        return new App(vs, fs, grainImgBlob, dirStructure);
    }

    onResize(canvasW, canvasH) {
        if (this.term) {
            this.term.resize(canvasW, canvasH);
        }
    }

    render() {
        this.term.render();
    }
}

const app = await App.create();
export default app;

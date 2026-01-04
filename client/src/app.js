import GlApp from "./glApp.js";
import Terminal from "./terminal.js";
import repo from "./repository.js";

class App extends GlApp {
    constructor(vertexShaderCode, fragShaderCode, dirStructure) {
        super(vertexShaderCode, fragShaderCode);
        this.term = new Terminal(dirStructure, this.uiCtx);
        this.resize();
    }

    static async create() {
        const vs = await repo.getShader("main.vert");
        const fs = await repo.getShader("tv.frag");
        const dirStructure = await repo.getDirStructure();
        return new App(vs, fs, dirStructure);
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

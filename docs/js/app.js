import GlApp from "./glApp.js";
import Terminal from "./terminal.js";
import repo from "./repository.js";
import strings from "./strings.js";

class App extends GlApp {
    constructor(vertexShaderCode, fragShaderCode, dirStructure, font) {
        super(vertexShaderCode, fragShaderCode);
        this.term = new Terminal(dirStructure, this.uiCtx, font);
        this.resize();
    }

    static async create() {
        const vs = strings.vertShader;
        const fs = strings.fragShader;

        const dirStructure = await repo.getDirStructure();

        // const font = "900 28px 'Doto'";
        const font = "28px 'JetBrains Mono'";
        await document.fonts.load(font);

        return new App(vs, fs, dirStructure, font);
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

export default App;

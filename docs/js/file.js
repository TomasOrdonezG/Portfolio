class File {
    constructor(text) {
        this.text = text;
    }

    run() { }
};

class LoadFile extends File {
    constructor(duration, steps) {
        super("");
        this.steps = steps;
        this.interval = duration / this.steps;
        this.loaded = false;
    }

    async load() {
        for (let i = 1; i <= this.steps && !this.loaded; i++) {
            this.text = "[" + "=".repeat(i) + " ".repeat(this.steps - i) + "]";
            await new Promise(resolve => setTimeout(resolve, this.interval));
        }
    }

    async doneLoading() {
        this.text = "[" + "=".repeat(this.steps) + "]";
        this.loaded = true;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
};

class FileFactory {
    static create(name, data) {
        const parts = name.split(".");

        if (parts.length == 1 || parts[1] == "txt") {
            return new File(data);
        }

        data = JSON.parse(data);
        return new File(data.text);
    }

    static createLoadFile(space) {
        return new LoadFile(500, space - 2);
    }
};

export default FileFactory;

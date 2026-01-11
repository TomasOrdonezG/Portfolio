import repo from "./repository.js";

const MAX_IMG_WIDTH = 1000;
const MAX_IMG_HEIGHT = 700;

class File {
    constructor(text) {
        this.scroll = 0;
        this.setText(text);
    }

    async run() { }

    async load() { }

    onResize() { }

    onFocus() { }

    onHover() { }

    getScroll() {
        return this.scroll;
    }

    getMaxScroll() {
        return this.lines.length - 1;
    }

    setText(text) {
        this.lines = text.replace(/\n+$/, "").split("\n");
    }

    scrollUp() {
        this.scroll = Math.max(this.scroll - 1, 0);
    }

    scrollDown() {
        this.scroll = Math.min(this.scroll + 1, this.getMaxScroll());
    }

    render(ctx, rows, cols, lineHeight, colWidth, lineVerticalMargin, toCanvasCoords) {
        const write = (text, r, c) => {
            const { x, y } = toCanvasCoords(r, c);
            ctx.fillText(text, x, y + lineHeight - (lineVerticalMargin / 2.0));
        }

        const lines = this.lines.slice(this.scroll);
        for (let i = 0; i < Math.min(lines.length, rows); i++) {
            write(lines[i], i, 0);
        }
    }
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
            this.setText("[" + "=".repeat(i) + " ".repeat(this.steps - i) + "]");

            const t = i / this.steps;
            const delay = this.interval * Math.exp(3 * t);

            await new Promise(r => setTimeout(r, delay));
        }
    }

    async doneLoading() {
        this.setText("[" + "=".repeat(this.steps) + "]");
        this.loaded = true;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
};

class JSONFile extends File {
    constructor(data) {
        super(data.text);
        this.data = data;
    }
}

class FileOpeningFile extends JSONFile {
    async run() {
        await repo.openFile(this.data.firebaseStoragePath);
    }
}

class URLFile extends JSONFile {
    async run() {
        window.open(this.data.url, "_blank", "noopener");
    }
}

class MarkdownFile extends File {
    constructor(text) {
        super(text);
        this.content = [];
        this.dirty = true;
    }

    onResize() { this.dirty = true; }

    onFocus() { this.dirty = true; }

    onHover() { this.dirty = true; }

    getMaxScroll() { return this.content.length - 1; }

    async load() {
        this.imageCache = {};
        const promises = [];

        // Find images
        for (const line of this.lines) {
            const imageName = this.hasEmbeddedImage(line);
            if (!imageName || this.imageCache[imageName]) continue;

            // Load image
            const imgURL = await repo.getImageDownloadURL(imageName);
            if (imgURL == null) continue;
            const p = new Promise((res, rej) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    this.imageCache[imageName] = img;
                    res(img);
                };
                img.onerror = rej;
                img.src = imgURL;
            });
            promises.push(p);
        }

        await Promise.all(promises);
    }

    hasEmbeddedImage(line) {
        const re = /^\[\[(.+)\]\]$/;
        const matches = line.match(re);
        return matches ? matches[1] : null;
    }

    recomputeContent(ctx, rows, cols, rowHeight, colWidth, lineVerticalMargin, toCanvasCoords) {
        const w = cols * colWidth;
        const h = rows * rowHeight;

        const fitImage = (img) => {
            const imgW = img.width;
            const imgH = img.height;
            const imgAR = imgW / imgH;
            const spaceAR = w / h;

            let drawWidth, drawHeight;
            if (imgAR > spaceAR) {
                drawWidth = w;
                drawHeight = w / imgAR;
            } else {
                drawHeight = h;
                drawWidth = h * imgAR;
            }

            const scale = Math.min(1, MAX_IMG_WIDTH / drawWidth, MAX_IMG_HEIGHT / drawHeight);
            drawWidth *= scale;
            drawHeight *= scale;

            const imgRows = Math.ceil(drawHeight / rowHeight);
            return { drawWidth, drawHeight, imgRows };
        };

        // Split up lines
        const splitUpLines = [];
        for (const line of this.lines) {
            if (line.length <= cols) {
                splitUpLines.push(line);
                continue;
            }

            const words = line.split(" ");
            const bullet = words.length > 0 && words[0] == "-";
            let subLine = "";
            for (const word of words) {
                const extra = subLine === "" ? word.length : word.length + 1;

                if (subLine.length + extra > cols) {
                    splitUpLines.push(subLine);
                    subLine = (bullet ? "  " : "") + word;
                } else {
                    subLine = subLine === "" ? word : subLine + " " + word;
                }
            }

            if (subLine !== "") {
                splitUpLines.push(subLine);
            }
        }

        // Compute content for each line
        this.content = [];
        for (const line of splitUpLines) {
            this.fileHeight++;
            const idx = this.content.length;

            // Line of text
            const imgName = this.hasEmbeddedImage(line);
            if (imgName == null) {
                this.content.push({
                    type: "text", draw: () => {
                        const { x, y } = toCanvasCoords(idx - this.scroll, 0);
                        ctx.fillText(line, x, y + rowHeight - (lineVerticalMargin / 2.0));
                    }
                });
                continue;
            }

            // Image failed to load
            const img = this.imageCache[imgName];
            if (img == null) {
                this.content.push({
                    type: "text",
                    draw: () => {
                        const { x, y } = toCanvasCoords(idx - this.scroll, 0);
                        ctx.fillText(`[[Image '${imgName}' not found]]`, x, y + rowHeight - (lineVerticalMargin / 2.0));
                    }
                });
                continue;
            }

            // Image
            const { drawWidth, drawHeight, imgRows } = fitImage(img);
            this.content.push({
                type: "image",
                top: true,
                draw: () => {
                    const { x, y } = toCanvasCoords(idx - this.scroll, 0);
                    ctx.drawImage(img, x + Math.round((w - drawWidth) / 2), y, drawWidth, drawHeight);
                }
            });
            for (let i = 1; i < imgRows; i++) {
                this.content.push({
                    type: "image",
                    top: false,
                    draw: () => {
                        const syCanvas = i * rowHeight;
                        const destRemainH = Math.max(0, Math.round(drawHeight - syCanvas));

                        if (destRemainH <= 0) return;

                        // Crop image and draw
                        const { x, y } = toCanvasCoords(0, 0);
                        const scaleY = img.height / drawHeight;
                        const srcX = 0;
                        const srcY = Math.round(syCanvas * scaleY);
                        const srcH = Math.min(img.height - srcY, Math.round(destRemainH * scaleY));
                        const destX = x + Math.round((w - drawWidth) / 2);
                        const destY = y;
                        const destW = Math.round(drawWidth);
                        const destH = Math.round(destRemainH);

                        ctx.drawImage(img, srcX, srcY, img.width, srcH, destX, destY, destW, destH);
                    }
                });
            }
        }
    }

    render(ctx, rows, cols, rowHeight, colWidth, lineVerticalMargin, toCanvasCoords) {
        // Recompute content if dirty
        if (this.dirty) {
            this.recomputeContent(ctx, rows, cols, rowHeight, colWidth, lineVerticalMargin, toCanvasCoords);
            this.dirty = false;
        }

        // Render only visible lines
        const curContent = this.content.slice(this.scroll, Math.min(this.content.length, this.scroll + rows));
        let drawingImage = false;
        for (const item of curContent) {
            if (item.type == "text") {
                drawingImage = false;
                item.draw();
            } else if (item.type == "image" && (!drawingImage || item.top)) {
                item.draw();
                drawingImage = true;
            }
        }
    }
}

class FileFactory {
    static create(name, data) {
        const parts = name.split(".");

        if (parts.length == 1 || parts[1] == "txt") {
            return new File(data);
        } else if (parts[1] == "md") {
            return new MarkdownFile(data);
        }

        data = JSON.parse(data);

        if (parts[1] == "pdf") {
            return new FileOpeningFile(data);
        } else if (parts[1] == "url") {
            return new URLFile(data);
        }

        return new File(data.text);
    }

    static createLoadFile(space) {
        return new LoadFile(500, space - 2);
    }
};

export default FileFactory;

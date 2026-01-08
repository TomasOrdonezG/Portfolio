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
            await new Promise(resolve => setTimeout(resolve, this.interval));
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
        this.fileHeight = 0;
    }

    getMaxScroll() {
        return this.fileHeight - 1;
    }

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

    render(ctx, rows, cols, rowHeight, colWidth, lineVerticalMargin, toCanvasCoords) {
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
        const lines = [];
        for (const line of this.lines) {
            if (line.length <= cols) {
                lines.push(line);
                continue;
            }

            const words = line.split(" ");
            const bullet = words.length > 0 && words[0] == "-";
            let subLine = "";
            for (const word of words) {
                const extra = subLine === "" ? word.length : word.length + 1;

                if (subLine.length + extra > cols) {
                    lines.push(subLine);
                    subLine = (bullet ? "  " : "") + word;
                } else {
                    subLine = subLine === "" ? word : subLine + " " + word;
                }
            }

            if (subLine !== "") {
                lines.push(subLine);
            }
        }

        // Recompute file height
        this.fileHeight = 0;
        for (const line of lines) {
            this.fileHeight++;
            const imgName = this.hasEmbeddedImage(line);
            if (imgName == null) continue;
            const img = this.imageCache[imgName];
            if (img == null) continue;
            const { imgRows } = fitImage(img);
            this.fileHeight += imgRows - 1;
        }

        let row = 0;

        // Check for any images that should be drawn cropped
        let scroll = this.scroll;
        const linesBefore = lines.slice(0, this.scroll);
        for (let i = 0; i < linesBefore.length; i++) {
            const imgName = this.hasEmbeddedImage(linesBefore[i]);
            if (imgName == null) continue;
            const img = this.imageCache[imgName];
            if (img == null) continue;

            const { drawWidth, drawHeight, imgRows } = fitImage(img);

            if (i + imgRows >= this.scroll) {
                console.log(imgName);
                row = i + imgRows - this.scroll;
                scroll = i + 1;

                const syCanvas = (this.scroll - i) * rowHeight;
                const destRemainH = Math.max(0, Math.round(drawHeight - syCanvas));

                if (destRemainH <= 0) break;

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

                break;
            }
        }

        // Render
        const visibleLines = lines.slice(scroll);
        for (let i = 0; i < Math.min(visibleLines.length, rows); i++) {
            const line = visibleLines[i];
            const imageName = this.hasEmbeddedImage(line);

            if (imageName) {
                // Render image
                const { x, y } = toCanvasCoords(row, 0);
                const img = this.imageCache[imageName];

                // If image was not found
                if (img == null) {
                    const text = `[[Image '${imageName}' not found]]`;
                    ctx.fillText(text, x, y + rowHeight - (lineVerticalMargin / 2.0));
                    row++;
                    continue;
                }

                const { drawWidth, drawHeight, imgRows } = fitImage(img);
                ctx.drawImage(img, x + Math.round((w - drawWidth) / 2), y, drawWidth, drawHeight);
                row += imgRows;
            } else {
                // Write text
                const { x, y } = toCanvasCoords(row, 0);
                ctx.fillText(line, x, y + rowHeight - (lineVerticalMargin / 2.0));
                row++;
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

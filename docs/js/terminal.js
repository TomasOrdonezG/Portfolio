import FileFactory from "./file.js";
import FileSystem from "./fileSystem.js";
import repo from "./repository.js";
import strings from "./strings.js";

class Terminal {
    constructor(dirStructure, ctx, font, styles = {}) {
        this.fs = new FileSystem(dirStructure);
        this.ctx = ctx;

        this.styles = {
            bgColor: styles.bgColor ?? '#071023',
            highlightColor: styles.highlightColor ?? '#59ffb7',
            fontSize: styles.fontSize ?? 28,
            lineVerticalMarginPer: styles.lineVerticalMarginPer ?? 0.3,
            leftSectionWidthPer: styles.leftSectionWithPer ?? 0.3,
            horizontalMargin: styles.horizontalMargin ?? 1,
        };

        this.font = font;
        this.ctx.font = this.font;
        const metrics = this.ctx.measureText('M');
        this.charWidth = metrics.width;
        this.lineHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
        this.lineVerticalMargin = this.styles.lineVerticalMarginPer * this.lineHeight;
        this.lineHeight += this.lineVerticalMargin;

        this.lsIdx = 0;
        this.fileCache = {};
        this.setFileFocused(false);

        document.addEventListener("keydown", e => {
            if (e.code == "ArrowUp") {
                if (!this.fileFocused) {
                    // Scroll file system
                    this.lsIdx = Math.max(this.lsIdx - 1, 0);
                } else {
                    // Scroll file
                    // TODO
                }
            } else if (e.code == "ArrowDown") {
                if (!this.fileFocused) {
                    // Scroll file system
                    const ls = this.fs.ls();
                    if (ls.length == 0) {
                        this.lsIdx = 0;
                    } else {
                        this.lsIdx = Math.min(this.lsIdx + 1, this.fs.ls().length - 1);
                    }
                } else {
                    // Scroll file
                    // TODO
                }
            } else if (e.code == "ArrowRight") {
                if (this.fs.isSubdir(this.lsIdx)) {
                    this.lsIdx = this.fs.cd(this.lsIdx);
                } else {
                    this.setFileFocused(true);
                }
            } else if (e.code == "ArrowLeft") {
                if (!this.fs.inRoot() && !this.fileFocused) {
                    this.lsIdx = this.fs.cd(-1);
                } else if (this.fileFocused) {
                    this.setFileFocused(false);
                }
            } else if (e.code == "Enter") {
                if (this.fs.isFile(this.lsIdx)) {
                    const fileID = this.fs.getFileID(this.lsIdx);
                    if (fileID in this.fileCache) {
                        this.fileCache[fileID].run();
                    }
                }
            }
        });
    }

    resize(canvasW, canvasH) {
        this.cols = Math.floor(canvasW / this.charWidth);
        this.rows = Math.floor(canvasH / this.lineHeight);
        this.setFileFocused(this.fileFocused);
    }

    setFileFocused(v) {
        this.scroll = 0;
        this.fileFocused = v;
        if (this.fileFocused) {
            this.leftSectionCols = this.styles.horizontalMargin;
        } else {
            this.leftSectionCols = Math.floor(this.styles.leftSectionWidthPer * this.cols);
        }
        this.rightSectionCols = this.cols - Math.floor(this.styles.leftSectionWidthPer * this.cols) - 2;
    }

    toCanvasCoords(row, col) {
        return {
            x: col * this.charWidth,
            y: row * this.lineHeight,
        };
    }

    write(text, row, col, highlighted = false) {
        this.ctx.font = this.font;
        this.ctx.fillStyle = highlighted ? this.styles.bgColor : this.styles.highlightColor;
        const lines = text.split("\n");
        for (const line of lines) {
            const { x, y } = this.toCanvasCoords(row, col);
            this.ctx.fillText(line, x, y + this.lineHeight - (this.lineVerticalMargin / 2.0));
            row++;
        }
    }

    drawRect(row, col, width, height, highlight = false) {
        const { x, y } = this.toCanvasCoords(row, col);
        const { x: w, y: h } = this.toCanvasCoords(height, width);
        this.ctx.fillStyle = highlight ? this.styles.highlightColor : this.styles.bgColor;
        this.ctx.fillRect(x, y, w, h);
    }

    drawSeparator(row, col, length) {
        const f = 0.1;
        let { x, y } = this.toCanvasCoords(row, col);
        let { x: w, y: h } = this.toCanvasCoords(length, 1);
        w *= f;
        x += (this.charWidth - w) / 2.0;
        this.ctx.fillStyle = this.styles.highlightColor;
        this.ctx.fillRect(x, y, w, h);
    }

    async requestFile(fileID) {
        if (fileID in this.fileCache) return;

        this.fileCache[fileID] = FileFactory.createLoadFile(this.rightSectionCols);
        this.fileCache[fileID].load();
        const fileData = await repo.getFileData(fileID);
        await this.fileCache[fileID].doneLoading();
        this.fileCache[fileID] = FileFactory.create(fileData.name, fileData.data);
    }

    getHeader() {
        const fullNameLines = strings.headerFullName.split("\n");
        const fullNameWidth = fullNameLines.reduce((a, b) => (b.length > a.length ? b : a), "").length;
        return fullNameWidth < this.cols ? strings.headerFullName : strings.headerFirstName;
    }

    render() {
        const sepCol = this.leftSectionCols;
        let row = 1;

        // Background color
        this.drawRect(0, 0, this.cols + 1, this.rows + 1);

        // Header
        const header = this.getHeader();
        const headerLines = header.split("\n").length;
        this.write(header, row, 3);
        row += headerLines + 1;

        // CWD path
        const pwd = this.fs.pwd() + (this.fileFocused ? this.fs.getFileName(this.lsIdx) : "");
        this.write(pwd, row, 1);
        row++;

        // Highlight rect
        this.drawRect(this.lsIdx + row, 2, sepCol - 2, 1, true);

        // CWD contents
        const ls = this.fs.ls();
        for (let i = 0; i < ls.length; i++) {
            const name = ls[i];
            this.write(name, i + row, this.styles.horizontalMargin + 2, i == this.lsIdx);
        }

        // Background color on the right section
        this.drawRect(row, sepCol, this.cols - sepCol + 1, this.rows - row + 1);

        // Left and center separators
        this.drawSeparator(row, 1, this.rows - row);
        this.drawSeparator(row, sepCol, this.rows - row);

        // Hovered subdir contents
        if (this.fs.isSubdir(this.lsIdx)) {
            const lsSubdir = this.fs.lsSubdir(this.lsIdx);
            for (let i = 0; i < lsSubdir.length; i++) {
                const name = lsSubdir[i];
                this.write(name, i + row, sepCol + 2);
            }
        }

        // Hovered file contents
        if (this.fs.isFile(this.lsIdx)) {
            const fileID = this.fs.getFileID(this.lsIdx);
            this.requestFile(fileID);

            const rightSectionRows = this.rows - row;
            this.fileCache[fileID].render(
                this.ctx,
                rightSectionRows,
                this.rightSectionCols,
                this.lineHeight,
                this.lineVerticalMargin,
                this.scroll,
                (r, c) => this.toCanvasCoords(row + r, sepCol + c + 1)
            );
        }

        // Rightmost separator
        this.drawRect(row, this.cols - 1, 2, this.rows - row);
        this.drawSeparator(row, this.cols - 1, this.rows - row);
    }
}

export default Terminal;

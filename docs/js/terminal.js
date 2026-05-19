import FileFactory from "./file.js";
import FileSystem from "./fileSystem.js";
import repo from "./repository.js";
import { soundMgr, BEEP_SOUND_NAME } from "./soundManager.js";
import strings from "./strings.js";

class Terminal {
    constructor(dirStructure, ctx, canvasW, canvasH, font, styles = {}) {
        this.styles = {
            bgColor: styles.bgColor ?? '#071023',
            highlightColor: styles.highlightColor ?? '#59ffb7',
            fontSize: styles.fontSize ?? 28,
            lineVerticalMarginPer: styles.lineVerticalMarginPer ?? 0.3,
            leftSectionWidthPer: styles.leftSectionWithPer ?? 0.3,
            horizontalMargin: styles.horizontalMargin ?? 1,
        };

        this.ctx = ctx;
        this.font = font;
        this.ctx.font = this.font;
        const metrics = this.ctx.measureText('M');
        this.charWidth = metrics.width;
        this.lineHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
        this.lineVerticalMargin = this.styles.lineVerticalMarginPer * this.lineHeight;
        this.lineHeight += this.lineVerticalMargin;

        this.fs = new FileSystem(dirStructure);
        this.resize(canvasW, canvasH);
        this.setFileFocused(false);

        this.lsIdx = 0;
        this.fileCache = {};
        this.loadFiles();

        // Keydown events
        document.addEventListener("keydown", e => this.onKeydown(e.code));

        // Mapping mobile controls to keys
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchThreshold = 40;
        this.lastTapTime = 0;
        this.tapDelay = 300;

        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    }

    onKeydown(keycode) {
        if (keycode == "ArrowUp") {
            soundMgr.playSound(BEEP_SOUND_NAME);
            if (!this.fileFocused) {
                // Scroll file system
                this.lsIdx = Math.max(this.lsIdx - 1, 0);

                // Notify new file of hover
                this.hoveredFile(f => f.onHover());
            } else {
                // Scroll file
                this.fileCache[this.fs.getFileID(this.lsIdx)].scrollUp();
            }
        }

        else if (keycode == "ArrowDown") {
            soundMgr.playSound(BEEP_SOUND_NAME);
            if (!this.fileFocused) {
                // Scroll file system
                const ls = this.fs.ls();
                if (ls.length == 0) {
                    this.lsIdx = 0;
                } else {
                    this.lsIdx = Math.min(this.lsIdx + 1, this.fs.ls().length - 1);
                }

                // Notify new file of hover
                this.hoveredFile(f => f.onHover());
            } else {
                // Scroll file
                this.fileCache[this.fs.getFileID(this.lsIdx)].scrollDown();
            }
        }

        else if (keycode == "ArrowRight") {
            if (this.fs.isSubdir(this.lsIdx)) {
                soundMgr.playSound(BEEP_SOUND_NAME);
                this.lsIdx = this.fs.cd(this.lsIdx);
            } else if (this.fs.isFile(this.lsIdx)) {
                soundMgr.playSound(BEEP_SOUND_NAME);
                this.setFileFocused(true);

                // Notify file of focus
                this.hoveredFile(f => f.onFocus());
            }
        }

        else if (keycode == "ArrowLeft") {
            if (!this.fs.inRoot() && !this.fileFocused) {
                soundMgr.playSound(BEEP_SOUND_NAME);
                this.lsIdx = this.fs.cd(-1);
            } else if (this.fileFocused) {
                soundMgr.playSound(BEEP_SOUND_NAME);
                this.setFileFocused(false);

                // Notify file of hover
                this.hoveredFile(f => f.onHover());
            }
        }

        else if (keycode == "Enter") {
            // Run hovered file
            this.hoveredFile(f => {
                soundMgr.playSound(BEEP_SOUND_NAME);
                f.run();
            });
        }
    }

    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
    }

    handleTouchEnd(e) {
        const endX = e.changedTouches[0].screenX;
        const endY = e.changedTouches[0].screenY;

        const diffX = endX - this.touchStartX;
        const diffY = endY - this.touchStartY;
        const absDiffX = Math.abs(diffX);
        const absDiffY = Math.abs(diffY);

        // Double taps map to enter
        if (absDiffX < 10 && absDiffY < 10) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - this.lastTapTime;

            if (tapLength < this.tapDelay && tapLength > 0) {
                this.onKeydown("Enter");
                e.preventDefault();
            }
            this.lastTapTime = currentTime;
            return;
        }

        // Check movement threshold
        if (absDiffX < this.touchThreshold && absDiffY < this.touchThreshold) {
            return;
        }

        // Determine swipe direction
        if (absDiffX > absDiffY) {
            // Horizontal swipes
            if (diffX > 0) {
                this.onKeydown("ArrowLeft");
            } else {
                this.onKeydown("ArrowRight");
            }
        } else {
            // Vertical swipes
            if (diffY > 0) {
                this.onKeydown("ArrowUp");
            } else {
                this.onKeydown("ArrowDown");
            }
        }
    }

    hoveredFile(callback) {
        if (this.fs.isFile(this.lsIdx)) {
            const id = this.fs.getFileID(this.lsIdx);
            if (id in this.fileCache) {
                callback(this.fileCache[id]);
            }
        }
    }

    resize(canvasW, canvasH) {
        this.cols = Math.floor(canvasW / this.charWidth);
        this.rows = Math.floor(canvasH / this.lineHeight);
        this.setFileFocused(this.fileFocused);

        // Notify hovered file of resize
        this.hoveredFile(f => f.onResize());
    }

    setFileFocused(isFileFocused) {
        this.fileFocused = isFileFocused;
        if (this.fileFocused) {
            this.leftSectionCols = this.styles.horizontalMargin;
        } else {
            this.leftSectionCols = Math.floor(this.styles.leftSectionWidthPer * this.cols);
        }
        this.rightSectionCols = this.cols - Math.floor(this.styles.leftSectionWidthPer * this.cols) - 3;
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

    loadFiles() {
        const files = this.fs.getAllFiles();

        // Set each file to a temporary loader file
        for (const { name: fileName, id: fileID } of files) {
            const tmpLoadFile = FileFactory.createLoadFile(fileName, this.rightSectionCols);
            this.fileCache[fileID] = tmpLoadFile;
            tmpLoadFile.load();
        }

        // Load each file in the background
        for (const { name: fileName, id: fileID } of files) {
            repo.getFileData(fileID).then(fileData => {
                const file = FileFactory.create(fileName, fileData.data);
                file.load().then(() => this.fileCache[fileID] = file);
            });
        }
    }

    getHeader() {
        const fullNameLines = strings.headerFullName.split("\n");
        const fullNameWidth = fullNameLines.reduce((a, b) => (b.length > a.length ? b : a), "").length;
        return fullNameWidth < this.cols ? strings.headerFullName : strings.headerFirstName;
    }

    render() {
        const sepCol = this.leftSectionCols;
        let row = 0;

        // Background color
        this.drawRect(0, 0, this.cols + 1, this.rows + 1);

        // Header
        const header = this.getHeader();
        const headerLines = header.split("\n").length;
        this.write(header, row, 3);
        row += headerLines;

        // CWD path
        const pwd = this.fs.pwd() + (this.fileFocused ? this.fs.getFileName(this.lsIdx) : "");
        this.write(pwd, row, 1);
        row += 2;

        // Highlight rect
        this.drawRect(this.lsIdx + row, 2, sepCol - 2, 1, true);

        // CWD contents
        const ls = this.fs.ls();
        for (let i = 0; i < ls.length; i++) {
            const name = ls[i];
            this.write(name, i + row, this.styles.horizontalMargin + 2, i == this.lsIdx);
        }

        // Background color on the right section
        const sectionRows = this.rows - row;
        this.drawRect(row, sepCol, this.cols - sepCol + 1, sectionRows + 1);

        // Left and center separators
        this.drawSeparator(row, 1, sectionRows);
        this.drawSeparator(row, sepCol, sectionRows);

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
            this.fileCache[fileID].render(
                this.ctx,
                sectionRows,
                this.fileFocused ? this.cols - 3 : this.rightSectionCols,
                this.lineHeight,
                this.charWidth,
                this.lineVerticalMargin,
                (r, c) => this.toCanvasCoords(row + r, sepCol + c + 1)
            );
        }

        // Rightmost separator
        this.drawRect(row, this.cols - 2, 3, sectionRows + 1);
        this.drawSeparator(row, this.cols - 2, sectionRows);

        // Scrollbar
        if (this.fileFocused) {
            const file = this.fileCache[this.fs.getFileID(this.lsIdx)];
            const sectionHeight = this.lineHeight * sectionRows;

            const contentRows = file.getMaxScroll() + sectionRows;
            const { x, y } = this.toCanvasCoords(row, this.cols - 2);
            const w = this.charWidth;
            const h = sectionRows / contentRows * sectionHeight;
            const offset = file.getScroll() / contentRows * sectionHeight;

            this.ctx.fillStyle = this.styles.highlightColor;
            this.ctx.fillRect(x, y + offset, w, h);
        }
    }
}

export default Terminal;

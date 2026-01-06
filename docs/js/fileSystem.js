class FileSystem {
    constructor(dirStructure) {
        this.dirStructure = dirStructure;
        this.idxPath = [];
        this.path = [];

        this.cwdCached = undefined;
        this.cwdDirty = true;
    }

    cwd() {
        if (!this.cwdDirty) {
            return this.cwdCached;
        }

        let curr = this.dirStructure;
        for (const i of this.idxPath) {
            curr = curr.subdirs[i];
        }

        this.cwdCached = curr;
        this.cwdDirty = false;

        return curr;
    }

    cd(lsIdx) {
        const cwd = this.cwd();
        if (lsIdx != -1 && !this.isSubdir(lsIdx)) {
            throw Error("Invalid subdirectory index.");
        }

        if (lsIdx == -1 && this.idxPath.length == 0) {
            throw Error("Root directory has no parent directory.");
        }

        const subdirIdx = this.lsIdxToSubdirIdx(lsIdx);
        let newLsIdx;
        if (lsIdx == -1) {
            newLsIdx = this.idxPath.pop();
            this.path.pop();
            this.cwdDirty = true;
            newLsIdx += this.cwd().files.length;
        } else {
            this.idxPath.push(subdirIdx);
            this.path.push(cwd.subdirs[subdirIdx].name);
            this.cwdDirty = true;
            newLsIdx = 0;
        }

        return newLsIdx;
    }

    inRoot() {
        return this.idxPath.length == 0;
    }

    getFileID(lsIdx) {
        const cwd = this.cwd();
        if (!this.isFile(lsIdx)) {
            throw Error("Invalid file index.");
        }

        const fileIdx = this.lsIdxToFileIdx(lsIdx);
        return cwd.files[fileIdx].id;
    }

    getFileName(lsIdx) {
        if (!this.isFile(lsIdx)) {
            throw Error("Invalid file index.");
        }
        const fileIdx = this.lsIdxToFileIdx(lsIdx);
        return this.cwd().files[fileIdx].name;
    }

    pwd() {
        return "/" + this.path.join("/") + (this.path.length > 0 ? "/" : "");
    }

    lsByIdxPath(idxPath) {
        let curr = this.dirStructure;
        for (const i of idxPath) {
            curr = curr.subdirs[i];
        }
        const files = curr.files.map(file => file.name);
        const dirs = curr.subdirs.map(subdir => subdir.name + "/");
        return [...files, ...dirs];
    }

    ls() {
        return this.lsByIdxPath(this.idxPath);
    }

    lsSubdir(lsIdx) {
        if (!this.isSubdir(lsIdx)) {
            throw Error("Invalid subdirectory index.");
        }

        const subdirIdx = this.lsIdxToSubdirIdx(lsIdx);
        return this.lsByIdxPath([...this.idxPath, subdirIdx]);
    }

    lsParentDir() {
        if (this.idxPath.length == 0) {
            return [];
        }

        return this.lsByIdxPath(this.idxPath.slice(0, -1));
    }

    isSubdir(lsIdx) {
        const cwd = this.cwd();
        return cwd.files.length <= lsIdx && lsIdx < (cwd.files.length + cwd.subdirs.length);
    }

    isFile(lsIdx) {
        return 0 <= lsIdx && lsIdx < this.cwd().files.length;
    }

    lsIdxToSubdirIdx(lsIdx) {
        return lsIdx - this.cwd().files.length;
    }

    lsIdxToFileIdx(lsIdx) {
        return lsIdx;
    }
}

export default FileSystem;

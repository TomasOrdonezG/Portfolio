import repo from "./repository.js";

const BEEP_SOUND_NAME = "beep";
const BEEP_SOUND_FILE_NAME = "beep.wav";

class SoundManager {
    constructor() {
        this.sounds = {};
        this.unlocked = false;
    }

    unlock() {
        if (this.unlocked) return;

        const silent = new Audio();
        silent.volume = 0;
        silent.play().catch(() => { });
        this.unlocked = true;
    }

    async register(name, soundFileName) {
        if (name in this.sounds) return;
        const url = await repo.getSoundDownloadURL(soundFileName);
        if (url == null) return;
        const sound = new Audio(url);
        if (sound == null) return;
        sound.preload = "auto";
        this.sounds[name] = sound;
    }

    playSound(name) {
        if (!this.unlocked) this.unlock();
        const sound = this.sounds[name];
        if (!sound) return;

        sound.currentTime = 0;
        sound.play().catch(() => { });
    }
}


const soundMgr = new SoundManager();
await soundMgr.register(BEEP_SOUND_NAME, BEEP_SOUND_FILE_NAME);

export { soundMgr, BEEP_SOUND_NAME };

import app from "./app.js"

await document.fonts.ready;

// ----- Simple app state -----
const items = Array.from({ length: 8 }, (_, i) => ({ id: i, title: `Item ${i + 1}` }));
let selectedIndex = 0;
let contentCache = {};

// Simulated backend fetch that returns markdown and an embedded image (data URL)
function makeDemoImageDataURL(i, w = 600, h = 300) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = ['#b44', '#48b', '#4b8', '#db8', '#8bd', '#8db', '#6b6', '#b86'][i % 8];
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = 'bold 44px Consolas, monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('Image for Item ' + (i + 1), w / 2, h / 2);
    return c.toDataURL();
}

function fetchItem(id) {
    // Return a promise that resolves with markdown content
    if (contentCache[id]) return Promise.resolve(contentCache[id]);
    return new Promise((res) => {
        setTimeout(() => {
            const imgURL = makeDemoImageDataURL(id);
            const md = `# ${items[id].title}\n\nThis is a demo description for **${items[id].title}**.\n\nHere is a small list:\n\n- point one\n- point two\n- point three\n\n![alt](${imgURL})\n\nAnd a closing paragraph to test wrapping and multi-line rendering.`;
            const entry = { md, images: [imgURL] };
            contentCache[id] = entry;
            res(entry);
        }, 350 + Math.random() * 300);
    });
}

// Preload initial selected
fetchItem(selectedIndex);

// ----- Markdown renderer (very small): converts to lines and simple block types -----
function parseMarkdown(md) {
    const lines = md.split(/\r?\n/);
    const out = [];
    for (let raw of lines) {
        raw = raw.trimRight();
        if (!raw) { out.push({ type: 'blank' }); continue; }
        if (/^#{1,6}\s/.test(raw)) {
            const level = raw.match(/^#{1,6}/)[0].length;
            out.push({ type: 'heading', level, text: raw.replace(/^#{1,6}\s/, '') });
            continue;
        }
        if (/^[-*+]\s+/.test(raw)) { out.push({ type: 'li', text: raw.replace(/^[-*+]\s+/, '') }); continue; }
        // image syntax ![alt](url)
        const img = raw.match(/!\[[^\]]*\]\(([^)]+)\)/);
        if (img) { out.push({ type: 'image', src: img[1] }); continue; }
        // fallback paragraph
        out.push({ type: 'p', text: raw });
    }
    return out;
}

// ----- UI drawing -----
const uiCtx = app.uiCtx;
const DPR = app.DPR;
function drawUI() {
    const w = app.uiCanvas.width / DPR;
    const h = app.uiCanvas.height / DPR;
    uiCtx.clearRect(0, 0, w, h);

    // background
    uiCtx.fillStyle = '#013a2b';
    uiCtx.fillRect(0, 0, w, h);

    const leftW = Math.max(180, Math.floor(w * 0.28));
    const gap = 16;

    // Left panel
    uiCtx.fillStyle = '#071023';
    uiCtx.fillRect(0, 0, leftW, h);
    uiCtx.fillStyle = '#071023';
    uiCtx.font = '16px Consolas, monospace';
    uiCtx.textBaseline = 'middle';

    for (let i = 0; i < items.length; i++) {
        const y = 20 + i * 44;
        const item = items[i];
        const isSel = (i === selectedIndex);
        if (isSel) {
            uiCtx.fillStyle = '#59ffb7';
            uiCtx.fillRect(8, y - 18, leftW - 16, 36);
            uiCtx.fillStyle = '#071023';
        } else {
            uiCtx.fillStyle = '#59ffb7';
        }
        uiCtx.fillText(item.title, 20, y);
    }

    // Right panel
    const rx = leftW + gap;
    const rw = w - rx - gap;
    uiCtx.fillStyle = '#071823';
    uiCtx.fillRect(rx, 0, rw, h);

    // If content is loading show a loader
    const content = contentCache[selectedIndex];
    if (!content) {
        uiCtx.fillStyle = '#59ffb7';
        uiCtx.font = '18px Consolas, monospace';
        uiCtx.fillText('Loading...', rx + 20, 40);
        return;
    }

    // Render parsed markdown
    const blocks = parseMarkdown(content.md);
    let cursorY = 24;
    const marginX = rx + 20;
    uiCtx.fillStyle = '#59ffb7';
    for (const block of blocks) {
        if (block.type === 'blank') { cursorY += 12; continue; }
        if (block.type === 'heading') {
            uiCtx.font = (block.level === 1 ? '16px Consolas, monospace' : '16px bold Consolas, monospace');
            uiCtx.fillStyle = '#59ffb7';
            wrapText(block.text, marginX, cursorY, rw - 40, 26);
            cursorY += (block.level === 1 ? 36 : 28);
            continue;
        }
        if (block.type === 'p') {
            uiCtx.font = '16px Consolas, monospace';
            uiCtx.fillStyle = '#59ffb7';
            cursorY += wrapText(block.text, marginX, cursorY + 8, rw - 40, 20);
            continue;
        }
        if (block.type === 'li') {
            uiCtx.font = '16px Consolas, monospace';
            uiCtx.fillStyle = '#59ffb7';
            cursorY += wrapText('• ' + block.text, marginX, cursorY + 8, rw - 40, 20);
            continue;
        }
        if (block.type === 'image') {
            const imgSrc = block.src;
            // load image if necessary
            let img = content._img || null;
            if (!img) {
                img = new Image();
                img.src = imgSrc;
                img.onload = () => { content._img = img; };
                content._img = img; // optimistic store
            }
            // draw placeholder rect if not loaded
            const maxW = rw - 40; const maxH = 220;
            if (img && img.complete && img.naturalWidth) {
                const ar = img.naturalWidth / img.naturalHeight;
                let dw = maxW, dh = Math.round(dw / ar);
                if (dh > maxH) { dh = maxH; dw = Math.round(dh * ar); }
                uiCtx.drawImage(img, marginX, cursorY + 8, dw, dh);
                cursorY += dh + 16;
            } else {
                uiCtx.fillStyle = '#244';
                uiCtx.fillRect(marginX, cursorY + 8, maxW, maxH);
                uiCtx.fillStyle = '#9fb7c8';
                uiCtx.font = '14px Consolas, monospace';
                uiCtx.fillText('Loading image...', marginX + 10, cursorY + 26);
                cursorY += maxH + 16;
            }
        }
    }
}

function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let drawY = y;
    uiCtx.font = uiCtx.font || '16px Consolas, monospace';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = uiCtx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            uiCtx.fillText(line, x, drawY);
            line = words[n] + ' ';
            drawY += lineHeight;
        } else {
            line = testLine;
        }
    }
    if (line) {
        uiCtx.fillText(line.trim(), x, drawY);
        drawY += lineHeight;
    }
    return drawY - y;
}

// basic keyboard navigation
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
        selectedIndex = Math.min(items.length - 1, selectedIndex + 1); fetchItem(selectedIndex);
    }
    if (e.key === 'ArrowUp') {
        selectedIndex = Math.max(0, selectedIndex - 1); fetchItem(selectedIndex);
    }
});

app.run(drawUI);

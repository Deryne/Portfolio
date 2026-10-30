// Builds a real text PDF (selectable, ATS friendly) from the .page markup of resume.html / fr/cv.html.
(() => {
  const btn = document.getElementById('pdf');
  if (!btn) return;
  const base = document.currentScript.src;
  const fr = document.documentElement.lang === 'fr';
  const W = 595.28, H = 841.89, M = 44, TOP = 42, BOTTOM = 40;
  const C = { ink: '#1d2726', muted: '#55605d', accent: '#b8660f', teal: '#1f7f72', line: '#d9b45a', soft: '#ecdcb4' };
  // Embedded fonts keep the layout identical in every PDF reader.
  const FONTS = [['Federo-Regular.ttf', 'Federo', 'normal'], ['Lato-Regular.ttf', 'Lato', 'normal'], ['Lato-Bold.ttf', 'Lato', 'bold']];
  const cache = {};

  async function loadFont(file) {
    if (cache[file]) return cache[file];
    const u = new Uint8Array(await (await fetch(new URL('fonts/' + file, base))).arrayBuffer());
    let s = '';
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return (cache[file] = btoa(s));
  }

  // Flatten inline markup into styled runs.
  function runs(node, st, out = []) {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { out.push({ ...st, text: n.textContent.replace(/\s+/g, ' ') }); continue; }
      if (n.nodeType !== 1) continue;
      const s = { ...st };
      if (n.matches('b, strong')) s.bold = true;
      if (n.matches('small')) { s.color = C.muted; s.size = st.size - 1.4; s.bold = false; }
      if (n.matches('a')) { s.color = C.teal; s.link = n.href; }
      if (n.matches('.role')) { s.color = C.accent; s.size = 14; }
      runs(n, s, out);
    }
    return out;
  }

  async function build() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    for (const [file, name, style] of FONTS) { doc.addFileToVFS(file, await loadFont(file)); doc.addFont(file, name, style); }
    doc.setLanguage(fr ? 'fr-FR' : 'en-US');
    doc.setProperties({ title: document.title, author: 'Deryne Four', subject: fr ? 'CV' : 'Resume', keywords: 'Unity, C#, C++, Unreal, Game Developer' });
    let y = TOP;

    const font = r => { doc.setFont(r.font || 'Lato', r.font ? 'normal' : (r.bold ? 'bold' : 'normal')); doc.setFontSize(r.size); doc.setTextColor(r.color); };
    const room = h => { if (y + h > H - BOTTOM) { doc.addPage(); y = TOP; } };

    // Word-wraps runs between x0 and x1; consecutive words of the same style are drawn in one call.
    function flow(list, x0, x1, lh) {
      const words = [];
      list.forEach(r => r.text.split(/(?<= )/).forEach(t => t && words.push({ ...r, text: t })));
      while (words.length && !words[0].text.trim()) words.shift();
      let line = [], w = 0;
      const flush = () => {
        while (line.length && !line[line.length - 1].text.trim()) line.pop();
        if (!line.length) return;
        const last = line[line.length - 1]; last.text = last.text.trimEnd();
        room(lh); y += lh;
        let x = x0, seg = null;
        const draw = () => {
          if (!seg) return;
          font(seg); doc.text(seg.text, x, y);
          const sw = doc.getTextWidth(seg.text);
          if (seg.link) { const t = seg.text.trimEnd(), tw = doc.getTextWidth(t); doc.setDrawColor(seg.color); doc.setLineWidth(.5); doc.line(x, y + 1.5, x + tw, y + 1.5); doc.link(x, y - seg.size, tw, seg.size + 2, { url: seg.link }); }
          x += sw;
        };
        for (const wd of line) {
          if (seg && seg.bold === wd.bold && seg.color === wd.color && seg.size === wd.size && seg.font === wd.font && seg.link === wd.link) seg.text += wd.text;
          else { draw(); seg = { ...wd }; }
        }
        draw();
        line = []; w = 0;
      };
      for (const wd of words) {
        font(wd);
        const ww = doc.getTextWidth(wd.text);
        if (w + doc.getTextWidth(wd.text.trimEnd()) > x1 - x0 && line.length) { flush(); if (!wd.text.trim()) continue; }
        line.push(wd); w += ww;
      }
      flush();
    }

    const body = { size: 9.6, color: C.ink };
    const page = document.querySelector('.page');

    // Header
    const h1 = page.querySelector('h1');
    flow(runs(h1, { size: 22, color: C.ink, font: 'Federo' }), M, W - M, 22);
    y += 4;
    flow(runs(page.querySelector('.contact'), { ...body, color: C.muted }), M, W - M, 13);
    y += 6; doc.setDrawColor(C.line); doc.setLineWidth(1.5); doc.line(M, y, W - M, y); y += 4;

    for (const el of page.querySelectorAll('main > h2, main > h3, main > ul, main > p, main > .grid')) {
      if (el.matches('h2')) {
        room(40); y += 22;
        doc.setFont('Federo', 'normal'); doc.setFontSize(12); doc.setTextColor(C.accent);
        doc.text(el.textContent.trim(), M, y, { charSpace: .9 });
        y += 4; doc.setDrawColor(C.soft); doc.setLineWidth(.75); doc.line(M, y, W - M, y); y += 1;
      } else if (el.matches('h3')) {
        y += 4; flow(runs(el, { ...body, bold: true, size: 10 }), M, W - M, 13.5);
      } else if (el.matches('ul')) {
        for (const li of el.children) {
          const y0 = y;
          flow(runs(li, body), M + 10, W - M, 13);
          doc.setFont('Lato', 'normal'); doc.setFontSize(body.size); doc.setTextColor(C.ink);
          doc.text('•', M + 2, y0 + 13);
        }
        y += 2;
      } else if (el.matches('p')) {
        flow(runs(el, body), M, W - M, 13);
      } else {
        const cells = [...el.children];
        doc.setFont('Lato', 'bold'); doc.setFontSize(body.size);
        const lw = Math.max(...cells.filter((c, i) => i % 2 === 0).map(c => doc.getTextWidth(c.textContent.trim()))) + 12;
        for (let i = 0; i < cells.length; i += 2) {
          const y0 = y;
          flow(runs(cells[i], { ...body, bold: true }), M, M + lw, 13);
          const y1 = y; y = y0;
          flow(runs(cells[i + 1], body), M + lw, W - M, 13);
          y = Math.max(y, y1);
        }
      }
    }
    return doc;
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try { (await build()).save(fr ? 'CV_Deryne_Four.pdf' : 'CV_Deryne_Four_EN.pdf'); }
    finally { btn.disabled = false; }
  });
  window.buildCvPdf = build;
})();

const box = document.getElementById('lightbox');

// Lecteur vidéo maison : la vidéo YouTube est recadrée pour cacher le titre, la chaîne et le logo,
// et on n'affiche qu'une barre de lecture à nous.
let ytReady;
const loadYouTube = () => ytReady ??= new Promise(resolve => {
  window.onYouTubeIframeAPIReady = resolve;
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
});
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

document.querySelectorAll('.video').forEach(btn => {
  const id = btn.dataset.yt;
  const poster = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
  btn.style.backgroundImage = poster;
  btn.addEventListener('click', async () => {
    const lang = document.documentElement.lang === 'fr';
    const box = document.createElement('div');
    box.className = 'player is-loading';
    box.innerHTML = `
      <div class="player__frame"><div></div></div>
      <button class="player__cover" aria-label="${lang ? 'Lecture / pause' : 'Play / pause'}"></button>
      <div class="player__bar">
        <span class="player__time">0:00</span>
        <div class="player__track" role="slider" aria-label="${lang ? 'Position dans la vidéo' : 'Video position'}" tabindex="0">
          <div class="player__fill"></div>
        </div>
        <span class="player__time player__time--total">0:00</span>
        <a class="player__yt" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"
           title="${lang ? 'Regarder sur YouTube' : 'Watch on YouTube'}" aria-label="${lang ? 'Regarder sur YouTube' : 'Watch on YouTube'}">
          <svg viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="5" fill="#ff0033"/><path d="M11 5.5v9l7.5-4.5z" fill="#fff"/></svg>
        </a>
      </div>`;
    box.style.setProperty('--poster', poster);
    btn.replaceWith(box);
    await loadYouTube();

    const cover = box.querySelector('.player__cover');
    const track = box.querySelector('.player__track');
    const fill = box.querySelector('.player__fill');
    const [now, total] = box.querySelectorAll('.player__time');
    let player, raf;
    const tick = () => {
      const d = player.getDuration() || 0, t = player.getCurrentTime() || 0;
      fill.style.width = d ? (t / d * 100) + '%' : '0';
      now.textContent = fmt(t); total.textContent = fmt(d);
      track.setAttribute('aria-valuenow', Math.round(t));
      raf = requestAnimationFrame(tick);
    };
    player = new YT.Player(box.querySelector('.player__frame div'), {
      videoId: id,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { autoplay: 1, controls: 0, rel: 0, iv_load_policy: 3, playsinline: 1, disablekb: 1, fs: 0 },
      events: {
        onReady: e => { e.target.playVideo(); tick(); },
        onStateChange: e => {
          // en pause ou à la fin, on remet l'affiche par-dessus pour cacher l'écran « Plus de vidéos »
          box.classList.toggle('is-playing', e.data === YT.PlayerState.PLAYING);
          box.classList.toggle('is-paused', e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED);
          if (e.data === YT.PlayerState.PLAYING) box.classList.remove('is-loading');
        },
      },
    });
    cover.addEventListener('click', () => {
      if (!player.getPlayerState) return;
      player.getPlayerState() === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
    });
    // basculer sur YouTube : on reprend au même moment et on met la vidéo d'ici en pause
    box.querySelector('.player__yt').addEventListener('click', e => {
      if (!player.getCurrentTime) return;
      e.currentTarget.href = `https://www.youtube.com/watch?v=${id}&t=${Math.floor(player.getCurrentTime())}s`;
      player.pauseVideo();
    });
    const seek = e => {
      const r = track.getBoundingClientRect();
      player.seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * player.getDuration(), true);
    };
    track.addEventListener('pointerdown', e => {
      seek(e);
      const move = ev => seek(ev);
      track.setPointerCapture(e.pointerId);
      track.addEventListener('pointermove', move);
      track.addEventListener('pointerup', () => track.removeEventListener('pointermove', move), { once: true });
    });
    track.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
      if (step) player.seekTo(player.getCurrentTime() + step, true);
    });
  });
});

document.querySelectorAll('.thumbs img').forEach(img => {
  img.addEventListener('click', () => {
    box.querySelector('img').src = img.src;
    box.querySelector('img').alt = img.alt;
    box.showModal();
  });
});
box.addEventListener('click', () => box.close());

// Kiosque : flèches pour faire défiler les projets
document.querySelectorAll('.kiosk').forEach(kiosk => {
  const track = kiosk.querySelector('.kiosk__track');
  const step = () => track.querySelector('.tile').offsetWidth + 16;
  kiosk.querySelector('.kiosk__prev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  kiosk.querySelector('.kiosk__next').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});

// Arrivée depuis le kiosque : se placer sur le projet visé une fois la page chargée
window.addEventListener('load', () => {
  const target = location.hash && document.querySelector(location.hash);
  if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
});

// Page Projets : alternance sombre/clair et filtres par moteur
const projects = [...document.querySelectorAll('.project')];
const stripe = () => projects.filter(p => !p.hidden).forEach((p, i) => p.classList.toggle('is-light', i % 2 === 1));
stripe();

document.querySelectorAll('.filter').forEach(btn => {
  const f = btn.dataset.filter;
  btn.querySelector('.filter__count').textContent =
    f === 'all' ? projects.length : projects.filter(p => p.dataset.engine === f).length;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', b === btn);
    });
    projects.forEach(p => { p.hidden = f !== 'all' && p.dataset.engine !== f; });
    stripe();
  });
});

// Accueil : la photo de profil se retourne pour montrer le portrait dessiné
document.querySelectorAll('.flip').forEach(flip => {
  const back = flip.querySelector('.flip__back');
  const disable = () => { back.remove(); flip.disabled = true; flip.style.cursor = 'default'; };
  if (back.complete && back.naturalWidth === 0) disable(); else back.addEventListener('error', disable);
  flip.addEventListener('click', () => {
    const on = flip.classList.toggle('is-flipped');
    flip.setAttribute('aria-pressed', on);
  });
});

// Changement de langue : garder la section ou le projet affiché
document.querySelectorAll('a.lang').forEach(a => {
  a.addEventListener('click', () => { if (location.hash) a.href = a.href.split('#')[0] + location.hash; });
});



// Bancs de petits poissons colorés qui traversent l'écran avec des bulles (clin d'œil aux poissons en perles)
(() => {
  const fr = document.documentElement.lang === 'fr';

  // Préférence mémorisée ; sans choix, les poissons sont activés sauf si l'appareil demande moins d'animations
  let enabled;
  try { enabled = localStorage.getItem('fish'); } catch { enabled = null; }
  enabled = enabled === null ? !matchMedia('(prefers-reduced-motion: reduce)').matches : enabled === 'on';

  // Bouton en haut à gauche, à côté du logo
  const toggle = document.createElement('button');
  toggle.className = 'fish-toggle';
  toggle.innerHTML = '<span aria-hidden="true">🐟</span>';
  const refresh = () => {
    toggle.setAttribute('aria-pressed', enabled);
    const label = fr ? (enabled ? 'Masquer les poissons' : 'Afficher les poissons')
                     : (enabled ? 'Hide the fish' : 'Show the fish');
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  };
  refresh();
  document.querySelector('.nav')?.append(toggle);

  // Couleurs inspirées des poissons en perles : clown, chirurgien bleu, rose à fleurs, turquoise…
  const species = [
    { body: '#ff7a2f', belly: '#ffb27a', fin: '#ff7a2f', motif: 'rayures', pat: '#ffffff' },
    { body: '#1f5fd8', belly: '#3f7cf0', fin: '#ffd23f', motif: 'tache',   pat: '#16224a' },
    { body: '#f59bb4', belly: '#ffd0dc', fin: '#f59bb4', motif: 'fleurs',  pat: '#ffffff' },
    { body: '#3fd0c9', belly: '#a5f0ea', fin: '#3fd0c9', motif: 'fleurs',  pat: '#ffffff' },
    { body: '#ffd23f', belly: '#fff1a8', fin: '#ffb020', motif: 'aucun' },
    { body: '#9be15d', belly: '#e3ffc4', fin: '#ffd23f', motif: 'aucun' },
    { body: '#ff9e57', belly: '#ffd2ac', fin: '#ff9e57', motif: 'fleurs',  pat: '#ffffff' },
    { body: '#0f8f8f', belly: '#f4e7c6', fin: '#ffd23f', motif: 'tache',   pat: '#1d2a2a' },
    { body: '#d94fb5', belly: '#f6b6e3', fin: '#d94fb5', motif: 'fleurs',  pat: '#ffffff' },
    { body: '#f4f1ea', belly: '#ffffff', fin: '#6fc3e8', motif: 'aucun' },
  ];

  const W = 34, H = 24, DPR = Math.min(devicePixelRatio || 1, 2);
  // Corps tourné vers la droite : dos assez plat, ventre bien rond
  const bodyPath = ctx => {
    ctx.beginPath();
    ctx.moveTo(31, 11);                               // bouche
    ctx.bezierCurveTo(27, 3, 15, 3, 9, 9);            // dos
    ctx.lineTo(9, 14);
    ctx.bezierCurveTo(13, 23, 27, 23, 31, 13);        // ventre arrondi
    ctx.closePath();
  };
  const draw = sp => {
    const c = document.createElement('canvas');
    c.width = W * DPR; c.height = H * DPR;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(DPR, DPR);
    // queue et nageoire du dos
    ctx.fillStyle = sp.fin;
    ctx.beginPath(); ctx.moveTo(10, 12); ctx.lineTo(1, 5); ctx.quadraticCurveTo(4, 12, 1, 19); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, 6); ctx.quadraticCurveTo(19, 1, 24, 5); ctx.closePath(); ctx.fill();
    // corps avec ventre plus clair
    const g = ctx.createLinearGradient(0, 4, 0, 21);
    g.addColorStop(0, sp.body); g.addColorStop(.55, sp.body); g.addColorStop(1, sp.belly);
    bodyPath(ctx); ctx.fillStyle = g; ctx.fill();
    // motifs, découpés à la forme du corps
    ctx.save(); bodyPath(ctx); ctx.clip();
    if (sp.motif === 'rayures') {
      ctx.fillStyle = sp.pat;
      ctx.fillRect(14, 0, 3, H); ctx.fillRect(22, 0, 3, H);
      ctx.fillStyle = '#2b1b12';
      [13.3, 17, 21.3, 25].forEach(x => ctx.fillRect(x, 0, .7, H));
    } else if (sp.motif === 'fleurs') {
      [[15, 10], [21, 15], [24, 8], [14, 16]].forEach(([x, y]) => {
        ctx.fillStyle = sp.pat;
        for (let a = 0; a < 5; a++) {
          ctx.beginPath(); ctx.arc(x + Math.cos(a * 1.257) * 1.3, y + Math.sin(a * 1.257) * 1.3, .9, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(x, y, .7, 0, 7); ctx.fill();
      });
    } else if (sp.motif === 'tache') {
      ctx.fillStyle = sp.pat;
      ctx.beginPath(); ctx.ellipse(17, 9, 7, 3.2, -.15, 0, 7); ctx.fill();
    }
    // reflet
    ctx.fillStyle = 'rgba(255, 255, 255, .28)';
    ctx.beginPath(); ctx.ellipse(21, 7.5, 6, 1.6, -.1, 0, 7); ctx.fill();
    ctx.restore();
    // petite nageoire du ventre
    ctx.fillStyle = sp.fin;
    ctx.beginPath(); ctx.moveTo(19, 18); ctx.quadraticCurveTo(18, 23, 15, 22); ctx.closePath(); ctx.fill();
    // œil
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(26.5, 10, 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(27, 10, 1.3, 0, 7); ctx.fill();
    return c;
  };

  const layer = document.createElement('div');
  layer.className = 'fish-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const bubble = (x, y) => {
    const b = document.createElement('span');
    b.className = 'bubble';
    const size = 3 + Math.random() * 6;
    Object.assign(b.style, {
      left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px',
      animationDuration: (1.6 + Math.random() * 1.4) + 's',
    });
    layer.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  };

  // position de la souris, que les poissons évitent
  const FLEE = 140;                                            // rayon d'évitement en pixels
  const mouse = { x: -9999, y: -9999 };
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; } }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

  const school = () => {
    const ltr = Math.random() < .5;                            // sens de passage
    const count = 12 + Math.floor(Math.random() * 9);          // 12 à 20 poissons
    const baseY = innerHeight * (.2 + Math.random() * .55);
    const speed = 190 + Math.random() * 90;                    // pixels par seconde
    const fish = Array.from({ length: count }, (_, i) => {
      const el = draw(species[Math.floor(Math.random() * species.length)]);
      el.className = 'fish';
      layer.appendChild(el);
      return {
        el,
        offX: i * 16 + Math.random() * 30,                     // décalage dans le banc
        offY: (Math.random() - .5) * 140,
        phase: Math.random() * Math.PI * 2,
        scale: .65 + Math.random() * .45,
        x: 0, y: 0,
        dx: 0, dy: 0,                                          // écart dû à la souris
      };
    });
    const start = performance.now();
    const travel = innerWidth + 500;
    let lastBubble = 0;
    const move = now => {
      const t = (now - start) / 1000, d = t * speed;
      let alive = false;
      fish.forEach(f => {
        const pos = d - f.offX - 80;
        const baseX = ltr ? pos : innerWidth - pos - W;
        const y0 = baseY + f.offY + Math.sin(t * 4 + f.phase) * 6;
        // les poissons s'écartent de la souris, puis reprennent doucement leur place
        let tx = 0, ty = 0;
        const vx = baseX + W / 2 - mouse.x, vy = y0 + H / 2 - mouse.y, dist = Math.hypot(vx, vy);
        if (dist < FLEE) {
          // ils plongent au-dessus ou en dessous de la souris, selon le côté où ils se trouvent
          const push = Math.sqrt(1 - dist / FLEE) * 95;
          const side = Math.abs(vy) > 2 ? Math.sign(vy) : (f.phase > Math.PI ? 1 : -1);
          ty = side * push;
          tx = dist > 0 ? vx / dist * push * .25 : 0;
        }
        f.dx += (tx - f.dx) * .3; f.dy += (ty - f.dy) * .3;
        f.x = baseX + f.dx;
        f.y = y0 + f.dy;
        f.el.style.transform = `translate(${f.x}px, ${f.y}px) scale(${ltr ? f.scale : -f.scale}, ${f.scale})`;
        if (pos < travel) alive = true;
      });
      if (now - lastBubble > 90) {                             // des bulles qui s'échappent du banc
        lastBubble = now;
        const f = fish[Math.floor(Math.random() * fish.length)];
        if (f.x > -20 && f.x < innerWidth) bubble(f.x + (ltr ? W * f.scale : 0), f.y + 4);
      }
      if (alive && enabled) requestAnimationFrame(move);
      else fish.forEach(f => f.el.remove());
    };
    requestAnimationFrame(move);
  };

  // un premier banc peu après l'arrivée, puis de temps en temps (toutes les 45 à 75 secondes)
  const next = () => setTimeout(() => { if (enabled && !document.hidden) school(); next(); }, 45000 + Math.random() * 30000);
  setTimeout(() => { if (enabled) school(); }, 2000);
  next();

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('fish', enabled ? 'on' : 'off'); } catch {}
    refresh();
    if (enabled) school();                       // un banc tout de suite pour montrer que c'est reparti
    else layer.replaceChildren();                // on retire les poissons et les bulles à l'écran
  });
})();

// Loisirs : un booster à ouvrir qui dévoile les cartes (l'ouverture est mémorisée)
(() => {
  const grid = document.querySelector('.cards');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.hcard')];
  // l'illustration est placée dans un cadre qui la découpe, pour pouvoir la faire glisser (parallaxe)
  cards.forEach(c => {
    const img = c.querySelector('.hcard__front img');
    const art = document.createElement('span');
    art.className = 'hcard__art';
    img.before(art);
    art.appendChild(img);
  });
  const lead = grid.previousElementSibling?.classList.contains('section-lead') ? grid.previousElementSibling : null;
  const fr = document.documentElement.lang === 'fr';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = fr
    ? { open: 'Ouvrir le booster', title: 'Loisirs', sub: `${cards.length} cartes ultra rares`, hint: 'Clique sur le booster pour l\'ouvrir' }
    : { open: 'Open the booster pack', title: 'Hobbies', sub: `${cards.length} ultra rare cards`, hint: 'Click the pack to open it' };

  // Le booster, posé par-dessus les cartes encore cachées
  const stage = document.createElement('div');
  stage.className = 'booster-stage';
  stage.innerHTML = `
    <button class="booster" aria-label="${t.open}">
      <span class="booster__tear"></span>
      <span class="booster__body">
        <span class="booster__logo">DF</span>
        <span class="booster__title">${t.title}</span>
        <span class="booster__sub">${t.sub}</span>
      </span>
    </button>
    <p class="booster__hint">${t.hint}</p>`;
  const wrap = document.createElement('div');
  wrap.className = 'cards-wrap';
  grid.before(wrap);
  wrap.append(grid, stage);

  const pack = stage.querySelector('.booster');
  const wait = ms => new Promise(r => setTimeout(r, calm ? 0 : ms));
  const save = v => { try { localStorage.setItem('hobbyBooster', v); } catch {} };

  const flip = (card, burst) => {
    card.classList.add('is-open');
    card.setAttribute('aria-label', card.dataset.labelOpen);
    if (burst) { card.classList.add('is-revealing'); setTimeout(() => card.classList.remove('is-revealing'), 900); }
  };
  const seal = () => {
    cards.forEach(c => { c.classList.remove('is-open', 'is-dealt'); c.setAttribute('aria-label', c.getAttribute('data-label-closed') || c.getAttribute('aria-label')); });
    wrap.classList.add('is-sealed');
    stage.classList.remove('is-gone', 'is-opening');
  };
  cards.forEach(c => c.setAttribute('data-label-closed', c.getAttribute('aria-label')));

  let opened;
  try { opened = localStorage.getItem('hobbyBooster') === 'open'; } catch { opened = false; }
  if (opened) { cards.forEach(c => flip(c, false)); stage.remove(); lead?.remove(); }
  else seal();

  let busy = false;
  pack.addEventListener('click', async () => {
    if (busy) return; busy = true;
    stage.classList.add('is-opening');               // le booster tremble puis se déchire
    lead?.classList.add('is-fading');
    await wait(1100);
    // les cartes s'envolent du booster vers leur place
    const p = pack.getBoundingClientRect();
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--fx', (p.left + p.width / 2 - (r.left + r.width / 2)) + 'px');
      c.style.setProperty('--fy', (p.top + p.height / 2 - (r.top + r.height / 2)) + 'px');
      c.style.setProperty('--fr', (Math.random() * 30 - 15) + 'deg');
      c.style.animationDelay = calm ? '0s' : (i * .12) + 's';
    });
    wrap.classList.remove('is-sealed');
    cards.forEach(c => c.classList.add('is-dealt'));
    stage.classList.add('is-gone');
    await wait(600 + cards.length * 120);
    cards.forEach(c => c.classList.remove('is-dealt'));
    for (const c of cards) { flip(c, !calm); await wait(260); }  // puis elles se retournent une à une
    save('open');
    busy = false;
  });


  // reflet holographique qui suit la souris
  const holo = card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%');
      card.style.setProperty('--my', y * 100 + '%');
      card.style.setProperty('--rx', (y - .5) * -10 + 'deg');
      card.style.setProperty('--ry', (x - .5) * 12 + 'deg');
      card.style.setProperty('--px', (x - .5).toFixed(3));   // pour l'effet de profondeur (parallaxe)
      card.style.setProperty('--py', (y - .5).toFixed(3));
    });
    card.addEventListener('pointerleave', () => {
      ['--rx', '--ry'].forEach(p => card.style.setProperty(p, '0deg'));
      ['--px', '--py'].forEach(p => card.style.setProperty(p, '0'));
    });
  };

  // carte ouverte : on l'affiche en grand, avec son cadre et ses effets
  const zoom = document.createElement('dialog');
  zoom.className = 'card-zoom';
  zoom.setAttribute('aria-label', fr ? 'Carte agrandie' : 'Enlarged card');
  document.body.appendChild(zoom);
  zoom.addEventListener('click', () => zoom.close());

  const BASE = 180;                                     // largeur de la carte avant agrandissement
  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (!card.classList.contains('is-open')) return;
      const big = card.cloneNode(true);
      big.classList.remove('is-revealing', 'is-dealt');
      big.removeAttribute('aria-label');
      big.tabIndex = -1;
      big.style.cssText = '';
      const holder = document.createElement('div');
      holder.className = 'card-zoom__holder';
      holder.style.setProperty('--k', Math.min(innerWidth * .9, innerHeight * .88 * 5 / 7) / BASE);
      holder.appendChild(big);
      zoom.replaceChildren(holder);
      holo(big);
      zoom.showModal();
    });
    holo(card);
  });
})();

// Tout lien vers un autre site s'ouvre dans un nouvel onglet
document.querySelectorAll('a[href^="http"]').forEach(a => {
  if (a.host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; }
});

// Les noms propres (le mien, les titres de jeux) ne doivent pas être traduits par le navigateur
document.querySelectorAll('.project h3, .tile__body strong, .hcard__emblem, .booster__logo').forEach(el => {
  el.translate = false; el.classList.add('notranslate');
});

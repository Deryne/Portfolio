const box = document.getElementById('lightbox');

document.querySelectorAll('.video').forEach(btn => {
  const id = btn.dataset.yt;
  btn.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
  btn.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
    frame.title = btn.getAttribute('aria-label');
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.className = 'video';
    btn.replaceWith(frame);
  });
});

document.querySelectorAll('.thumbs img, .hobbies img').forEach(img => {
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

/* SPU Pocket 1.0 — application (fonctionne dans l'APK Android et dans tout navigateur) */
'use strict';

/* ── État global ── */
const $ = (s) => document.querySelector(s);
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const etat = {
  onglet: 'adulte',
  recherche: '',
  seulementFavoris: false,
  courant: null,          // { type, index }
  tailleTexte: store.get('spu-taille', 18),
  vitesse: store.get('spu-vitesse', 1),
  hauteur: store.get('spu-hauteur', 1),
  enLecture: false,
};
const favoris = () => new Set(store.get('spu-favoris', []));
const basculeFavori = (code) => {
  const f = favoris();
  f.has(code) ? f.delete(code) : f.add(code);
  store.set('spu-favoris', [...f]);
};

/* ── Voix : Android natif → navigateur → indisponible ── */
const pont = window.SpuAndroid || null;   // interface Java injectée dans l'APK
const moteurVoix = (() => {
  if (pont) return { type: 'android', nom: 'Voix du téléphone (synthèse Android) — fonctionne hors ligne' };
  if ('speechSynthesis' in window) return { type: 'navigateur', nom: 'Voix du navigateur (Web Speech)' };
  return { type: 'aucun', nom: 'Voix non disponible ici — le texte reste lisible à l\'écran' };
})();

let finLecture = null;
function arreterVoix() {
  finLecture = null;
  try { if (pont) pont.silence(); } catch { }
  try { if (moteurVoix.type === 'navigateur') speechSynthesis.cancel(); } catch { }
  majBoutonsLecture(false);
}
function blocsDe(texte, max = 2600) {
  const morceaux = [];
  let courant = '';
  for (const phrase of texte.split(/(?<=[.!?…])\s+/)) {
    if ((courant + ' ' + phrase).length > max && courant) { morceaux.push(courant.trim()); courant = phrase; }
    else courant = courant ? courant + ' ' + phrase : phrase;
  }
  if (courant.trim()) morceaux.push(courant.trim());
  return morceaux;
}
function lire(texte) {
  if (moteurVoix.type === 'aucun') return;
  if (etat.enLecture) { arreterVoix(); return; }
  const blocs = blocsDe(texte);
  majBoutonsLecture(true);
  let reste = blocs.length;
  finLecture = () => { if (--reste <= 0) majBoutonsLecture(false); };
  if (pont) {
    // Android : chaque bloc est mis en file ; le Java signale la fin de chaque bloc.
    for (const b of blocs) {
      const ok = pont.parler(b, etat.vitesse, etat.hauteur);
      if (!ok) { majBoutonsLecture(false); break; }
    }
  } else if (moteurVoix.type === 'navigateur') {
    for (const b of blocs) {
      const u = new SpeechSynthesisUtterance(b);
      u.lang = 'fr-FR'; u.rate = etat.vitesse; u.pitch = etat.hauteur;
      u.onend = () => finLecture && finLecture();
      u.onerror = () => finLecture && finLecture();
      speechSynthesis.speak(u);
    }
  }
}
function majBoutonsLecture(enCours) {
  etat.enLecture = enCours;
  const ec = $('#btn-ecouter'), st = $('#btn-stop');
  if (ec) ec.textContent = enCours ? '⏸ Re-appuyer pour couper' : '▶ Écouter';
  if (st) st.hidden = !enCours;
}
// Le côté Android (Java) appelle ceci à la fin de chaque bloc de synthèse.
window.spuTtsFin = function () { if (finLecture) finLecture(); };

/* ── Données ── */
function textsDe(onglet) { return onglet === 'enfant' ? SPU_DATA.enfant : SPU_DATA.adulte; }
function trouveParCode(code) {
  for (const [type, liste] of [['adulte', SPU_DATA.adulte], ['enfant', SPU_DATA.enfant]]) {
    const i = liste.findIndex((t) => t.code === code);
    if (i >= 0) return { type, index: i };
  }
  return null;
}

/* ── Navigation ── */
function ecranDeHash() {
  const h = location.hash.replace(/^#\/?/, '');
  return ['bibliotheque', 'lecteur', 'connexion', 'apropos', 'demander'].includes(h) ? h : 'accueil';
}
function montrer(ecran) {
  document.querySelectorAll('.ecran').forEach((e) => e.classList.remove('active'));
  $('#ecran-' + ecran).classList.add('active');
  window.scrollTo(0, 0);
  if (ecran !== 'lecteur' && etat.enLecture) arreterVoix();
  if (ecran === 'bibliotheque') renduListe();
  if (ecran === 'lecteur') renduLecteur();
  if (ecran === 'demander') majIntroDemander();
}
function naviguer(ecran) { location.hash = ecran === 'accueil' ? '' : '/' + ecran; }
window.addEventListener('hashchange', () => montrer(ecranDeHash()));
// Bouton retour Android : l'APK appelle cette fonction avant de quitter.
window.spuRetour = function () {
  const e = ecranDeHash();
  if (e === 'lecteur') { naviguer('bibliotheque'); return true; }
  if (e !== 'accueil') { naviguer('accueil'); return true; }
  return false;
};

document.addEventListener('click', (ev) => {
  const nav = ev.target.closest('[data-nav]');
  if (nav) { naviguer(nav.dataset.nav); return; }
  const ong = ev.target.closest('.onglet');
  if (ong) {
    etat.onglet = ong.dataset.onglet;
    document.querySelectorAll('.onglet').forEach((o) => o.classList.toggle('active', o === ong));
    renduListe();
    return;
  }
  const item = ev.target.closest('.item');
  if (item) {
    const pos = trouveParCode(item.dataset.code);
    if (pos) { etat.courant = pos; naviguer('lecteur'); }
  }
});

/* ── Bibliothèque ── */
function filtres() {
  const q = etat.recherche.trim().toLowerCase();
  const fav = favoris();
  return textsDe(etat.onglet).filter((t) => {
    if (etat.seulementFavoris && !fav.has(t.code)) return false;
    if (!q) return true;
    return (t.texte + ' ' + t.motsCles.join(' ') + ' ' + t.culture + ' ' + t.interpretations.join(' '))
      .toLowerCase().includes(q);
  });
}
function renduListe() {
  const liste = $('#liste'), vide = $('#liste-vide');
  const resultats = filtres();
  liste.innerHTML = '';
  vide.hidden = resultats.length > 0;
  const fav = favoris();
  for (const t of resultats) {
    const court = t.texte.length > 130 ? t.texte.slice(0, 130).replace(/\s+\S*$/, '') + '…' : t.texte;
    const btn = document.createElement('button');
    btn.className = 'item'; btn.dataset.code = t.code; btn.setAttribute('role', 'listitem');
    btn.innerHTML =
      '<span class="item-haut"><span class="item-code">' + t.code + (fav.has(t.code) ? '<span class="item-fav">★</span>' : '') +
      '</span><span class="item-culture">' + echapper(t.culture) + '</span></span>' +
      '<span class="item-texte">' + echapper(court) + '</span>';
    liste.appendChild(btn);
  }
  $('#cpt-adulte').textContent = '(' + SPU_DATA.adulte.length + ')';
  $('#cpt-enfant').textContent = '(' + SPU_DATA.enfant.length + ')';
}
$('#recherche').addEventListener('input', (e) => { etat.recherche = e.target.value; renduListe(); });
$('#btn-favoris').addEventListener('click', () => {
  etat.seulementFavoris = !etat.seulementFavoris;
  $('#btn-favoris').classList.toggle('actif', etat.seulementFavoris);
  $('#btn-favoris').textContent = etat.seulementFavoris ? '★' : '☆';
  renduListe();
});

/* ── Lecteur ── */
function voisin(delta) {
  const liste = textsDe(etat.courant.type);
  const n = liste.length;
  etat.courant.index = (etat.courant.index + delta + n) % n;
  renduLecteur();
}
$('#btn-prec').addEventListener('click', () => voisin(-1));
$('#btn-suiv').addEventListener('click', () => voisin(1));
$('#btn-ecouter').addEventListener('click', () => {
  const t = textsDe(etat.courant.type)[etat.courant.index];
  lire(t.texte + ' ' + t.interpretations.join(' '));
});
$('#btn-stop').addEventListener('click', arreterVoix);
$('#btn-favori').addEventListener('click', () => {
  const t = textsDe(etat.courant.type)[etat.courant.index];
  basculeFavori(t.code); renduFavori();
});
function renduFavori() {
  const t = textsDe(etat.courant.type)[etat.courant.index];
  const f = favoris().has(t.code);
  const b = $('#btn-favori');
  b.textContent = f ? '★' : '☆';
  b.classList.toggle('favori', f);
}
function renduLecteur() {
  const t = textsDe(etat.courant.type)[etat.courant.index];
  $('#lec-code').textContent = t.code;
  $('#lec-culture').textContent = t.culture;
  const txt = $('#lec-texte');
  txt.textContent = t.texte;
  txt.style.setProperty('--taille-texte', etat.tailleTexte + 'px');
  txt.style.fontSize = etat.tailleTexte + 'px';
  $('#lec-interpretations').innerHTML = t.interpretations.map((i) => '<li>' + echapper(i) + '</li>').join('');
  $('#lec-sources').innerHTML = t.sources.map((s) =>
    '<li>' + (/^https?:/.test(s) ? '<a href="' + s + '" style="color:var(--or)">' + echapper(s) + '</a>' : echapper(s)) + '</li>').join('');
  $('#moteur-voix').innerHTML = '🔊 ' + moteurVoix.nom +
    (moteurVoix.type === 'android' ? ' <span class="ok">✓</span>' : '');
  renduFavori();
}

/* Curseurs vitesse / hauteur + taille de texte (persistés) */
$('#cur-vitesse').value = etat.vitesse;
$('#cur-hauteur').value = etat.hauteur;
$('#out-vitesse').textContent = etat.vitesse.toFixed(1).replace('.', ',') + '×';
$('#out-hauteur').textContent = etat.hauteur.toFixed(2).replace('.', ',') + '×';
$('#cur-vitesse').addEventListener('input', (e) => {
  etat.vitesse = parseFloat(e.target.value); store.set('spu-vitesse', etat.vitesse);
  $('#out-vitesse').textContent = etat.vitesse.toFixed(1).replace('.', ',') + '×';
  if (etat.enLecture) arreterVoix();
});
$('#cur-hauteur').addEventListener('input', (e) => {
  etat.hauteur = parseFloat(e.target.value); store.set('spu-hauteur', etat.hauteur);
  $('#out-hauteur').textContent = etat.hauteur.toFixed(2).replace('.', ',') + '×';
  if (etat.enLecture) arreterVoix();
});

/* ── Connexion serveur ── */
function serveurs() { return store.get('spu-serveurs', []); }
function renduServeurs() {
  const wrap = $('#serveurs-recents');
  const s = serveurs();
  wrap.innerHTML = s.length ? '<span style="font-size:12px;color:var(--texte-2);width:100%">Récents :</span>' : '';
  for (const u of s) {
    const b = document.createElement('button');
    b.textContent = u; b.type = 'button';
    b.addEventListener('click', () => { $('#url-serveur').value = u; });
    wrap.appendChild(b);
  }
}
function ouvrirServeur() {
  let url = $('#url-serveur').value.trim().replace(/\/+$/, '');
  if (!url) { alerte('Entre d\'abord l\'adresse du serveur.'); return; }
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  const s = serveurs().filter((x) => x !== url);
  s.unshift(url); store.set('spu-serveurs', s.slice(0, 4));
  // Navigation interne : le WebView charge le SPU complet (même origine, tout fonctionne).
  location.href = url;
}
$('#btn-ouvrir').addEventListener('click', ouvrirServeur);

/* Vérification des mises à jour via {serveur}/api/version */
$('#btn-maj').addEventListener('click', async () => {
  const zone = $('#maj-resultat');
  zone.hidden = false;
  zone.textContent = 'Recherche des nouveautés…';
  let base = $('#url-serveur').value.trim().replace(/\/+$/, '') || serveurs()[0] || '';
  if (base && !/^https?:\/\//i.test(base)) base = 'http://' + base;
  if (!base) { zone.textContent = 'Configure d\'abord un serveur (champ ci-dessus).'; return; }
  const ctl = new AbortController();
  const fin = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(base + '/api/version', { signal: ctl.signal });
    clearTimeout(fin);
    const v = await r.json();
    const meme = v.apk && v.apk.version === VERSION_APP;
    zone.innerHTML =
      '<span class="titre">✅ Serveur SPU v' + echapper(String(v.serveur ? v.serveur.version : '?')) + ' — SPU Pocket ' +
      (meme ? 'à jour' : 'v' + echapper(String(v.apk ? v.apk.version : '?'))) + '</span>' +
      echapper(v.note || '') +
      (Array.isArray(v.nouveautes) ? '<ul>' + v.nouveautes.map((n) => '<li>' + echapper(n) + '</li>').join('') + '</ul>' : '');
  } catch {
    clearTimeout(fin);
    zone.innerHTML = '<span class="titre">⚠️ Serveur injoignable</span>' +
      'Vérifie l\'adresse et que le SPU tourne bien sur cette machine. La bibliothèque de ton téléphone reste disponible hors ligne.';
  }
});

/* ── Poser une question (v1.1 — nécessite un serveur SPU) ── */
const VERSION_APP = '1.1.0';

function serveurActif() {
  let url = $('#url-serveur').value.trim().replace(/\/+$/, '');
  if (!url) url = serveurs()[0] || '';
  if (url && !/^https?:\/\//i.test(url)) url = 'http://' + url;
  return url;
}
function majIntroDemander() {
  const a = !!serveurActif();
  $('#dem-sans-serveur').hidden = a;
}

$('#dem-question').addEventListener('input', (e) => {
  $('#dem-compteur').textContent = e.target.value.length + ' / 2000';
});
$('#btn-demander').addEventListener('click', poserQuestion);
$('#btn-dem-ecouter').addEventListener('click', () => { if (derniereReponse) lire(derniereReponse); });

let derniereReponse = '';

function ressourcesHtml(r) {
  if (!Array.isArray(r) || !r.length) return '';
  return '<ul>' + r.map((x) => {
    if (typeof x === 'string') return '<li>' + echapper(x) + '</li>';
    const region = x.region ? echapper(x.region) + ' : ' : '';
    const lignes = Array.isArray(x.lignes) ? x.lignes.map(echapper).join(' · ') : echapper(JSON.stringify(x));
    return '<li>' + region + lignes + '</li>';
  }).join('') + '</ul>';
}
function afficherErreurDem(zone, m) {
  zone.innerHTML = '<span class="titre">⚠️</span>' + echapper(m);
  $('#btn-dem-ecouter').hidden = true;
}
function renduReponse(d) {
  let h = '';
  if (d.reponse) h += '<div class="dem-part"><h3>🧭 Réponse</h3><p>' + echapper(d.reponse) + '</p></div>';
  if (d.parabole) {
    h += '<div class="dem-part"><h3>📜 Parabole ' + echapper(d.parabole.code || '') +
      (d.parabole.culture ? ' <span class="dem-culture">— ' + echapper(d.parabole.culture) + '</span>' : '') + '</h3>' +
      '<blockquote>' + echapper(d.parabole.texte || '') + '</blockquote>' +
      (d.parabole.interpretation ? '<p class="note"><b>Interprétation :</b> ' + echapper(d.parabole.interpretation) + '</p>' : '') + '</div>';
  }
  if (d.histoire) h += '<div class="dem-part"><h3>📖 Histoire</h3><p>' + echapper(d.histoire) + '</p></div>';
  const nb = Array.isArray(d.sourcesUtilisees) ? d.sourcesUtilisees.length : 0;
  const conf = typeof d.confiance === 'number' ? Math.round(d.confiance * 100) : null;
  const infos = [nb ? nb + ' source(s) consultée(s)' : '', conf !== null ? 'cohérence des sources ' + conf + ' %' : '']
    .filter(Boolean).join(' — ');
  if (infos) h += '<p class="note">🔎 ' + infos + '</p>';
  return h;
}

async function poserQuestion() {
  const zone = $('#dem-resultat');
  const btn = $('#btn-demander');
  const question = $('#dem-question').value.trim();
  if (!question) {
    zone.hidden = false;
    zone.innerHTML = '<span class="titre">Écris d’abord ta question 🙂</span>';
    return;
  }
  const base = serveurActif();
  majIntroDemander();
  if (!base) {
    zone.hidden = false;
    zone.innerHTML = '<span class="titre">⚙️ Aucun serveur configuré</span>' +
      "Pose d'abord l'adresse d'un serveur SPU dans l'écran « Serveur complet », puis reviens ici. " +
      'La bibliothèque hors ligne reste toujours disponible.';
    $('#btn-dem-ecouter').hidden = true;
    return;
  }
  arreterVoix();
  btn.disabled = true;
  btn.textContent = '⏳ Le SPU consulte ses sources…';
  zone.hidden = false;
  zone.innerHTML = '<span class="titre">🔎 Recherche des paraboles et des sources…</span>' +
    'Cela peut prendre 20 à 60 secondes : le serveur interroge le web, une encyclopédie et sa réflexion, puis raconte.';
  const ctl = new AbortController();
  const fin = setTimeout(() => ctl.abort(), 120000);
  try {
    const r = await fetch(base + '/api/repondre', {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    clearTimeout(fin);
    const d = await r.json();
    if (!r.ok) { afficherErreurDem(zone, d.error || 'Le serveur n’a pas pu répondre.'); return; }
    if (d.detresse) {
      zone.innerHTML = '<span class="titre">💙 Tu n’es pas seul·e</span>' + echapper(d.message || '') + ressourcesHtml(d.ressources);
      $('#btn-dem-ecouter').hidden = true;
      return;
    }
    if (d.bloque) {
      zone.innerHTML = '<span class="titre">🌱 Mode enfant protégé</span>' + echapper(d.message || '');
      $('#btn-dem-ecouter').hidden = true;
      return;
    }
    derniereReponse = [
      d.reponse || '',
      d.parabole ? ('Parabole ' + (d.parabole.code || '') + ' — ' + d.parabole.texte + ' Interprétation : ' + (d.parabole.interpretation || '')) : '',
      d.histoire ? ('Histoire. ' + d.histoire) : '',
    ].filter(Boolean).join(' ');
    zone.innerHTML = renduReponse(d);
    $('#btn-dem-ecouter').hidden = !derniereReponse;
  } catch (e) {
    clearTimeout(fin);
    afficherErreurDem(zone, navigator.onLine === false
      ? "Pas de connexion internet. La bibliothèque hors ligne reste disponible."
      : "Serveur injoignable. Vérifie l'adresse (écran « Serveur complet ») et que le SPU tourne bien sur cette machine.");
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Demander';
  }
}

/* ── Divers ── */
function echapper(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function alerte(m) {
  const z = $('#maj-resultat');
  if (z && !z.closest('.ecran').hidden) { z.hidden = false; z.textContent = m; }
  else alert(m);
}

/* ── Démarrage ── */
$('#nb-textes').textContent = SPU_DATA.meta.total;
montrer(ecranDeHash());
if (pont && pont.infos) { try { console.log('SPU Pocket Android :', pont.infos()); } catch { } }

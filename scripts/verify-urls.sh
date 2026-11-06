#!/bin/bash
# Vérifie l'existence des URLs de sources du corpus
urls=(
  "https://fr.wikiquote.org/wiki/Proverbes_africains"
  "https://fr.wikiquote.org/wiki/Lao_Tseu"
  "https://fr.wikiquote.org/wiki/Proverbes_japonais"
  "https://fr.wikiquote.org/wiki/Proverbes_chinois"
  "https://fr.wikiquote.org/wiki/Confucius"
  "https://fr.wikipedia.org/wiki/Sutta_Nip%C4%81ta"
  "https://fr.wikipedia.org/wiki/Alagadd%C5%ABpama_sutta"
  "https://fr.wikipedia.org/wiki/Zhuang_Zi"
  "https://fr.wikipedia.org/wiki/Amadou_Hamp%C3%A2t%C3%A9_B%C3%A2"
  "https://fr.wikisource.org/wiki/Fables_de_La_Fontaine"
  "https://fr.wikiquote.org/wiki/%C3%89pict%C3%A8te"
  "https://fr.wikiquote.org/wiki/Roumi"
  "https://fr.wikipedia.org/wiki/Saadi"
  "https://fr.wikiquote.org/wiki/Socrate"
  "https://fr.wikiquote.org/wiki/Proverbes_arabes"
  "https://fr.wikipedia.org/wiki/H%C3%A1vam%C3%A1l"
  "https://fr.wikiquote.org/wiki/Proverbes_irlandais"
  "https://fr.wikiquote.org/wiki/Proverbes_%C3%A9cossais"
  "https://fr.wikiquote.org/wiki/Proverbes_norv%C3%A9giens"
  "https://fr.wikiquote.org/wiki/Proverbes_su%C3%A9dois"
  "https://fr.wikipedia.org/wiki/Triades_galloises"
  "https://fr.wikipedia.org/wiki/Le_Petit_Prince"
  "https://fr.wikiquote.org/wiki/S%C3%A9n%C3%A8que"
  "https://fr.wikiquote.org/wiki/H%C3%A9raclite"
  "https://fr.wikipedia.org/wiki/Dhammapada"
  "https://fr.wikiquote.org/wiki/L%C3%A9on_Tolsto%C3%AF"
  "https://en.wikipedia.org/wiki/Frederick_Langbridge"
  "https://fr.wikiquote.org/wiki/Xun_Zi"
  "https://fr.wikiquote.org/wiki/Portail:Proverbes"
  "https://fr.wikipedia.org/wiki/Bible"
  "https://fr.wikisource.org/wiki/Bible"
  "https://fr.wikisource.org/wiki/Fables_d%27%C3%89sope"
  "https://fr.wikipedia.org/wiki/Contes_de_l%27enfance_et_du_foyer"
  "https://fr.wikipedia.org/wiki/Panchatantra"
  "https://fr.wikipedia.org/wiki/Anansi"
)
for u in "${urls[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 -A "SPU/4.0 (corpus verification)" "$u")
  echo "$code $u"
  sleep 0.3
done

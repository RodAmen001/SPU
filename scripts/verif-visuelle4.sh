#!/bin/bash
# Flux Oracle → journal → enfant en une session serveur.
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 1
setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health --max-time 2 2>/dev/null || true)
  [ "$code" = "200" ] && { echo "serveur prêt (${i}s)"; break; }
  sleep 1
done
[ "$code" = "200" ] || { echo "serveur KO"; exit 1; }

echo "── Oracle ──"
agent-browser open http://localhost:3000 > /dev/null 2>&1
agent-browser set viewport 900 1400 > /dev/null 2>&1
agent-browser wait --load networkidle > /dev/null 2>&1
sleep 1
agent-browser eval "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Oracle') && b.className.includes('group'))?.click(); 'vue oracle'" 2>/dev/null
sleep 1.5
agent-browser eval "
const ta = document.querySelector('textarea[aria-label=\"ta question\"]');
const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
setter.call(ta, 'Comment garder espoir après une déception ?');
ta.dispatchEvent(new Event('input', { bubbles: true }));
'rempli'
" 2>/dev/null
sleep 0.4
agent-browser eval "[...document.querySelectorAll('button[type=submit]')].find(b => !b.disabled)?.click(); 'envoyé'" 2>/dev/null
sleep 3
agent-browser screenshot /tmp/vis-B-attente.png > /dev/null 2>&1
echo "capture indicateur d'attente ok"
for i in $(seq 1 110); do
  etat=$(agent-browser eval "document.body.innerText.includes('Nouvelle discussion') ? 'fini' : 'attente'" 2>/dev/null | tail -1)
  [ "$etat" = "fini" ] && break
  sleep 1
done
sleep 1.5
agent-browser screenshot /tmp/vis-C-reponse.png > /dev/null 2>&1
echo "heures visibles: $(agent-browser eval "document.body.innerText.match(/\b\d{2}:\d{2}\b/g)?.join(', ') || 'AUCUNE'" 2>/dev/null | tail -1)"
echo "capture réponse ok"

echo "── Journal ──"
agent-browser eval "[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Accueil')?.click(); 'a'" 2>/dev/null
sleep 1
agent-browser eval "[...document.querySelectorAll('button')].find(x => x.textContent.includes('Journal de bord'))?.click(); 'j'" 2>/dev/null
sleep 2.5
agent-browser screenshot /tmp/vis-D-journal.png > /dev/null 2>&1
echo "capture journal ok"

echo "── Enfant ──"
agent-browser eval "[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Accueil')?.click(); 'a'" 2>/dev/null
sleep 1
agent-browser eval "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Enfant') && b.className.includes('group'))?.click(); 'e'" 2>/dev/null
sleep 1.5
agent-browser screenshot /tmp/vis-E-enfant.png > /dev/null 2>&1
echo "capture enfant ok"
echo "SÉANCE TERMINÉE ✓"

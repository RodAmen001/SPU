// Client SSE (POST + lecture de flux) — consomme les événements du cahier Partie 15
// v4.6 : garde-fou de délai côté navigateur — si le serveur ne termine pas dans
// le temps imparti, le flux est abandonné et un message d'erreur propre s'affiche
// (plus jamais une interface bloquée sur « J'écris ton histoire… » pendant 10 min).
export type GestionnairesSSE = Record<string, (data: Record<string, unknown>) => void>;

export async function streamSSE(
  url: string,
  corps: unknown,
  gestionnaires: GestionnairesSSE,
  delaiMs = 150000,
): Promise<void> {
  const controle = new AbortController();
  let termine = false;
  let gardeDeclenche = false;
  const clore = () => {
    if (termine) return;
    termine = true;
    clearTimeout(garde);
  };
  const garde = setTimeout(() => {
    if (termine) return;
    gardeDeclenche = true;
    try {
      controle.abort();
    } catch {
      /* rien */
    }
    gestionnaires['erreur']?.({
      message:
        "Le serveur a mis trop de temps à répondre — j'ai arrêté d'attendre pour ne pas te laisser bloqué. Réessaie dans un instant : le SPU complète toujours sa réponse avec ses ressources locales.",
    });
  }, delaiMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
      signal: controle.signal,
    });
  } catch {
    clore();
    if (!gardeDeclenche) gestionnaires['http-error']?.({ error: 'Réseau indisponible. Vérifie ta connexion.' });
    return;
  }
  if (!res.ok || !res.body) {
    clore();
    const j = (await res.json().catch(() => ({ error: `Erreur ${res.status}` }))) as { error?: string };
    gestionnaires['http-error']?.(j as Record<string, unknown>);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let tampon = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      tampon += decoder.decode(value, { stream: true });
      const blocs = tampon.split('\n\n');
      tampon = blocs.pop() || '';
      for (const bloc of blocs) {
        let evenement = 'message';
        const lignesData: string[] = [];
        for (const ligne of bloc.split('\n')) {
          if (ligne.startsWith('event: ')) evenement = ligne.slice(7).trim();
          else if (ligne.startsWith('data: ')) lignesData.push(ligne.slice(6));
        }
        if (lignesData.length) {
          try {
            gestionnaires[evenement]?.(JSON.parse(lignesData.join('\n')) as Record<string, unknown>);
          } catch {
            /* événement malformé ignoré */
          }
        }
      }
    }
  } catch {
    // flux interrompu (garde-fou déclenché ou réseau coupé)
    if (!termine) gestionnaires['http-error']?.({ error: 'Flux interrompu. Réessaie dans un instant.' });
  } finally {
    clore();
  }
}

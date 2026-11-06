// Client SSE (POST + lecture de flux) — consomme les événements du cahier Partie 15
export type GestionnairesSSE = Record<string, (data: Record<string, unknown>) => void>;

export async function streamSSE(url: string, corps: unknown, gestionnaires: GestionnairesSSE): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
    });
  } catch {
    gestionnaires['http-error']?.({ error: 'Réseau indisponible. Vérifie ta connexion.' });
    return;
  }
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => ({ error: `Erreur ${res.status}` }))) as { error?: string };
    gestionnaires['http-error']?.(j as Record<string, unknown>);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let tampon = '';
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
}

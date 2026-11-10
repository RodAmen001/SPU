// Mise en perspective — le pont précis entre la question posée et la parabole offerte.
// Exigence du concept (retour aux origines) : pour toute question, quel que soit le
// mode, la réponse montre toujours : la parabole, son interprétation, l'histoire,
// puis LA MISE EN PERSPECTIVE — pourquoi cette parabole-là répond à cette question-là.
// Partagée par tous les modes via fluxNarratif, et par le Mentor (étapes 2 et 3).

import { llmChat } from './llm';

export async function genererPerspective(
  question: string,
  paraboleTexte: string,
  interpretation: string,
  opts: { enfantine?: boolean; contexte?: string } = {},
): Promise<string> {
  const questionCourte = question.slice(0, 600);
  try {
    if (opts.enfantine) {
      const r = await llmChat(
        [
          {
            role: 'system',
            content:
              "Tu es le SPU, pour un enfant de 6 à 12 ans. Explique en 2 ou 3 phrases très simples (40 à 60 mots, français) pourquoi ce conte répond à sa question : fais le lien entre ce qu'il vit et ce que le conte montre. Mots simples, ton chaleureux, aucune leçon, aucun conseil. Termine par une petite phrase qui l'invite à dire ce qu'il en pense. Réponds avec le texte seul.",
          },
          {
            role: 'user',
            content: `Sa question : ${questionCourte}\nLe conte : « ${paraboleTexte.slice(0, 400)} »\nCe que le conte veut dire : ${interpretation}`,
          },
        ],
        { timeoutMs: 15000, temperature: 0.7, maxTokens: 160 }
      );
      return r.trim();
    }
    const r = await llmChat(
      [
        {
          role: 'system',
          content:
            "Tu es le SPU, en « mise en perspective ». Explique en 60 à 100 mots, en français, le pont précis entre la question de la personne et cette parabole : pourquoi cette histoire-là répond à cette question-là — quel ressort de la parabole éclaire sa situation, quelle résonance inattendue. Identifie d'abord en toi le cœur de sa question (pas seulement ses mots). Sans conseil, sans jugement, sans position, sans répéter le texte de la parabole. Termine par une phrase qui rend la parole à la personne (sans question pressante). Réponds avec le texte seul.",
        },
        {
          role: 'user',
          content: `La question posée : ${questionCourte}\nLa parabole offerte : « ${paraboleTexte.slice(0, 400)} »\nSon interprétation : ${interpretation}${opts.contexte ? `\nContexte de l'échange : ${opts.contexte.slice(0, 400)}` : ''}`,
        },
      ],
      { timeoutMs: 20000, temperature: 0.8, maxTokens: 280 }
    );
    return r.trim();
  } catch {
    // Repli honnête : le pont est tracé depuis l'interprétation réelle, sans invention.
    return `Le pont entre ta question et cette parabole : ${interpretation} C'est ce fil-là que j'ai reconnu dans ce que tu vis.`;
  }
}

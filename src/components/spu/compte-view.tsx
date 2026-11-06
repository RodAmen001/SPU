// Mon compte SPU — inscription/connexion volontaire + sauvegarde du journal dans le compte
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CloudUpload, Download, LogOut, Trash2, UserRound, ShieldCheck, CloudOff } from 'lucide-react';
import { useCompteStore, useSpuStore } from '@/lib/spu/store';

interface SauvegardeListe {
  id: string;
  titre: string;
  mode: string;
  nbEchanges: number;
  createdAt: string;
}

export function VueCompte() {
  const { compte, definirCompte } = useCompteStore();
  const { sessionId } = useSpuStore();
  const [onglet, setOnglet] = useState<'connexion' | 'inscrire'>('connexion');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [nom, setNom] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [sauvegardes, setSauvegardes] = useState<SauvegardeListe[] | null>(null);

  const chargerSauvegardes = useCallback(async () => {
    if (!compte) return;
    try {
      const res = await fetch('/api/compte/sauvegardes', { headers: { Authorization: `Bearer ${compte.jeton}` } });
      if (res.ok) {
        const j = await res.json();
        setSauvegardes(j.sauvegardes || []);
      } else if (res.status === 401) {
        definirCompte(null); // jeton expiré
      }
    } catch {
      setSauvegardes([]);
    }
  }, [compte, definirCompte]);

  useEffect(() => {
    void chargerSauvegardes();
  }, [chargerSauvegardes]);

  const envoyer = async () => {
    setErreur(null);
    setMessage(null);
    setOccupe(true);
    try {
      const url = onglet === 'connexion' ? '/api/compte/connexion' : '/api/compte/inscrire';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse, nom: onglet === 'inscrire' ? nom : undefined }),
      });
      const j = await res.json();
      if (!res.ok) setErreur(j.error || 'Opération impossible');
      else {
        definirCompte({ jeton: j.jeton, email: j.compte.email, nom: j.compte.nom });
        setMessage(`Bienvenue${j.compte.nom ? `, ${j.compte.nom}` : ''} — ton compte SPU est prêt.`);
      }
    } catch {
      setErreur('Serveur indisponible');
    } finally {
      setOccupe(false);
    }
  };

  const deconnexion = async () => {
    if (compte) await fetch('/api/compte/deconnexion', { method: 'POST', headers: { Authorization: `Bearer ${compte.jeton}` } }).catch(() => {});
    definirCompte(null);
    setSauvegardes(null);
    setMessage('Déconnecté. Ton journal anonyme local reste intact.');
  };

  const sauvegarderJournal = async () => {
    if (!compte || !sessionId) return;
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch('/api/compte/sauvegarder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${compte.jeton}` },
        body: JSON.stringify({ sessionId }),
      });
      const j = await res.json();
      if (!res.ok) setErreur(j.error || 'Sauvegarde impossible');
      else {
        setMessage(`Journal enregistré dans ton compte (${j.nbEchanges} échange(s)).`);
        await chargerSauvegardes();
      }
    } catch {
      setErreur('Serveur indisponible');
    } finally {
      setOccupe(false);
    }
  };

  const telecharger = async (s: SauvegardeListe, format: 'txt' | 'json' | 'md') => {
    if (!compte) return;
    const res = await fetch(`/api/compte/sauvegardes/${s.id}?format=${format}`, { headers: { Authorization: `Bearer ${compte.jeton}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spu-compte-${s.createdAt.slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const supprimer = async (s: SauvegardeListe) => {
    if (!compte) return;
    await fetch(`/api/compte/sauvegardes/${s.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${compte.jeton}` } }).catch(() => {});
    await chargerSauvegardes();
  };

  if (!compte) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <UserRound className="h-9 w-9 mx-auto text-[--primary] mb-2" aria-hidden />
            <h2 className="text-xl font-semibold">Mon compte SPU</h2>
            <p className="text-sm text-[--muted-foreground] mt-1 leading-relaxed">
              <span className="font-medium text-[--foreground]">Aucune inscription n&apos;est nécessaire</span> pour utiliser le SPU.
              Un compte sert seulement à <span className="font-medium">sauvegarder ton journal</span> et le retrouver, même après avoir effacé ton navigateur.
            </p>
          </div>

          <div className="flex rounded-full bg-[--muted] p-1 mb-5" role="tablist">
            {(['connexion', 'inscrire'] as const).map((o) => (
              <button
                key={o}
                role="tab"
                aria-selected={onglet === o}
                onClick={() => { setOnglet(o); setErreur(null); }}
                className={`flex-1 rounded-full text-sm py-2 transition-colors ${onglet === o ? 'bg-[--card] shadow-sm font-medium' : 'text-[--muted-foreground]'}`}
              >
                {o === 'connexion' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void envoyer();
            }}
          >
            {onglet === 'inscrire' && (
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ton prénom ou pseudo (optionnel)" maxLength={80} aria-label="nom" />
            )}
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresse@exemple.com" maxLength={200} aria-label="adresse e-mail" autoComplete="email" />
            <Input type="password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" maxLength={200} aria-label="mot de passe" autoComplete={onglet === 'inscrire' ? 'new-password' : 'current-password'} minLength={6} />
            <Button type="submit" disabled={occupe} className="w-full rounded-full min-h-[44px]">
              {occupe ? 'Un instant…' : onglet === 'connexion' ? 'Se connecter' : 'Créer mon compte SPU'}
            </Button>
          </form>

          {erreur && <p className="text-sm text-[--destructive] mt-3" role="alert">{erreur}</p>}
          {message && <p className="text-sm text-[--secondary] mt-3">{message}</p>}

          <p className="text-xs text-[--muted-foreground] mt-5 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[--secondary]" aria-hidden />
            Ton mot de passe est stocké haché (scrypt) sur ce serveur uniquement. Aucun email envoyé, aucune donnée partagée. Tu peux tout supprimer à tout moment.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-[--primary]/10 text-[--primary] flex items-center justify-center" aria-hidden>
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 mr-auto">
            <h2 className="font-semibold leading-tight">{compte.nom || 'Ton compte SPU'}</h2>
            <p className="text-sm text-[--muted-foreground] truncate">{compte.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={deconnexion} className="rounded-full">
            <LogOut className="h-3.5 w-3.5 mr-1" aria-hidden /> Déconnexion
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-[--border]/60">
          {sessionId ? (
            <Button onClick={sauvegarderJournal} disabled={occupe} className="rounded-full min-h-[44px]">
              <CloudUpload className="h-4 w-4 mr-2" aria-hidden />
              {occupe ? 'Enregistrement…' : 'Enregistrer le journal actuel dans mon compte'}
            </Button>
          ) : (
            <p className="text-sm text-[--muted-foreground] flex items-center gap-2">
              <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
              Pose d&apos;abord une question au SPU (ta session anonyme se crée automatiquement), puis reviens enregistrer ton journal ici.
            </p>
          )}
        </div>

        {erreur && <p className="text-sm text-[--destructive] mt-3" role="alert">{erreur}</p>}
        {message && <p className="text-sm text-[--secondary] mt-3">{message}</p>}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-[15px]">Mes journaux sauvegardés</h3>
          <Badge variant="outline" className="text-xs ml-auto">{sauvegardes?.length ?? '…'}</Badge>
        </div>
        {sauvegardes === null && <p className="text-sm text-[--muted-foreground]">Chargement…</p>}
        {sauvegardes?.length === 0 && (
          <p className="text-sm text-[--muted-foreground] leading-relaxed">
            Aucun journal sauvegardé pour l&apos;instant. Utilise le bouton ci-dessus, ou le bouton ☁️ dans le Journal de bord.
          </p>
        )}
        <div className="space-y-2.5">
          {sauvegardes?.map((s) => (
            <div key={s.id} className="rounded-xl border border-[--border] p-3.5 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{s.titre}</p>
                <p className="text-xs text-[--muted-foreground]">
                  {new Date(s.createdAt).toLocaleString('fr-FR')} · {s.nbEchanges} échange(s) · {s.mode}
                </p>
              </div>
              {(['txt', 'md', 'json'] as const).map((f) => (
                <Button key={f} variant="outline" size="sm" className="rounded-full" onClick={() => telecharger(s, f)} aria-label={`télécharger en ${f}`}>
                  <Download className="h-3.5 w-3.5 mr-1" aria-hidden />.{f}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="rounded-full text-[--destructive] border-[--destructive]/40" onClick={() => supprimer(s)} aria-label="supprimer">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

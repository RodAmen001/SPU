// Compte SPU — création de compte / connexion / gestion des sessions exportées.
// Une session exportée vers le compte est conservée et récupérable depuis
// n'importe quel appareil ; l'export .txt/.json/.md reste disponible en plus.
'use client';

import { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserRound, LogIn, LogOut, UserPlus, FolderOpen, CloudUpload, Loader2 } from 'lucide-react';
import { useSpuStore, dateHeureComplete } from '@/lib/spu/store';

interface SessionCompte {
  id: string;
  cree: string;
  mode: string;
  echanges: number;
}

const enTeteAuth = (token: string | null) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export function VoletCompte({ onOuvrirSession }: { onOuvrirSession?: (sessionId: string) => void }) {
  const { compteToken, comptePseudo, setCompte, sessionId, setSessionId } = useSpuStore();
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState<'connexion' | 'inscription'>('connexion');
  const [pseudo, setPseudo] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [sessions, setSessions] = useState<SessionCompte[] | null>(null);
  const [exportMsg, setExportMsg] = useState('');

  const chargerProfil = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/compte/moi', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        setCompte(null, null); // token expiré
        return;
      }
      const j = await res.json();
      if (j.utilisateur) setSessions(j.sessions || []);
    } catch {
      /* offline : silencieux */
    }
  }, [setCompte]);

  const gererOuverture = (o: boolean) => {
    setOuvert(o);
    if (o && compteToken) void chargerProfil(compteToken);
  };

  const soumettre = async () => {
    setEnCours(true);
    setMessage('');
    try {
      const route = onglet === 'connexion' ? '/api/compte/connexion' : '/api/compte/inscrire';
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: pseudo.trim(), motDePasse }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMessage(j.error || 'Une erreur est survenue.');
      } else {
        setCompte(j.token, j.utilisateur.pseudo);
        setMotDePasse('');
        setMessage(`Bienvenue, ${j.utilisateur.pseudo} !`);
      }
    } catch {
      setMessage('Réseau indisponible.');
    }
    setEnCours(false);
  };

  const deconnexion = async () => {
    await fetch('/api/compte/deconnexion', { method: 'POST', headers: enTeteAuth(compteToken) }).catch(() => {});
    setCompte(null, null);
    setSessions(null);
    setMessage('');
  };

  const exporterVersCompte = async () => {
    if (!sessionId) {
      setExportMsg('Aucune session courante à exporter — pose d\'abord une question.');
      return;
    }
    setExportMsg('');
    try {
      const res = await fetch('/api/compte/rattacher', {
        method: 'POST',
        headers: enTeteAuth(compteToken),
        body: JSON.stringify({ sessionId }),
      });
      const j = await res.json();
      setExportMsg(j.message || j.error || '');
      if (compteToken) void chargerProfil(compteToken);
    } catch {
      setExportMsg('Réseau indisponible.');
    }
  };

  const ouvrirSession = (id: string) => {
    setSessionId(id);
    setOuvert(false);
    onOuvrirSession?.(id);
  };

  return (
    <Dialog open={ouvert} onOpenChange={gererOuverture}>
      <DialogTrigger asChild>
        {comptePseudo ? (
          <Button variant="outline" size="sm" className="rounded-full gap-2" aria-label="mon compte SPU">
            <span className="h-5 w-5 rounded-full bg-[--secondary] text-[--secondary-foreground] text-[10px] flex items-center justify-center font-bold" aria-hidden>
              {comptePseudo.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden sm:inline max-w-[120px] truncate">{comptePseudo}</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="rounded-full" aria-label="compte SPU">
            <UserRound className="h-4 w-4 mr-1" aria-hidden /> <span className="hidden sm:inline">Compte SPU</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto scroll-spu">
        {!comptePseudo ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-serif text-xl">
                <UserRound className="h-5 w-5 text-[--primary]" aria-hidden /> Compte SPU
              </DialogTitle>
              <DialogDescription>
                Crée un compte pour conserver tes sessions sur le SPU et les retrouver depuis n&apos;importe quel
                appareil. Sans compte, ton journal reste anonyme sur cet appareil.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 mb-2">
              <Button
                variant={onglet === 'connexion' ? 'default' : 'outline'}
                size="sm" className="rounded-full flex-1"
                onClick={() => { setOnglet('connexion'); setMessage(''); }}
              >
                <LogIn className="h-3.5 w-3.5 mr-1" aria-hidden /> Connexion
              </Button>
              <Button
                variant={onglet === 'inscription' ? 'default' : 'outline'}
                size="sm" className="rounded-full flex-1"
                onClick={() => { setOnglet('inscription'); setMessage(''); }}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" aria-hidden /> Créer un compte
              </Button>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); if (!enCours) void soumettre(); }}
              className="space-y-3"
            >
              <Input
                value={pseudo} onChange={(e) => setPseudo(e.target.value)}
                placeholder="Pseudo (3 à 24 caractères)" maxLength={24} required
                minLength={3} autoComplete="username"
              />
              <Input
                type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Mot de passe (6 caractères minimum)" maxLength={128} required
                minLength={onglet === 'inscription' ? 6 : 1}
                autoComplete={onglet === 'inscription' ? 'new-password' : 'current-password'}
              />
              {message && <p className="text-sm text-[--muted-foreground]">{message}</p>}
              <Button type="submit" disabled={enCours || !pseudo.trim() || !motDePasse} className="w-full rounded-full min-h-[44px]">
                {enCours ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
                {onglet === 'connexion' ? 'Se connecter' : 'Créer mon compte SPU'}
              </Button>
            </form>
            <p className="text-xs text-[--muted-foreground]">
              Le compte stocke uniquement ton pseudo et tes sessions — jamais d&apos;adresse e-mail.
            </p>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-serif text-xl">
                <span className="h-7 w-7 rounded-full bg-[--secondary] text-[--secondary-foreground] text-xs flex items-center justify-center font-bold" aria-hidden>
                  {comptePseudo.slice(0, 1).toUpperCase()}
                </span>
                Mon compte SPU — {comptePseudo}
              </DialogTitle>
              <DialogDescription>
                Tes sessions rattachées au compte, conservées et consultables depuis n&apos;importe quel appareil.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-[--border] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CloudUpload className="h-4 w-4 text-[--primary]" aria-hidden />
                <span className="text-sm font-medium">Exporter la session courante vers mon compte</span>
              </div>
              <p className="text-xs text-[--muted-foreground]">
                Rattache ton journal anonyme actuel à ton compte : il y sera conservé (90 jours renouvelés).
              </p>
              <Button size="sm" onClick={exporterVersCompte} className="rounded-full">
                <CloudUpload className="h-3.5 w-3.5 mr-1" aria-hidden /> Exporter vers mon compte
              </Button>
              {exportMsg && <p className="text-xs text-[--muted-foreground]">{exportMsg}</p>}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Mes sessions</p>
              {!sessions && <p className="text-xs text-[--muted-foreground] respiration">Chargement…</p>}
              {sessions && sessions.length === 0 && (
                <p className="text-xs text-[--muted-foreground]">Aucune session sur ton compte pour l&apos;instant.</p>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto scroll-spu">
                {(sessions || []).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-xl border border-[--border] p-3">
                    <Badge variant="outline" className="capitalize text-xs shrink-0">{s.mode}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[--muted-foreground]">{dateHeureComplete(s.cree)}</p>
                      <p className="text-xs">{s.echanges} échange{s.echanges > 1 ? 's' : ''}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => ouvrirSession(s.id)} className="rounded-full h-8 text-xs">
                      <FolderOpen className="h-3 w-3 mr-1" aria-hidden /> Ouvrir
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full w-full">
                  <LogOut className="h-3.5 w-3.5 mr-1" aria-hidden /> Se déconnecter
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Se déconnecter du compte SPU ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tes sessions restent conservées sur ton compte. Tu pourras te reconnecter avec ton pseudo
                    et ton mot de passe pour les retrouver.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={deconnexion}>Se déconnecter</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

#!/usr/bin/env python3
# Démarrage en démon (double fork + setsid) : survit à la fin du shell appelant.
import os, sys, time

def demoniser():
    if os.fork() > 0:
        os._exit(0)  # parent 1 sort
    os.setsid()
    if os.fork() > 0:
        os._exit(0)  # parent 2 sort
    os.chdir('/')
    fd = os.open(os.devnull, os.O_RDWR)
    os.dup2(fd, 0); os.dup2(fd, 1); os.dup2(fd, 2)
    if fd > 2:
        os.close(fd)

if __name__ == '__main__':
    quoi = sys.argv[1]
    demoniser()
    if quoi == 'gardien':
        os.execvp('bash', ['bash', '/home/z/my-project/scripts/gardien-serveur.sh'])
    elif quoi == 'serveur':
        # Production : build standalone Next.js, base SQLite en chemin absolu
        # (v4.7 : DATABASE_URL explicite — le dossier standalone ne dépend plus du .env)
        os.chdir('/home/z/my-project')
        fd_log = os.open('/home/z/my-project/server.log', os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
        os.dup2(fd_log, 1)
        os.dup2(fd_log, 2)
        env = dict(os.environ, NODE_ENV='production', DATABASE_URL='file:/home/z/my-project/db/custom.db')
        os.execvpe('bun', ['bun', '.next/standalone/server.js'], env)
    elif quoi == 'dev':
        # Développement : next dev sur le port 3000, journal dans dev.log
        os.chdir('/home/z/my-project')
        fd_log = os.open('/home/z/my-project/dev.log', os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
        os.dup2(fd_log, 1)
        os.dup2(fd_log, 2)
        os.execvpe('bun', ['bun', 'run', 'dev'], dict(os.environ))
    time.sleep(1)

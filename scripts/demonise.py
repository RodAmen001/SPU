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
        os.chdir('/home/z/my-project')
        os.execvp('bun', ['bun', 'run', 'dev'])
    time.sleep(1)

#!/usr/bin/env python3
# Démarrage en démon (double fork + setsid), sans chemin lié à une machine.
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def demoniser():
    if os.fork() > 0:
        os._exit(0)  # parent 1 sort
    os.setsid()
    if os.fork() > 0:
        os._exit(0)  # parent 2 sort
    os.chdir(ROOT)
    fd = os.open(os.devnull, os.O_RDWR)
    os.dup2(fd, 0)
    os.dup2(fd, 1)
    os.dup2(fd, 2)
    if fd > 2:
        os.close(fd)


def ouvrir_journal(chemin: Path) -> int:
    return os.open(chemin, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in {'gardien', 'serveur', 'dev'}:
        print(f"Usage : {Path(sys.argv[0]).name} [gardien|serveur|dev]", file=sys.stderr)
        sys.exit(2)

    quoi = sys.argv[1]
    demoniser()
    env = os.environ.copy()

    if quoi == 'gardien':
        script = str(ROOT / 'scripts' / 'gardien-serveur.sh')
        os.execvpe('bash', ['bash', script], env)
    elif quoi == 'serveur':
        os.chdir(ROOT)
        env['NODE_ENV'] = 'production'
        env.setdefault('DATABASE_URL', f'file:{ROOT / "db" / "custom.db"}')
        fd_log = ouvrir_journal(ROOT / 'server.log')
        os.dup2(fd_log, 1)
        os.dup2(fd_log, 2)
        os.close(fd_log)
        os.execvpe('bun', ['bun', '.next/standalone/server.js'], env)
    else:  # dev
        os.chdir(ROOT)
        fd_log = ouvrir_journal(ROOT / 'dev.log')
        os.dup2(fd_log, 1)
        os.dup2(fd_log, 2)
        os.close(fd_log)
        os.execvpe('bun', ['bun', 'run', 'dev'], env)

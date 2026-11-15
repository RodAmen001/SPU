# Figure 1 du bilan de test SPU v4.8 — durées des appels API mesurés en direct (15/11/2026)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

appels = [
    ("T1 · /api/repondre\n(oracle, 1re question)", 7.1),
    ("T2 · /api/repondre\n(identique à T1)", 2.8),
    ("T3 · /api/repondre\n(identique à T1)", 2.6),
    ("T4 · /api/repondre\n(mentor, nouvelle question)", 8.0),
    ("T5 · /api/ask (SSE)\n(nouvelle question)", 3.0),
]
etiquettes = [a[0] for a in appels]
durees = [a[1] for a in appels]
COULEUR = "#1B6B7A"          # accent assombri de la palette DM-1
COULEUR_SURF = "#EDF3F5"

fig, ax = plt.subplots(figsize=(10, 5), constrained_layout=True)
bars = ax.bar(range(len(durees)), durees, color=COULEUR, width=0.55, zorder=3)
for i, d in enumerate(durees):
    ax.text(i, d + 0.15, f"{d:.1f} s".replace(".", ","),
            ha="center", va="bottom", fontsize=11, color="#0F2233")

ax.set_xticks(range(len(etiquettes)))
ax.set_xticklabels(etiquettes, fontsize=9)
ax.set_ylabel("Durée mesurée (secondes)", fontsize=11)
ax.set_ylim(0, 9.5)
ax.grid(True, axis="y", alpha=0.3, zorder=0)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)

ax.annotate("Sur les 5 appels : 0 source utilisée, synthèse vide,\nhistoire générique — aucune erreur signalée à l'utilisateur",
            xy=(2.0, 8.55), xycoords="data", ha="center", va="center",
            fontsize=10, color="#7A3B30",
            bbox=dict(boxstyle="round,pad=0.5", facecolor="#FDF1EE",
                      edgecolor="#C9A84C", linewidth=0.8))

ax.set_title("Durées des appels API mesurés en direct — spu-web.onrender.com, 15/11/2026",
             fontsize=12, color="#0F2233", pad=12)

fig.savefig("/home/z/my-project/scripts/assets/fig1-timings.png", dpi=200)
print("Figure enregistrée.")

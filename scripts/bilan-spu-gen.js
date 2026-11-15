// Génération du bilan de phase de test SPU v4.8 — docx (recette R1, palette DM-1).
// Conforme au skill docx : couverture R1 validée, TOC 3 sections, tableaux horizontaux,
// figure intégrée, numérotation de pages romaine/arabe, post-traitement séparé.
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, SectionType, TableOfContents,
} = require("docx");
const fs = require("fs");
const path = require("path");
const T = require("./bilan-spu-contenu.js");

// ── Palette DM-1 (Deep Cyan — tech/AI) ──
const P = {
  bg: "162235", accent: "37DCF2",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", innerLine: "C8DDE2", surface: "EDF3F5" },
  primary: "12253C", secondary: "506070",
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const FONT = { ascii: "Times New Roman", eastAsia: "Times New Roman" };

// ── Mise en page du titre de couverture (texte latin, largeur estimée) ──
function largeurTexte(texte, pt) {
  let w = 0;
  for (const ch of texte) {
    const code = ch.codePointAt(0);
    const cjk = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3000 && code <= 0x303f);
    w += cjk ? pt * 20 : pt * 11;
  }
  return w;
}
function couperEnLignes(titre, maxW, pt) {
  const mots = titre.split(/\s+/);
  const lignes = [];
  let cur = "";
  for (const mot of mots) {
    const cand = cur ? cur + " " + mot : mot;
    if (largeurTexte(cand, pt) <= maxW) cur = cand;
    else { if (cur) lignes.push(cur); cur = mot; }
  }
  if (cur) lignes.push(cur);
  if (lignes.length > 1 && lignes[lignes.length - 1].length <= 4) {
    const derniere = lignes.pop();
    lignes[lignes.length - 1] += " " + derniere;
  }
  return lignes;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  let pt = preferredPt;
  let lignes = couperEnLignes(title, maxWidthTwips, pt);
  while (pt >= minPt && lignes.length > 3) { pt -= 2; lignes = couperEnLignes(title, maxWidthTwips, pt); }
  return { titlePt: pt, titleLines: lignes };
}
function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838 } = params;
  const SAFETY = 1200;
  const usable = pageHeight - SAFETY;
  const titleH = titleLineCount * (titlePt * 23 + 200);
  const subH = hasSubtitle ? (12 * 23 + 600) : 0;
  const labelH = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaH = metaLineCount * (10 * 23 + 100);
  const implicite = 3 * 300;
  const contenu = titleH + subH + labelH + metaH + fixedHeight + implicite;
  const restant = Math.max(usable - contenu, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(restant * 0.45);
  const rawBottom = Math.floor(restant * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, bottomSpacing };
}

// ── Recette R1 : couverture paragraphe pur, alignée à gauche ──
function buildCoverR1(cfg) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(cfg.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!cfg.subtitle, hasEnglishLabel: !!cfg.englishLabel,
    metaLineCount: (cfg.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
    children: [new TextRun({ text: cfg.englishLabel.split("").join("  "), size: 18,
      color: P.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
  }));

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: P.cover.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }

  children.push(new Paragraph({
    indent: { left: padL }, spacing: { after: 800 },
    children: [new TextRun({ text: cfg.subtitle, size: 24, color: P.cover.subtitleColor,
      font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
  }));

  for (const ligne of cfg.metaLines) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: ligne, size: 24, color: P.cover.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: cfg.footerLeft, size: 16, color: P.cover.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: cfg.footerRight, size: 16, color: P.cover.footerColor, font: { ascii: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ── Composants du corps ──
function h1(texte) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text: texte, bold: true, size: 32, color: P.primary, font: FONT })],
  });
}
function h2(texte) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text: texte, bold: true, size: 30, color: P.primary, font: FONT })],
  });
}
function corps(texte) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text: texte, size: 24, color: "000000", font: FONT })],
  });
}
function titreTableau(texte) {
  return new Paragraph({
    keepNext: true, spacing: { before: 160, after: 80, line: 312 },
    children: [new TextRun({ text: texte, bold: true, size: 21, color: P.secondary, font: FONT })],
  });
}
function tableau(entetes, lignes, largeurs) {
  const celluleEntete = (texte, i) => new TableCell({
    children: [new Paragraph({ spacing: { line: 312 },
      children: [new TextRun({ text: texte, bold: true, size: 21, color: P.table.headerText, font: FONT })] })],
    shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: { size: largeurs[i], type: WidthType.PERCENTAGE },
  });
  const cellule = (texte, i, zebre) => new TableCell({
    children: [new Paragraph({ spacing: { line: 312 },
      children: [new TextRun({ text: texte, size: 21, color: "000000", font: FONT })] })],
    shading: zebre ? { type: ShadingType.CLEAR, fill: P.table.surface } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: { size: largeurs[i], type: WidthType.PERCENTAGE },
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.headerBg },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.headerBg },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: entetes.map(celluleEntete) }),
      ...lignes.map((l, idx) => new TableRow({ cantSplit: true, children: l.map((t, i) => cellule(t, i, idx % 2 === 0)) })),
    ],
  });
}

// ── Figure 1 (dimensions lues dans l’en-tête PNG, ratio préservé) ──
function figure(chemin, legende, largeurAffichee) {
  const buf = fs.readFileSync(chemin);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const hauteur = Math.round(largeurAffichee * (h / w));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: largeurAffichee, height: hauteur }, type: "png" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200, line: 312 },
      children: [new TextRun({ text: legende, size: 21, color: P.secondary, italics: true, font: FONT })],
    }),
  ];
}

// ── En-tête et pieds de page ──
const entete = new Header({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 },
    children: [new TextRun({ text: T.entete, size: 18, color: "808080", font: FONT })],
  })],
});
const piedPage = () => new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { line: 240 },
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FONT })],
  })],
});

// ── Corps du document ──
const corpsDoc = [];
corpsDoc.push(h1("1. Synthèse du bilan"));
T.synthese.forEach(p => corpsDoc.push(corps(p)));

corpsDoc.push(h1("2. Périmètre, environnement et méthode de test"));
T.methode.forEach(p => corpsDoc.push(corps(p)));

corpsDoc.push(h1("3. Résultats détaillés des tests"));
corpsDoc.push(h2("3.1 Vue d’ensemble des douze vérifications"));
corpsDoc.push(corps(T.resultatsIntro));
corpsDoc.push(titreTableau(T.tableau1.titre));
corpsDoc.push(tableau(T.tableau1.entetes, T.tableau1.lignes, T.tableau1.largeurs));

corpsDoc.push(h2("3.2 Mesures sur le pipeline de réponse"));
corpsDoc.push(corps(T.resultatsPipeline[0]));
corpsDoc.push(...figure(path.join(__dirname, "assets", "fig1-timings.png"), T.figLegende, 480));
corpsDoc.push(corps(T.resultatsPipeline[1]));

corpsDoc.push(h1("4. Impressions générales"));
corpsDoc.push(corps(T.impressionsIntro));
corpsDoc.push(h2("4.1 Une interface enfin à la hauteur de l’objet"));
T.impressions1.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("4.2 Le soin apporté à l’ambiance sonore"));
T.impressions2.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("4.3 Une ingénierie de défense sérieuse"));
T.impressions3.forEach(p => corpsDoc.push(corps(p)));

corpsDoc.push(h1("5. Remarques et anomalies constatées"));
corpsDoc.push(h2("5.1 Anomalie majeure — le cœur du pipeline est muet en production"));
T.remarqueMajeure.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("5.2 Une panne invisible pour l’utilisateur"));
T.remarqueInvisible.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("5.3 Conformité — l’attribution musicale CC-BY manque à l’appel"));
T.remarqueCCBY.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("5.4 Remarques secondaires"));
T.remarquesSecondaires.forEach(p => corpsDoc.push(corps(p)));

corpsDoc.push(h1("6. Analyse des causes probables"));
T.causes.forEach(p => corpsDoc.push(corps(p)));

corpsDoc.push(h1("7. Propositions d’amélioration"));
corpsDoc.push(corps(T.propositionsIntro));
corpsDoc.push(h2("7.1 Avant toute diffusion large (P1)"));
T.propositionsP1.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("7.2 Qualité et conformité (P2)"));
T.propositionsP2.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("7.3 Horizons plus lointains (P3)"));
T.propositionsP3.forEach(p => corpsDoc.push(corps(p)));
corpsDoc.push(h2("7.4 Plan d’action récapitulatif"));
corpsDoc.push(titreTableau(T.tableau2.titre));
corpsDoc.push(tableau(T.tableau2.entetes, T.tableau2.lignes, T.tableau2.largeurs));

corpsDoc.push(h1("8. Conclusion et verdict"));
T.conclusion.forEach(p => corpsDoc.push(corps(p)));

// ── Assemblage ──
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: { run: { font: FONT, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } } },
      heading2: { run: { font: FONT, size: 30, bold: true, color: P.primary },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } } },
    },
  },
  sections: [
    { // Section 1 : couverture — marges 0, sans numéro de page
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: T.titre, subtitle: T.sousTitre, englishLabel: T.libelle,
        metaLines: T.metaLines, footerLeft: T.piedGauche, footerRight: T.piedDroit,
      }),
    },
    { // Section 2 : table des matières — chiffres romains
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin,
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      headers: { default: entete },
      footers: { default: piedPage() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: T.titreTDM, bold: true, size: 32, color: P.primary, font: FONT })],
        }),
        new TableOfContents("Table des matières", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200, line: 312 },
          children: [new TextRun({ text: T.noteTDM, italics: true, size: 18, color: "888888", font: FONT })],
        }),
        // Pas de PageBreak ici : la section suivante (NEXT_PAGE) force déjà la page,
        // un saut supplémentaire créerait une page blanche (contrôle postcheck).
      ],
    },
    { // Section 3 : corps — chiffres arabes, recommence à 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin,
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: entete },
      footers: { default: piedPage() },
      children: corpsDoc,
    },
  ],
});

const SORTIE = "/home/z/my-project/download/SPU_v4.8_bilan_phase_de_test.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(SORTIE, buf);
  console.log("Document écrit :", SORTIE, "(" + buf.length + " octets)");
});

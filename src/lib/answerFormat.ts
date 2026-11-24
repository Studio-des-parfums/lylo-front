/**
 * Format de réponse du questionnaire actif (renvoyé par le back : /api/questions et la session).
 * Pilote le nombre de choix « le plus » / « le moins », l'étape « le moins » et les libellés,
 * déjà traduits par le back dans la langue de la session.
 */
export interface AnswerFormat {
  positive_label: string; // ex. « Vos préférés », « Ce qui vous représente le plus »
  negative_label: string;
  positive_count: number;
  positive_justify: boolean;
  negative_count: number; // 0 = pas d'étape « le moins »
  negative_justify: boolean;
}

/** Format historique Lylo : 2 préférés + 2 moins aimés (libellés remplacés par ceux du back). */
export const DEFAULT_ANSWER_FORMAT: AnswerFormat = {
  positive_label: "",
  negative_label: "",
  positive_count: 2,
  positive_justify: true,
  negative_count: 2,
  negative_justify: true,
};

export function parseAnswerFormat(raw: unknown): AnswerFormat {
  return { ...DEFAULT_ANSWER_FORMAT, ...(raw && typeof raw === "object" ? (raw as Partial<AnswerFormat>) : {}) };
}

/** Consigne de sélection : « Vos préférés · 2 réponses ». */
export function selectionHint(
  format: AnswerFormat,
  side: "positive" | "negative",
  t: (key: string) => string,
): string {
  const n = side === "positive" ? format.positive_count : format.negative_count;
  const label = side === "positive" ? format.positive_label : format.negative_label;
  const count = t(n === 1 ? "quiz.pickCount.one" : "quiz.pickCount.many").replace("{n}", String(n));
  return label ? `${label} · ${count}` : count;
}

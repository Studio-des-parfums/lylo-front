/**
 * Format de réponse du questionnaire actif (renvoyé par le back : /api/questions et la session).
 * Pilote le nombre de choix « le plus » / « le moins », l'étape « le moins » et les libellés.
 */
export type Framing = "preference" | "trait";

export interface AnswerFormat {
  framing: Framing;
  positive_count: number;
  positive_justify: boolean;
  negative_count: number; // 0 = pas d'étape « le moins »
  negative_justify: boolean;
}

/** Format historique Lylo : 2 préférés + 2 moins aimés. */
export const DEFAULT_ANSWER_FORMAT: AnswerFormat = {
  framing: "preference",
  positive_count: 2,
  positive_justify: true,
  negative_count: 2,
  negative_justify: true,
};

export function parseAnswerFormat(raw: unknown): AnswerFormat {
  return { ...DEFAULT_ANSWER_FORMAT, ...(raw && typeof raw === "object" ? (raw as Partial<AnswerFormat>) : {}) };
}

/** Clé i18n de la consigne de sélection : quiz.hint.<framing>.<positive|negative>.<one|many>. */
export function hintKey(format: AnswerFormat, side: "positive" | "negative"): { key: string; n: number } {
  const n = side === "positive" ? format.positive_count : format.negative_count;
  return { key: `quiz.hint.${format.framing}.${side}.${n === 1 ? "one" : "many"}`, n };
}

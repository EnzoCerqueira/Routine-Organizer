// Formatação de datas para exibição (pt-BR), sobre as funções puras de lib/dates.ts.

import { addDays, toDbDate, weekdayOf } from "@/lib/dates";

// Índice = dayOfWeek (0 = Domingo), mesmo padrão do banco e do Date.getUTCDay()
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// Ordem de exibição: semana começando na segunda
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Os 7 dias (segunda a domingo) da semana que contém a data. */
export function weekOf(ymd: string): string[] {
  const monday = addDays(ymd, -((weekdayOf(ymd) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "Terça-feira, 17 de novembro" */
export function formatLongDate(ymd: string): string {
  const d = toDbDate(ymd);
  return `${WEEKDAY_LONG[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

/** "17/11" */
export function formatShortDate(ymd: string): string {
  const [, month, day] = ymd.split("-");
  return `${day}/${month}`;
}

/** "Toda segunda" / "Todo sábado" (sábado e domingo são masculinos). long = "Toda segunda-feira" */
export function everyWeekdayLabel(dayOfWeek: number, long = false): string {
  const name = (WEEKDAY_LONG[dayOfWeek] ?? "").toLowerCase();
  const prefix = dayOfWeek === 0 || dayOfWeek === 6 ? "Todo" : "Toda";
  return `${prefix} ${long ? name : name.replace("-feira", "")}`;
}

/** "1 dia" / "3 dias" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

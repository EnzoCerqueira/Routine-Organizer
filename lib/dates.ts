// Datas de calendário ("YYYY-MM-DD") independentes do fuso do servidor.
// Em produção o processo roda em UTC; "hoje" sempre é calculado no fuso do usuário.
// Funções puras: podem ser usadas tanto no servidor quanto no cliente.

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatYmd(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** O fuso IANA é reconhecido pelo runtime? */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Fuso salvo no banco -> fuso utilizável (um valor inválido não pode derrubar a página). */
export function safeTimeZone(timeZone: string | null | undefined): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
}

/** Dia do calendário ("YYYY-MM-DD") em que um instante cai, no fuso informado. */
export function localDateOf(instant: Date, timeZone: string): string {
  return formatYmd(instant, safeTimeZone(timeZone));
}

/** "YYYY-MM-DD" -> Date para colunas @db.Date (o Prisma grava a parte de data em UTC). */
export function toDbDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Date vinda de uma coluna @db.Date -> "YYYY-MM-DD". */
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 0 = Domingo ... 6 = Sábado. */
export function weekdayOf(ymd: string): number {
  return toDbDate(ymd).getUTCDay();
}

/** Soma/subtrai dias de uma data "YYYY-MM-DD" (conta em UTC: imune a horário de verão). */
export function addDays(ymd: string, days: number): string {
  return new Date(toDbDate(ymd).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

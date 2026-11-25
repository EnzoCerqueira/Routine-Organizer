-- Rotina semanal (com encerramento via endedAt) + estado por dia (TaskLog) + fuso do usuário.
-- Escrita à mão: o SQL gerado pelo Prisma removeria scheduledFor/isCompleted/pomodoroMinutes
-- sem migrar os dados. Aqui os dados existentes são copiados antes das colunas saírem.

-- Fuso do usuário (define o que é "hoje")
ALTER TABLE "User" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Novas colunas da Task
ALTER TABLE "Task" ADD COLUMN "date" DATE,
ADD COLUMN "dayOfWeek" INTEGER,
ADD COLUMN "endedAt" DATE;

-- scheduledFor era meia-noite no horário de Brasília (o frontend mandava startOf('day') em -03:00);
-- converter no fuso de Brasília garante o mesmo dia do calendário.
UPDATE "Task" SET "date" = ("scheduledFor" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;

-- Estado por dia
CREATE TABLE "TaskLog" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "pomodoroMinutes" INTEGER NOT NULL DEFAULT 0,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskLog_pkey" PRIMARY KEY ("id")
);

-- Copia conclusão e minutos já registrados para o dia da tarefa
INSERT INTO "TaskLog" ("id", "date", "completed", "pomodoroMinutes", "taskId", "updatedAt")
SELECT gen_random_uuid()::text, "date", "isCompleted", "pomodoroMinutes", "id", CURRENT_TIMESTAMP
FROM "Task"
WHERE "isCompleted" = true OR "pomodoroMinutes" > 0;

-- Remove o modelo antigo
DROP INDEX "Task_scheduledFor_idx";
DROP INDEX "Task_isCompleted_idx";
ALTER TABLE "Task" DROP COLUMN "isCompleted",
DROP COLUMN "pomodoroMinutes",
DROP COLUMN "scheduledFor";

-- Regras que o Prisma não expressa no schema: exatamente um entre date/dayOfWeek, e dia de 0 a 6
ALTER TABLE "Task" ADD CONSTRAINT "Task_date_xor_dayOfWeek_check"
  CHECK (("date" IS NULL) <> ("dayOfWeek" IS NULL));
ALTER TABLE "Task" ADD CONSTRAINT "Task_dayOfWeek_range_check"
  CHECK ("dayOfWeek" IS NULL OR "dayOfWeek" BETWEEN 0 AND 6);
-- Só rotina semanal pode ser encerrada; tarefa avulsa já termina na própria data
ALTER TABLE "Task" ADD CONSTRAINT "Task_endedAt_only_routine_check"
  CHECK ("endedAt" IS NULL OR "dayOfWeek" IS NOT NULL);

-- Índices
CREATE INDEX "Task_date_idx" ON "Task"("date");
CREATE INDEX "Task_dayOfWeek_idx" ON "Task"("dayOfWeek");
CREATE INDEX "TaskLog_date_idx" ON "TaskLog"("date");
CREATE UNIQUE INDEX "TaskLog_taskId_date_key" ON "TaskLog"("taskId", "date");

-- Chave estrangeira
ALTER TABLE "TaskLog" ADD CONSTRAINT "TaskLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

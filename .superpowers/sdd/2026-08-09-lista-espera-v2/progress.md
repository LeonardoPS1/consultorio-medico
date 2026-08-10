# SDD ledger — plan: docs/superpowers/plans/2026-08-09-lista-espera-v2.md

Task 1: complete (commits e993cda..3f885d2, review clean)
Task 1: minor (deferred): waitlist.ts:563 in-progress turnos invisibles al occupancy check (gte ahora, podria solaparse)
Task 1: minor (deferred): waitlist.ts:618-622 NaN guard no capta 'inicio'='' (Number('')=0)
Task 1: minor (deferred): waitlist.ts:514 getDay() local vs turnos.ts:171 getUTCDay() — alinear si VPS no utc
Task 1: minor (deferred): JSDoc @param stubs en 9 exports pre-existentes (lint-staged jsdoc)
Task 1: minor (deferred): waitlist-franjas.test.ts no cubre duracionTurnoMinutos 45/60 ni opts default
Task 2: fix round 1/5 (1 addressed, 0 open - orphan turno hoist; commit 7bbfd13..8095dcc)
Task 2: complete (commits 3f885d2..8095dcc, 1 Important fixed in fix round 1, review clean)
Task 2: minor (deferred): waitlist-crear-oferta.test.ts join mock no afirma not(eq)/eq(pacienteId) individualmente
Task 3: fix round 1/5 (1 addressed, 0 open - verbatim Hola en minuscula; commit c21019b..6d26e96)
Task 3: complete (commits 8095dcc..6d26e96, 1 Important fixed in fix round 1, review clean)
Task 3: minor (deferred): whatsapp-waitlist-texts.test.ts sin newline EOL + branch fallback sin-nombre no cubierta + turno.pacienteId unused en notificarPacienteReasignado
Task 4: complete (commits 6d26e96..cb6b27b, review clean)
Task 4: minor (deferred): updateSets no se limpia en beforeEach (benigno) + chequeo otra-oferta no atómico (spec-mandated, race real necesita transacción)
Task 5: complete (commits cb6b27b..82b86ea, review clean)
Task 5: minor (deferred): formatearFechaHora sin timeZone America/Santiago + 2 gaps test (gte fecha no filtrado en mock, fallback apellido->nombre sin cubrir) + franjas route toISOString UTC
Task 6: complete (commits 82b86ea..8782056, review clean)
Task 6: minor (deferred): voseo preexistente lista-espera-client (Agregá/Elegí) para Task 7; changelog-data/planes 'ofertas automáticas' out-of-scope
Task 7: complete (commit ba5427d, review clean)

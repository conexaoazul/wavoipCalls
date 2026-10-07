# Mágica Voice — LAB no-dispatch runbook

Este ambiente existe para validar banco, autenticação, fila, policy e preflight
sem emitir chamadas.

## Invariantes

- `VOICE_DISPATCH_ENABLED=false`;
- somente `elevenlabs` fica habilitado como provider;
- Agent allowlisted: `Blue Voice LAB — Conexão Azul`;
- phone allowlist vazia até existir um número/trunk exclusivo de LAB;
- nenhum Agent Amanda ou número de produção pode ser usado;
- migrations são one-shot; restart da API não altera schema;
- portas ficam presas a `127.0.0.1`;
- nenhum segredo é versionado.

## Sequência

1. Copiar `deploy/lab/.env.lab.example` para `.env.lab` e preencher somente
   segredos locais.
2. Rodar `bash scripts/lab-preflight.sh .env.lab`.
3. Rodar `bash scripts/lab-migrate.sh .env.lab`.
4. Subir `postgres`, `backend` e `frontend`:
   `docker compose --env-file .env.lab -f deploy/lab/docker-compose.yml up -d postgres backend frontend`.
5. Validar `GET /health/live` e `GET /health/ready`.
6. Criar/importar a credential ElevenLabs no LAB pela UI/API autenticada.
7. Criar uma call de laboratório com idempotency key, mas sem habilitar dispatch.
8. O preflight completo deve permanecer bloqueado enquanto a phone allowlist
   estiver vazia. Isso é esperado e prova o deny-by-default.
9. Só depois de existir phone/SIP LAB dedicado: adicionar somente o ID desse
   número na allowlist e repetir preflight.
10. O primeiro outbound exige gate humano separado para trocar
   `VOICE_DISPATCH_ENABLED=true`; após um canário, voltar para false.

## Rollback

Como este gate não altera produção, rollback do LAB é:
`docker compose --env-file .env.lab -f deploy/lab/docker-compose.yml down`.

Não usar `down -v` se houver evidência LAB que ainda precise ser preservada.

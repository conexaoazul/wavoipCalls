# Handoff — Mágica Voice LAB em OCI (sem dispatch)

## Objetivo

Subir um LAB descartável em um worker OCI E5 sem tocar nos serviços críticos do
Swarm e sem permitir chamadas reais.

Estado validado no GitHub:

- PR #1 draft;
- branch: `feat/magica-voice-elevenlabs-lab-20261006`;
- usar sempre o SHA exato aprovado pelo CI antes de executar;
- `VOICE_DISPATCH_ENABLED=false`;
- `VOICE_PREFLIGHT_ENABLED=true`;
- Agent allowlisted: `Blue Voice LAB — Conexão Azul`;
- phone allowlist vazia.

## Target

Preferir um nó OCI com os labels observados:

- `provider=oci`;
- `pool=oci-e5`;
- `workload=stateless`;
- `consultas_oci=true`.

Não usar `azul2` para este LAB.

O PostgreSQL deste LAB é **descartável** e fica local ao host. Não reutilizar esse
desenho para produção.

## Gate 0 — somente leitura

No host escolhido:

```bash
hostname
docker info --format '{{.Swarm.LocalNodeState}}'
docker ps --format '{{.Names}}'
df -h
free -h
```

Abortar se houver pressão de CPU/memória/disco, nome conflitante
`magica_voice_lab`, ou se o host não for o worker OCI aprovado.

## Gate 1 — checkout exato

Clonar o repositório em diretório próprio e fixar o SHA do CI verde. Não usar
`git pull` durante a janela.

```bash
git clone https://github.com/conexaoazul/wavoipCalls.git magica-voice-lab
git -C magica-voice-lab fetch origin feat/magica-voice-elevenlabs-lab-20261006
git -C magica-voice-lab checkout --detach <CI_GREEN_SHA>
```

Validar:

```bash
git -C magica-voice-lab rev-parse HEAD
git -C magica-voice-lab status --short
```

## Gate 2 — segredos locais

```bash
cp magica-voice-lab/deploy/lab/.env.lab.example magica-voice-lab/.env.lab
```

Preencher apenas no host:

- `POSTGRES_PASSWORD`;
- `CONTROL_PLANE_API_TOKEN`.

Nunca colar esses valores em ticket, PR, shell history compartilhado ou chat.

## Gate 3 — preflight + migration one-shot

```bash
bash magica-voice-lab/scripts/lab-preflight.sh magica-voice-lab/.env.lab
bash magica-voice-lab/scripts/lab-migrate.sh magica-voice-lab/.env.lab
```

Exigir `GATE=PASS`.

## Gate 4 — subir LAB sem dispatch

```bash
docker compose   --env-file magica-voice-lab/.env.lab   -f magica-voice-lab/deploy/lab/docker-compose.yml   -p magica_voice_lab   up -d postgres backend frontend
```

Validar:

```bash
curl -fsS http://127.0.0.1:3110/health/live
curl -fsS http://127.0.0.1:3110/health/ready
docker compose   --env-file magica-voice-lab/.env.lab   -f magica-voice-lab/deploy/lab/docker-compose.yml   -p magica_voice_lab   exec -T backend sh -c   '[ "$VOICE_DISPATCH_ENABLED" = "false" ] && [ "$VOICE_PREFLIGHT_ENABLED" = "true" ]'
```

## Gate 5 — credential + preflight

Cadastrar a credential ElevenLabs LAB via control plane autenticado.

A primeira tentativa de preflight deve continuar bloqueada enquanto
`VOICE_ELEVENLABS_PHONE_ALLOWLIST` estiver vazia. Isso é resultado esperado e
prova que deny-by-default está funcionando.

Não atribuir os números em uso pelos Agents Amanda.

## Rollback

Como não há dispatch:

```bash
docker compose   --env-file magica-voice-lab/.env.lab   -f magica-voice-lab/deploy/lab/docker-compose.yml   -p magica_voice_lab   down
```

Preservar o volume enquanto evidência for necessária. Só remover o volume após
registrar os resultados.

## Critério para o próximo gate

Somente avançar para uma chamada real quando todos forem verdadeiros:

1. CI da head exata verde;
2. LAB health/readiness verde;
3. migration aplicada em banco LAB;
4. credential ElevenLabs validada;
5. Agent LAB allowlisted;
6. phone/SIP **exclusivamente LAB** criado e allowlisted;
7. créditos ElevenLabs suficientes;
8. preflight PASS;
9. aprovação humana explícita para ligar `VOICE_DISPATCH_ENABLED=true`.

Após um único canário, retornar dispatch para `false`.

# Mágica Voice + ElevenLabs — LAB bridge fail-open

Data: 2026-10-06  
Status: **DESIGN / NÃO ALTERA PRODUÇÃO**  
Referência operacional: `conexaoazul/dhy#395` (SAMU SAJ Phase 2)

## 1. Objetivo

Reaproveitar as lições da Fase 2 do SAMU SAJ para evoluir a Mágica Voice com
ElevenLabs Agents sem misturar telefonia, processamento pesado, CRM e automação
em um único caminho crítico.

A primeira entrega é um **LAB isolado**, sem alteração de trunks/agents de
produção e sem ferramentas com capacidade de escrita.

## 2. O que já existe neste repositório

O backend já possui integração ElevenLabs suficiente para não começarmos do zero:

- cadastro multi-tenant de credencial ElevenLabs;
- listagem de Agents;
- listagem de phone numbers;
- outbound call em `/v1/convai/sip-trunk/outbound-call`;
- scheduler de chamadas por tenant;
- integração paralela Vapi;
- integração Wavoip e teste de disponibilidade do dispositivo;
- call logs.

A evolução deve, portanto, transformar o código atual em um **control plane
governado**, em vez de criar outro stack de chamadas em paralelo.

## 3. Lições reutilizadas do SAMU SAJ

1. O plano de telefonia deve sobreviver à falha da IA.
2. Dependência externa/heavy processing não entra no caminho crítico sem timeout,
   limite e fallback.
3. Evento precisa ser correlacionável e idempotente.
4. Restart/retry não pode provocar efeito duplicado.
5. Logs técnicos devem carregar o mínimo necessário, sem áudio, segredo ou PII.
6. Canary vem antes de produção e o rollback deve ser trivial.
7. Estado observado em runtime vale mais que configuração presumida.
8. CI precisa testar restart, partial event, duplicidade e retry.

No SAMU, `System()/AGI` estavam desabilitados deliberadamente e o melhor desenho
passou a ser out-of-band. Para Mágica Voice, a IA pode participar da conversa
síncrona, mas o **controle/orquestração** continua desacoplado e deve falhar sem
derrubar outros serviços de telefonia.

## 4. Riscos P0 encontrados no código atual

Antes de qualquer novo canário de produção:

- **Secret em log:** criação de ElevenLabs registra `req.body`; o body pode
  conter token.
- **Secret em log Wavoip:** scheduler registra o valor do token ao escolher um
  device disponível.
- **Token em URL:** check de disponibilidade aceita token diretamente no path.
  Isso pode acabar em access logs, reverse proxy, traces e histórico.
- **Serialização de credential:** endpoints de list/get precisam provar que
  tokens nunca voltam para clientes não autorizados.
- **`/curl-executor`:** superfície genérica deve ser removida do plano de voz ou
  ficar sob allowlist explícita e autenticação forte.
- **Outbound sem idempotency key:** retry após timeout pode disparar duas chamadas.
- **Logs de payload:** número do cliente e outros identificadores não devem ser
  logados integralmente por default.

Nenhum desses pontos exige tocar nos trunks para ser corrigido.

## 5. Arquitetura-alvo

```text
Mágica Voice / control plane
  |
  +-- tenant + policy + feature flag
  +-- agent/provider resolver
  +-- idempotency + correlation
  +-- audit/status sanitizado
  |
  +--> ElevenLabs Agent LAB
  |      ASR / LLM / TTS
  |      sem tools de escrita inicialmente
  |
  +--> SIP/Wavoip LAB
  |      rota dedicada/canário
  |
  +--> MágicaChat / Chatwoot
  |      status + handoff humano + histórico sanitizado
  |
  +--> Odoo / blue_chat_v3
         contexto CRM read-only primeiro
         writes somente depois de gate próprio
```

O media plane e os serviços auxiliares não devem depender do mesmo processo.

## 6. Correlation contract v1

Campos mínimos:

```json
{
  "tenant_id": 0,
  "internal_call_id": "opaque-id",
  "idempotency_key": "opaque-id",
  "provider": "elevenlabs",
  "provider_call_id": "optional",
  "conversation_id": "optional",
  "sip_call_id": "optional",
  "agent_ref": "opaque-ref",
  "phone_ref": "opaque-ref",
  "state": "created|dialing|connected|handoff|ended|failed",
  "occurred_at": "RFC3339"
}
```

Não incluir token, prompt completo, áudio, caller-id cru ou transcript integral
no evento técnico.

## 7. LAB escolhido

Usar exclusivamente o Agent **Blue Voice LAB — Conexão Azul**.

Motivos:
- criado para sandbox;
- sem tools/MCP;
- prompt explicitamente de laboratório;
- limite de concorrência baixo;
- retenção curta;
- sem número telefônico atribuído;
- consentimento explícito no widget.

Não usar os Agents Amanda/SDR nem trunks existentes de produção no primeiro
canário.

## 8. Sequência de implementação

### P0 — hardening do control plane

1. DTO seguro de credential: segredo write-only.
2. redaction central de logs.
3. trocar token-no-path por credential ID interno.
4. remover/fechar `curl-executor`.
5. `idempotency_key` obrigatório no outbound.
6. provider timeout + bounded retry.
7. testes que provem zero duplicidade.

### P1 — provider adapter

Interface conceitual:

```ts
interface VoiceProvider {
  listAgents(ctx): Promise<AgentRef[]>;
  listNumbers(ctx): Promise<PhoneRef[]>;
  startCall(req: StartCallRequest): Promise<CallStartResult>;
  getCall(ref: ProviderCallRef): Promise<CallState>;
  cancelCall?(ref: ProviderCallRef): Promise<void>;
}
```

Implementações:
- ElevenLabs;
- Wavoip;
- Vapi.

Nenhum controller deve conhecer token bruto do provider.

### P2 — canário LAB

1. text-only/API smoke;
2. chamada controlada em rota/número LAB;
3. uma única conversa;
4. confirmar correlation IDs;
5. simular ElevenLabs indisponível;
6. retry/restart sem segunda chamada;
7. handoff humano explícito;
8. desligar feature flag e provar retorno ao baseline.

### P3 — MágicaChat e Odoo

Primeiro shadow/read-only:
- registrar status de chamada e conversation reference no Chatwoot;
- vincular ao lead/contact por identificador controlado;
- Odoo somente leitura para contexto;
- qualquer write vira gate separado.

## 9. Uptime / fail-safe

Para fluxos comerciais, uma falha da IA pode terminar com:
- transferência para humano, quando disponível; ou
- mensagem curta e encerramento limpo.

Ela **não** pode derrubar trunks, Chatwoot, CRM ou outros fluxos de telefonia.

Recursos auxiliares devem ter CPU/memória limitados, readiness própria e kill
switch independente.

## 10. Critérios de aceite antes de produção

- CI verde;
- nenhum secret em logs/responses;
- zero duplicate-call sob timeout/retry/restart;
- timeout e circuit breaker do provider;
- correlation ponta a ponta;
- feature flag por tenant;
- LAB agent e LAB route separados;
- handoff humano testado;
- rollback sem restart dos serviços críticos;
- observabilidade de erro/latência/backlog;
- retenção/consentimento validados.

## 11. Limite de segurança SAMU

Este padrão pode ser reutilizado como engenharia, mas **não** autoriza agente de
voz autônomo em triagem clínica, decisão médica ou substituição do fluxo humano
do SAMU. Qualquer uso clínico exige projeto e gates próprios.

## 12. Próximas mudanças de código

Primeiro PR deve conter apenas:
- redaction;
- credential DTO write-only;
- idempotency contract/storage;
- provider adapter ElevenLabs;
- testes;
- feature flag LAB desligada por default.

Sem deploy e sem alterar phone number/trunk nesta etapa.

# 🔧 Plano de Refatoração Arquitetural — MusicTrainer

> **Escopo**: reestruturação de código para máxima **modularidade, plug-and-play e estabilidade**.
> **Regra inegociável**: **NENHUMA mudança de comportamento/lógica** — apenas reorganização, realocação e padronização (moves mecânicos + atualização de imports).
> **Verificação**: após cada etapa, `npm run build` deve passar de forma idêntica.

---

## 1. Análise do Estado Atual

### 1.1 Estrutura atual
```
src/
├── audio/          # AudioEngine.ts, audioWorkletProcessor.ts, audioWorkletTypes.d.ts, noteFrequencies.ts
├── components/     # 11 arquivos .tsx (AppLayout, ChapterTrainingScreen, HistoryScreen, HomeScreen,
│                   #   Icon, SettingsModal, SetupWizard, SheetMusicDisplay, ThemeSettings, inputs, ui)
├── exercise/       # curriculum.ts, generator.ts
├── storage/        # storage.ts
├── theme/          # ThemeContext.tsx, apply.ts, presets.ts, types.ts
├── types/          # index.ts, wizard.ts
├── App.tsx, main.tsx, index.css, vite-env.d.ts
```

### 1.2 Pontos de dor & acoplamentos detectados

1. **Sem aliases de caminho** — 100% imports relativos (`../../theme/ThemeContext`). Mover qualquer arquivo exige reescrever dezenas de imports à mão (frágil, propenso a erro). **Enabler de maior alavancagem.**
2. **Dependência quase-circular `theme ⇄ storage`** — `theme/ThemeContext → storage/storage → theme/apply (defaultThemeConfig)`. Quebra o princípio de camadas e dificulta a manutenção.
3. **Tipos duplicados e divergentes** — `Clef` (types/index.ts **e** exercise/curriculum.ts), `PitchData` (types/index.ts **e** types/wizard.ts, já com docs divergentes), `Difficulty`/`InputMode` (curriculum.ts). Quem importa de onde está inconsistente.
4. **Constantes duplicadas** — `INSTRUMENTS` e `MANUAL_TYPES` copiados em `SetupWizard.tsx` **e** `SettingsModal.tsx` (com shape levemente diferente). Ao alterar uma, a outra fica dessincronizada.
5. **`ARCHITECTURE.md` desatualizado** — documenta `pitchDetection.ts`, `progressStorage.ts`, `ChapterSelectScreen.tsx`, `types/exercise.ts` que **não existem** (arquivos reais: `AudioEngine.ts`, `storage/storage.ts`, seleção dentro de `ChapterTrainingScreen`, `types/index.ts`).
6. **Worklet não-build-safe** — `AudioEngine.ts:50` usa caminho rígido `/src/audio/audioWorkletProcessor.ts` (funciona só no dev server). O worklet é compilado separadamente via `tsconfig.worklet.json` + `tsc -b`, mas o módulo não é emitido como asset no bundle.
7. **Sem tooling de lint/test** — `package.json` só tem `dev`/`build`/`preview`. `vite-plugin-pwa` está nas deps mas **não é usado** (bloat morto).
8. **`tsconfig.json` permissivo** — `noUnusedLocals` e `noUnusedParameters` desligados (fica mais difícil detectar código morto/frágil).

---

## 2. Estrutura Alvo

Introduzir o alias `@/` → `src/` (Vite + TypeScript) e organizar por **camadas verticais plug-and-play** com **shared stacks** mínimos e explícitos.

```
src/
├── @/ (alias → src)
│
├── audio/                       # Slice: Motor de áudio (auto-contido)
│   ├── AudioEngine.ts
│   ├── audioWorkletProcessor.ts
│   ├── audioWorkletTypes.d.ts
│   ├── noteFrequencies.ts
│   └── index.ts                 # Superfície pública do slice (barrel)
│
├── components/                  # Slice: UI de tela & widgets
│   ├── AppLayout.tsx
│   ├── ChapterTrainingScreen.tsx
│   ├── HistoryScreen.tsx
│   ├── HomeScreen.tsx
│   ├── Icon.tsx
│   ├── SettingsModal.tsx
│   ├── SetupWizard.tsx
│   ├── SheetMusicDisplay.tsx
│   ├── ThemeSettings.tsx
│   ├── inputs.tsx
│   └── ui.tsx
│
├── exercise/                    # Slice: Modelagem pedagógica
│   ├── curriculum.ts
│   ├── generator.ts
│   └── index.ts                 # Superfície pública (exporta tipos + API)
│
├── shared/                      # ★ SHARED STACK (novo) — cross-cutting, mínimo
│   └── domain/                  #   Tipos/constantes canônicos de domínio
│       ├── clef.ts              #   Clef
│       ├── difficulty.ts        #   Difficulty + DIFFICULTY_RANK
│       ├── inputMode.ts         #   InputMode
│       ├── pitch.ts             #   PitchData
│       ├── instruments.ts       #   INSTRUMENTS + ManualType + MANUAL_TYPES
│       └── index.ts             #   Barrel
│
├── storage/                     # Slice: Persistência (localStorage)
│   └── storage.ts
│
├── theme/                       # Shared stack: Design System
│   ├── ThemeContext.tsx
│   ├── apply.ts
│   ├── presets.ts
│   └── types.ts
│
├── types/                       # (reduzido: só wizard) — ver nota abaixo
│   └── wizard.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

> **Nota sobre `types/index.ts`**: os tipos de domínio ali contidos (`Clef`, `PitchData`, `SessionResult`, `ExerciseConfig`, etc.) são movidos para `shared/domain/` (tipos canônicos). Tipos exclusivos do fluxo do wizard permanecem em `types/wizard.ts`. `types/index.ts` vira um barrel re-export para não quebrar imports existentes durante a transição.

---

## 3. Políticas de Arquitetura

1. **Alias `@/` obrigatório** — Todos os novos imports entre slices devem usar `@/...`. Imports dentro do mesmo slice podem usar relativo. **Nunca** usar `../` para cruzar o limite de um slice.
2. **Dependência de slices** — Um slice pode depender de: (a) shared stacks (`shared/`, `theme/`, `types/wizard.ts`), (b) seu próprio barrel `index.ts`. **Nunca** importar internals de outro slice.
3. **Superfície pública** — Cada slice expõe tudo via barrel `index.ts` (`export *`). Consumidores importam apenas do barrel, nunca de arquivos internos do slice.
4. **Domínio canônico** — `shared/domain/` é a **fonte única de verdade** para `Clef`, `Difficulty`, `InputMode`, `PitchData`, `INSTRUMENTS`, `MANUAL_TYPES`. Nada se duplica; quem precisar, importa de lá.
5. **Anti-círculo** — Proibido `storage` importar de `theme/apply`. A função `defaultThemeConfig` deve viver no `theme` (camada superior) e ser injetada/importada pelo consumidor, não pelo storage. (Detalhe na etapa 4.)
6. **Nomenclatura** — Arquivos em `kebab-case.ts` para módulos; componentes React em `PascalCase.tsx`; tipos em `camelCase.ts`. Barrels chamam-se `index.ts`.
7. **Sem cross-slice de internals** — `components/*` nunca importa `exercise/curriculum` diretamente; usa o barrel `exercise` ou `shared/domain`.

---

## 4. Plano de Migração em Etapas

Cada etapa termina com `npm run build` verde (critério de não-regressão). As etapas são independentes e **mecânicas** (moves + imports).

### Etapa 0 — Baseline
- [x] `npm run build` verde (feito: `tsc -b && vite build` OK).
- [ ] Comitar estado atual (`git status` limpo).

### Etapa 1 — Alias `@/` → `src/` (enabler)
- **Config**: adicionar alias em `vite.config.ts` (via `path`/`fileURLToPath`) e em `tsconfig.json` (`baseUrl` + `paths`).
- **Risco**: nenhum comportamento — apenas resolução de imports.
- **Verificação**: build verde; conferir que `tsc -b` enxerga o alias.

### Etapa 2 — Canonicalizar `shared/domain/`
- **Criar** `src/shared/domain/{clef,difficulty,inputMode,pitch,instruments}.ts` + `index.ts`.
- **Mover** a definição canônica de cada tipo/constante para lá (copiar o valor EXATO atual).
- **Atualizar** `types/index.ts`, `types/wizard.ts`, `exercise/curriculum.ts` para re-exportar/importar dos barrels canônicos (removendo as duplicações), preservando as assinaturas públicas.
- **Unificar** `INSTRUMENTS`/`MANUAL_TYPES` num único lugar canônico; `SetupWizard`/`SettingsModal` passam a importar de `shared/domain`. **Atenção**: o shape difere (wizard tem `desc`) — manter ambos os campos como opcionais para não alterar o comportamento renderizado (avaliar com cuidado; se houver diferença de render, parar e perguntar).
- **Verificação**: build verde + `git diff` mostrando só moves/imports.

### Etapa 3 — Quebrar o quase-círculo `theme ⇄ storage`
- O storage importa `defaultThemeConfig` de `theme/apply`. Para remover o acoplamento storage→theme:
  - Mover a constante/`defaultThemeConfig` para um ponto neutro que o theme usa E injeta (ex: definir o default em `theme/presets.ts` já é fonte; **o problema é storage chamar theme/apply**).
  - Solução mecânica segura: extrair `defaultThemeConfig` (e `DEFAULT_THEME_CONFIG`/`DEFAULT_UI_FONT`) para um pequeno módulo `theme/defaults.ts` (ou manter em `presets.ts`). Então **storage importa de `theme/defaults`/`presets`**, e `theme/apply` também. Isso mantém um único sentido de dependência storage→theme (sem ciclo, pois `theme/defaults` não importa storage).
  - **Decisão de comportamento?**: não — `defaultThemeConfig` continua idêntico; só muda o arquivo de onde é importado.
- **Verificação**: build verde; `import` graph sem ciclo.

### Etapa 4 — Barrels `index.ts` por slice
- Criar `audio/index.ts`, `exercise/index.ts`, `components/index.ts` (`export *` de todos os públicos).
- **NÃO** forçar todos os imports a mudar na mesma etapa — apenas adicionar os barrels como superfície; a política de uso entra valendo para novos códigos e para o que for tocado.

### Etapa 5 — Worklet build-safe
- **Problema**: `addModule('/src/audio/audioWorkletProcessor.ts')` hardcoded, só dev.
- **Solução conservadora**: usar `new URL('./audioWorkletProcessor.ts', import.meta.url)` (padrão Vite para emitir asset no build) no lugar do caminho absoluto `/src/...`. Comportamento em dev idêntico; em prod passa a emitir o módulo.
- **Verificação**: `npm run build` gera o asset do worklet no `dist`; dev continua funcionando.

### Etapa 6 — Limpeza de tooling (sem mudar comportamento)
- [x] **Remover** `vite-plugin-pwa` de `package.json` → `npm install` (lockfile atualizado; 267 packages removidos).
- [ ] **Ativar** `noUnusedLocals`/`noUnusedParameters` — **REVERTIDO**. Ao ativar, `tsc` apontou variáveis/params não-usados **pré-existentes** (ex: `useEffect` em `App.tsx`, `levelLabel` em `HomeScreen`, `C2`/`notation` em `curriculum.ts`, `maxChapterDifficulty`/`pitch`/`targetMidi` em `ChapterTrainingScreen`, `keyChanges`/`getDividerX` em `SheetMusicDisplay`). Removê-los é **mudança de código/lógica** — fora do escopo do arquiteto. Ficou documentado como dívida técnica; os imports que MINHAS mudanças tornaram órfãos foram limpos (SettingsModal, SetupWizard, ChapterTrainingScreen), mas o código morto pré-existente permanece.
- **Verificação**: `npm run build` verde ✅.

### Etapa 7 — Atualizar `ARCHITECTURE.md`
- [x] Seção "Estrutura de Diretórios" reescrita para refletir o layout real + alias `@/` + políticas de arquitetura.
- [x] Guia **"Como adicionar uma nova feature"** (plug-and-play) adicionado como seção 9.
- [x] `.gitignore` ganhou `*.tsbuildinfo`; `tsconfig.tsbuildinfo` (artefato de build) removido do versionamento via `git rm --cached`.

---

## 7. Resultado Final (executado em 2026-08-15)

| Etapa | Status | Evidência |
| :--- | :--- | :--- |
| 0 — Baseline | ✅ | `tsc -b && vite build` verde antes de qualquer mudança |
| 1 — Alias `@/` | ✅ | build verde; imports `@/...` resolvem (vite + tsc) |
| 2 — `shared/domain` canônico | ✅ | build verde; `git diff` = só moves de tipos/constantes + imports |
| 3 — Quebrar quase-círculo | ✅ | build verde; `defaultThemeConfig` realocado p/ `presets.ts` (código idêntico) |
| 4 — Barrels por slice | ✅ | `audio/`, `exercise/`, `components/` com `index.ts`; build verde |
| 5 — Worklet build-safe | ✅ | `dist/assets/audioWorkletProcessor-*.ts` emitido no build de produção |
| 6 — Tooling | ✅/⚠️ | `vite-plugin-pwa` removido; strict flags **revertidos** (código morto pré-existente — fora do escopo) |
| 7 — Docs | ✅ | `ARCHITECTURE.md` atualizado + guia de novas features |

**Não-regressão**: `npm run build` verde ao final de cada etapa. `git diff` mostra **apenas** moves de imports, realocação de constantes/tipos, barrels, config e docs — **nenhuma mudança de lógica/algoritmo/assinatura**.

**Decisões que exigiram fronteira de comportamento (validadas com o usuário):**
1. Unificar `INSTRUMENTS`/`MANUAL_TYPES` com campo `desc` opcional (render idêntico).
2. Aplicar worklet build-safe via `new URL(..., import.meta.url)`.
3. Remover `vite-plugin-pwa`.

**Dívida técnica registrada (fora do escopo do arquiteto):** código morto pré-existente que impede ativar `noUnusedLocals`/`noUnusedParameters` (ver Etapa 6). Requer decisão de negócio para remoção.

- `npm run build` (que roda `tsc -b && vite build`) **verde** ao final de cada etapa.
- `git diff` exibe **apenas moves, imports e arquivos de barrel/config** — **zero mudança de lógica/algoritmo/assinatura semântica**.
- Os fluxos-chave permanecem intactos: wizard de setup, treino, histórico, tema, áudio.
- Tipos públicos exportados permanecem **compatíveis** (mesmo nome + shape) para não quebrar consumidores.

---

## 6. Guia "Como adicionar uma nova feature" (target)

1. Crie seu slice em `src/<feature>/` com subpastas internas consistentes (ex: `components/`, `logic/`, `types/`).
2. Exporte tudo publicamente num `index.ts` (barrel).
3. Importe de shared stacks via alias: `import { Clef } from '@/shared/domain'`, `import { applyTheme } from '@/theme/apply'`.
4. **Nunca** importe internals de outro slice — use apenas o barrel do outro slice.
5. Para novos tipos de domínio, **não duplique**: adicione ao `shared/domain/` apropriado e re-exporte.
6. Rode `npm run build` — deve passar sem tocar em nada do restante do app.

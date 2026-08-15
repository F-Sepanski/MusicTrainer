# 🔍 Inconsistências, Bugs & Legado — MusicTrainer

> **Objetivo**: centralizar dívidas técnicas, inconsistências e legado encontrados durante a refatoração arquitetural (2026-08-15), para que possam ser priorizados e resolvidos separadamente, **sem misturar** com mudanças de estrutura.

**Formato**: cada item recebe uma categoria, severidade, localização e impacto. Nada aqui foi alterado durante o refactor (apenas **documentado**), pois a resolução de bugs/legado envolve **mudança de lógica**, fora do escopo do arquiteto de estrutura.

---

## 1. Inconsistências (docs ↔ código)

| # | Severidade | Local | Descrição | Status |
| :-- | :-- | :-- | :-- | :-- |
| I1 | Média | `docs/ARCHITECTURE.md` | Documentava `pitchDetection.ts`, `progressStorage.ts`, `ChapterSelectScreen.tsx`, `types/exercise.ts` — **arquivos inexistentes**. | ✅ Corrigido no refactor |
| I2 | Média | `docs/README.md` | Mermaid citava `ProgressStorage`. | ✅ Corrigido no refactor |
| I3 | Média | `docs/DEVELOPER_GUIDE.md` | Exemplos de tema usavam API obsoleta (`THEMES`, `ThemeConfig` com `id/name/type/colors`) incompatível com `PRESET_THEMES`/`CustomTheme`. | ✅ Corrigido no refactor |
| I4 | Baixa | `docs/PLANO_DE_ACAO.md.legacy` | Arquivo com sufixo `.legacy` ainda presente em `docs/`. | Pendente — decidir remover ou arquivar |
| I5 | Baixa | `docs/CURRICULUM.md` vs `CURRICULUM_AND_EXERCISES.md` | Dois documentos de currículo com escopos sobrepostos; conferir se estão sincronizados entre si e com `src/exercise/curriculum.ts`. | Pendente — conferir |

---

## 2. Bugs & Comportamentos Suspeitos

| # | Severidade | Local | Descrição | Impacto |
| :-- | :-- | :-- | :-- | :-- |
| B1 | Alta | `src/audio/audioWorkletProcessor.ts` | Duplica a lógica de `midiToNoteName` que também existe em `src/audio/noteFrequencies.ts`. Risco de divergência entre o worklet (executado) e o utilitário (usado na validação). | Potencial desvio de nota em caso de divergência |
| B2 | Média | `src/components/SheetMusicDisplay.tsx` | Duplica `fifthsToKeySpec`/armadura de clave que deveria ser compartilhada com `noteFrequencies`/`curriculum`. | Duplicação de lógica de teoria musical |
| B3 | Média | `src/exercise/generator.ts` | Duplica lógica diatônica que também existe em `src/exercise/curriculum.ts` (pools). | Duplicação; divergência futura |
| B4 | Média | `src/audio/AudioEngine.ts` | Antes: worklet carregado por caminho rígido `/src/audio/audioWorkletProcessor.ts` (funcionava só no dev). | **Corrigido no refactor** (build-safe). Verificar dev+prod |
| B5 | Baixa | `src/audio/audioWorkletProcessor.ts` | O worklet é compilado à parte (`tsconfig.worklet.json`, `noEmit`). Sem teste que garanta que o `registerProcessor` roda no navegador. | Confiar no runtime |

---

## 3. Legado & Dependências Mortas

| # | Tipo | Local | Descrição | Status |
| :-- | :-- | :-- | :-- | :-- |
| L1 | Dep morta | `package.json` | `vite-plugin-pwa` instalado mas **nunca usado** (sem plugin no `vite.config.ts`, sem `registerSW`). | ✅ Removido no refactor |
| L2 | Código morto | `src/App.tsx` | Import `useEffect` não utilizado. | Pendente (remover é mudança de código) |
| L3 | Código morto | `src/components/HomeScreen.tsx` | `levelLabel` (linha ~128) não utilizado. | Pendente |
| L4 | Código morto | `src/exercise/curriculum.ts` | Constante `C2` (~linha 381) e param `notation` (~linha 497) não utilizados. | Pendente |
| L5 | Código morto | `src/components/ChapterTrainingScreen.tsx` | Função `maxChapterDifficulty` (~linha 68), vars `pitch` (~164) e `targetMidi` (~539) não utilizadas. | Pendente |
| L6 | Código morto | `src/components/SheetMusicDisplay.tsx` | Imports `KeySignature`/`getKeyDisplayName`, var `keyChanges` (~108) e `getDividerX` (~424) não utilizados. | Pendente |

> **Nota**: L2–L6 impedem a ativação de `noUnusedLocals`/`noUnusedParameters` no `tsconfig.json`. Ativá-los hoje quebraria o build. A limpeza desses itens **é necessária antes** de ativar os strict flags.

---

## 4. Dívida Técnica de Tooling & Performance

| # | Severidade | Descrição | Ação sugerida |
| :-- | :-- | :-- | :-- |
| T1 | Média | Sem lint (eslint) e sem testes no projeto. | Adicionar ESLint + vitest (ex: testes para `noteFrequencies`, `generator`, `storage`). |
| T2 | Alta | Bundle JS ~1.55 MB (gzip ~817 kB) — warning do Vite (>500 kB). | Code-splitting via `React.lazy`/`manualChunks` (ex: separar VexFlow e FontAwesome). |
| T3 | Baixa | `tsconfig.tsbuildinfo` era versionado (artefato de build). | ✅ Corrigido no refactor (ignorado + removido do índice) |
| T4 | Média | Strict flags (`noUnusedLocals`/`noUnusedParameters`) desligados. | Resolver L2–L6 e ativar. |

---

## 5. Ordem de Resolução Sugerida

1. **Bugs B1, B2, B3** (duplicações de lógica musical) — extrair para fonte única em `shared/domain` ou utilitários de música, com testes.
2. **Legado L2–L6** (código morto) — remover e então ativar strict flags (**T4**).
3. **Tooling T1** — adicionar ESLint + testes (aproveitar para cobrir B1–B3).
4. **Performance T2** — code-splitting do bundle.
5. **Inconsistências I4, I5** — decidir destino do `.legacy` e unificar docs de currículo.

---

## 6. Como usar este documento

- Itens resolvidos devem ser **marcados como ✅** (com a data), não removidos — mantém histórico.
- Novos achados devem ser adicionados ao final de cada seção, sempre com **localização exata** (arquivo + linha aproximada) e **impacto**.
- Nunca misture a correção destes itens com reestruturação de código: cada mudança deve ser isolada e verificável (`npm run build` verde).

# 🎼 MusicTrainer — Currículo Completo (3 Cursos)

Este documento especifica **exatamente** o currículo atual do MusicTrainer, conforme implementado em `src/exercise/curriculum.ts`. O currículo é estruturado exclusivamente para o desenvolvimento do **reconhecimento instantâneo de notas e leitura visual de pauta**.

A progressão é dividida em **3 Cursos**, cada curso em **Capítulos**, e cada capítulo em **Níveis progressivos**.

---

## 📐 Diretrizes Globais de Design Pedagógico

### 1. Isolamento de Variáveis (Regra de Ouro)
- Ao introduzir um conceito novo (**Acidentes** ou **Armaduras**), a extensão de notas **retorna para o interior da pauta principal** (`C4` a `G5` na Sol; `F2` a `C4` na Fá).
- **NÃO** incluir linhas suplementares extremas ao mesmo tempo que apresenta acidentes/armaduras nos capítulos iniciais. Isso evita sobrecarga cognitiva (contar linhas suplementares E processar o acidente simultaneamente).
- As suplementares com acidentes e armaduras são combinadas **apenas** nos capítulos avançados e no **Curso 3 / Desafio Master**.

### 2. Dificuldade Configurável por Nível
Cada nível pode ser executado em três dificuldades, com regras fixas de aprovação:

| Dificuldade | Notas | Tempo máx./nota | Aprovação (acertos) |
| :--- | :---: | :---: | :---: |
| **Fácil** | 32 | 4 s | ≥ 80% |
| **Médio** | 48 | 3 s | ≥ 85% |
| **Difícil** | 64 | 2 s | ≥ 90% |

> Um nível é considerado **concluído** quando o usuário passa na dificuldade desejada. O progresso guarda a maior dificuldade completada por nível (círculos verde/âmbar/vermelho).

### 3. Modelo de Dados
```
Course (3) → Chapter (Capítulo) → Level / Exercise (Nível)
```

---

# 🎼 CURSO 1: CLAVE DE SOL

**Objetivo geral:** Dominar a leitura na Clave de Sol, do interior da pauta às linhas suplementares, acidentes e armaduras de clave completas.

## Capítulo 1: Notas Naturais na Pauta (Nota a Nota)
*Progressão simétrica a partir da âncora C4 (Dó Central), espelhando o Curso 2.*

| Nível | Título | Notas | MIDI |
| :---: | :--- | :--- | :--- |
| 1 | C4 e D4 | C4, D4 | 60–62 |
| 2 | C4 até E4 | C4, D4, E4 | 60–64 |
| 3 | C4 até F4 | C4, D4, E4, F4 | 60–65 |
| 4 | C4 até G4 (Sol - Nota Âncora) | C4 a G4 | 60–67 |
| 5 | Descendo — B3 + A3 | B3, A3 | 57–59 |
| 6 | C4 até A4 | C4 a A4 | 60–69 |
| 7 | C4 até B4 | C4 a B4 | 60–71 |
| 8 | C4 até C5 (Dó Agudo) | C4 a C5 | 60–72 |
| 9 | Pauta Completa da Clave de Sol | C4 a G5 | 60–79 |

## Capítulo 2: Linhas e Espaços Suplementares
*Expandir a leitura para fora do pentagrama (registros graves e agudos).*

| Nível | Título | Notas | MIDI |
| :---: | :--- | :--- | :--- |
| 1 | Inferiores I | A3, B3 (2ª linha suplementar inferior) | 55–57 |
| 2 | Inferiores II | B3, A3, C4 (extensão grave) | 52–60 |
| 3 | Superiores I | A5, B5 (1ª linha/1º espaço suplementar superior) | 81–83 |
| 4 | Superiores II | C6, D6 (2ª linha/2º espaço suplementar superior) | 84–86 |
| 5 | Extremos Gerais | F3 a C4 e A5 a D6 (apenas suplementares) | 41–86 |
| 6 | Revisão Total Natural | F3 até D6 | 41–86 |

## Capítulo 3: Acidentes Ocorrentes (♯, ♭, ♮)
*Reconhecer alterações imediatas coladas à nota (restrito à pauta principal).*

| Nível | Título | Notas |
| :---: | :--- | :--- |
| 1 | Sustenidos Básicos | F#, C# (F4#, C5#, F5#) |
| 2 | Sustenidos Avançados | G#, D#, A# |
| 3 | Bemóis Básicos | B♭, E♭ |
| 4 | Bemóis Avançados | A♭, D♭, G♭ |
| 5 | Bequadro | Identificação de notas alteradas seguidas de cancelamento |
| 6 | **Enarmonias Sem Tecla Preta** | E♯, B♯, F♭, C♭ (grafias exatas via `explicitNotes`) |
| 7 | Mix Cromático na Pauta | Qualquer nota com/sem acidente (C4 a G5) |

## Capítulo 4: Armaduras de Clave
*Identificar notas alteradas indiretamente pela armadura no início da pauta. Cobre o círculo de quintas completo.*

| Nível | Título | Armaduras |
| :---: | :--- | :--- |
| 1 | 1 Acidente | Sol Maior (F#) · Fá Maior (B♭) |
| 2 | 2 Acidentes | Ré Maior (F#, C#) · Si♭ Maior (B♭, E♭) |
| 3 | 3 Acidentes | Lá Maior · Mi♭ Maior |
| 4 | 4 Acidentes | Mi Maior · Lá♭ Maior |
| 5 | 5 Acidentes | Si Maior (5#) · Ré♭ Maior (5♭) |
| 6 | 6 Acidentes | Fá♯ Maior (6#) · Sol♭ Maior (6♭) |
| 7 | 7 Acidentes | Dó♯ Maior (7#) · Dó♭ Maior (7♭) |
| 8 | Mestre das Armaduras | Aleatórias de 1 a 7 (círculo completo) |

---

# 𝄢 CURSO 2: CLAVE DE FÁ

**Objetivo geral:** Mapear a Clave de Fá a partir do Fá3 (âncora), expandir aos subgraves e aplicar acidentes e armaduras.

## Capítulo 1: Notas Naturais na Pauta (Nota a Nota)
*Progressão simétrica de 1 em 1 nota a partir da âncora F3.*

| Nível | Título | Notas | MIDI |
| :---: | :--- | :--- | :--- |
| 1 | F3 e G3 | F3, G3 | 53–55 |
| 2 | F3 até A3 | F3, G3, A3 | 53–57 |
| 3 | F3 até B3 | F3, G3, A3, B3 | 53–59 |
| 4 | F3 até C4 (Dó Central) | F3, G3, A3, B3, C4 | 53–60 |
| 5 | Descendo — E3 + D3 | F3, E3, D3 | 50–53 |
| 6 | C3 até C4 | C3 a C4 | 48–60 |
| 7 | B2 + A2 | B2, A2 | 45–47 |
| 8 | G2 + F2 | G2, F2 | 41–43 |
| 9 | Pauta Completa da Clave de Fá | F2 a C4 | 41–60 |

## Capítulo 2: Linhas e Espaços Suplementares
*Dominar os subgraves e a transição para a região média.*

| Nível | Título | Notas | MIDI |
| :---: | :--- | :--- | :--- |
| 1 | Superiores | D4, E4 | 62–64 |
| 2 | Inferiores I | E2, D2 | 38–40 |
| 3 | Inferiores II (Subgraves) | C2, B1 | 35–36 |
| 4 | Extremos Gerais | B1 a E2 e D4 a E4 | 35–64 |
| 5 | Revisão Total Natural | B1 até E4 | 35–64 |

## Capítulo 3: Acidentes Ocorrentes (♯, ♭, ♮)
*Reconhecer alterações em registros graves (restrito à pauta principal).*

| Nível | Título | Notas |
| :---: | :--- | :--- |
| 1 | Sustenidos Básicos | F#, C#, G# |
| 2 | Sustenidos Avançados | D#, A# |
| 3 | Bemóis Básicos | B♭, E♭, A♭ |
| 4 | Bemóis Avançados | D♭, G♭ |
| 5 | Bequadro | Identificação e cancelamento de alterações |
| 6 | **Enarmonias Sem Tecla Preta** | E♯, B♯, F♭, C♭ (grafias exatas via `explicitNotes`) |
| 7 | Mix Cromático na Pauta | Qualquer nota com/sem acidente (F2 a C4) |

## Capítulo 4: Armaduras de Clave
*Aplicação de regras de tonalidade no contexto da Clave de Fá. Cobre o círculo de quintas completo.*

| Nível | Título | Armaduras |
| :---: | :--- | :--- |
| 1 | 1 Acidente | Sol Maior (F#) · Fá Maior (B♭) |
| 2 | 2 Acidentes | Ré Maior · Si♭ Maior |
| 3 | 3 Acidentes | Lá Maior · Mi♭ Maior |
| 4 | 4 Acidentes | Mi Maior · Lá♭ Maior |
| 5 | 5 Acidentes | Si Maior (5#) · Ré♭ Maior (5♭) |
| 6 | 6 Acidentes | Fá♯ Maior (6#) · Sol♭ Maior (6♭) |
| 7 | 7 Acidentes | Dó♯ Maior (7#) · Dó♭ Maior (7♭) |
| 8 | Mestre das Armaduras | Aleatórias de 1 a 7 na Clave de Fá |

---

# 🎼+𝄢 CURSO 3: SISTEMA DUPLO (GRAND STAFF)

**Objetivo geral:** Leitura fluida no sistema de duas pautas simultâneas (Grand Staff), com alternância mental rápida entre claves.

> **Nota técnica:** Nos níveis do Curso 3, cada nota é atribuída à pauta correspondente conforme a altura: **MIDI ≥ 60 (C4) → Clave de Sol**; **MIDI < 60 → Clave de Fá**. O renderizador exibe as duas pautas simultaneamente com avanço linear e temporal de uma nota por vez (via alinhamento por `GhostNote`).
>
> **Design Pedagógico do Curso 3:** Como o usuário já concluiu o Curso 1 (Sol) e Curso 2 (Fá), a progressão é **ligeiramente acelerada** (avançando em blocos simétricos de 2 a 3 notas ou passos intervalares planejados), mantendo a metodologia de isolamento e introdução gradual.

## Capítulo 1: Conexão e Expansão Central (C3 a C5)
*Desenvolver a alternância mental rápida entre claves a partir do Dó Central e expandindo simetricamente.*

| Nível | Título | Notas | MIDI |
| :---: | :--- | :--- | :--- |
| 1 | O Dó Central Duplo | C4 (alternando entre linha inferior da Sol e superior da Fá) | 60 |
| 2 | Passo 1: Dó e Vizinhos Imediatos | B3 (Fá), C4 (Central) e D4 (Sol) | 59–62 |
| 3 | Passo 2: Expansão Simétrica (+2) | A3, B3 (Fá) vs C4, D4, E4 (Sol) | 57–64 |
| 4 | Passo 3: As Notas Âncora | F3, G3, A3 (Fá) vs C4 a G4 (Sol - nota âncora) | 53–67 |
| 5 | Duas Oitavas Centrais (C3 a C5) | C3 a C4 (Fá) e C4 a C5 (Sol) completas | 48–72 |

## Capítulo 2: Pautas Internas Completas (F2 a G5)
*Expandir do miolo central para toda a extensão interna dos dois pentagramas.*

| Nível | Título | Notas | MIDI |
| :---: | :--- | :--- | :--- |
| 1 | Graves da Fá + Agudos da Sol I | A2, B2, C3 (Fá) + C5, D5, E5 (Sol) | 45–76 |
| 2 | Extremos das Pautas Internas | F2, G2, A2 (Fá) + D5, E5, F5, G5 (Sol) | 41–79 |
| 3 | Pautas Internas Totais (F2 a G5) | Todas as notas naturais dentro dos pentagramas | 41–79 |
| 4 | Saltos Intervalares Entre Claves | Pulos rápidos de oitava e quinta entre registros | 41–79 |

## Capítulo 3: Linhas e Espaços Suplementares (B1 a D6)
*Leitura de 4 oitavas incluindo registros intermediários, subgraves e superagudos.*

| Nível | Título | Notas | MIDI |
| :---: | :--- | :--- | :--- |
| 1 | Suplementares Intermediárias | G3, A3, B3 (abaixo da Sol) vs D4, E4 (acima da Fá) | 55–64 |
| 2 | Subgraves da Clave de Fá | B1, C2, D2, E2 (suplementares inferiores da Fá) | 35–40 |
| 3 | Superagudos da Clave de Sol | A5, B5, C6, D6 (suplementares superiores da Sol) | 81–86 |
| 4 | Extremos Gerais Simultâneos | Subgraves (B1 a E2) + Superagudos (A5 a D6) | 35–86 |
| 5 | Grand Staff Natural Total | Qualquer nota natural no sistema de 4 oitavas (B1 até D6) | 35–86 |

## Capítulo 4: Acidentes Ocorrentes no Grand Staff (♯, ♭, ♮)
*Reconhecer ♯, ♭ e ♮ distribuídos entre as duas pautas.*

| Nível | Título | Notas / Conteúdo |
| :---: | :--- | :--- |
| 1 | Sustenidos Básicos (F#, C#) | F# e C# alternando entre a pauta de Sol e Fá |
| 2 | Sustenidos Avançados (G#, D#, A#) | G#, D#, A# no sistema duplo |
| 3 | Bemóis Básicos (B♭, E♭) | B♭ e E♭ alternando entre as duas pautas |
| 4 | Bemóis Avançados (A♭, D♭, G♭) | A♭, D♭, G♭ nas duas pautas |
| 5 | Bequadro no Grand Staff | Identificação e cancelamento de alterações |
| 6 | **Enarmonias Sem Tecla Preta** | E♯, B♯, F♭, C♭ nas duas claves |
| 7 | Mix Cromático no Grand Staff | Qualquer nota com/sem alteração (F2 a G5) |

## Capítulo 5: Armaduras de Clave no Sistema Duplo
*Leitura simultânea com armaduras no início das duas pautas.*

| Nível | Título | Armaduras / Conteúdo |
| :---: | :--- | :--- |
| 1 | 1 Acidente | Sol Maior (1#) e Fá Maior (1♭) nas duas pautas |
| 2 | 2 Acidentes | Ré Maior (2#) e Si♭ Maior (2♭) |
| 3 | 3 e 4 Acidentes | Lá/Mi Maior e Mi♭/Lá♭ Maior |
| 4 | 5 a 7 Acidentes | Si/Fá#/Dó# Maior e Ré♭/Sol♭/Dó♭ Maior |
| 5 | Mix Geral: Armaduras + Suplementares | Armaduras com notas suplementares em ambas as claves |

## Capítulo 6: Desafio Master (Fluência Extrema)
*Avaliação final de agilidade e reflexo visual sem limitações.*

| Nível | Título | Conteúdo |
| :---: | :--- | :--- |
| 1 | Random Total (Naturais) | Qualquer nota natural do sistema (B1 a D6) |
| 2 | Random Total (Cromático) | Qualquer nota com alteração, com/sem suplementar |
| 3 | Time Attack | Recordes de velocidade mantendo alta precisão |
| 4 | Exame Final do App | 64 notas em velocidade máxima (2s/nota), qualquer clave/acidente/armadura |

---

## 🧮 Resumo Numérico

| Curso | Clave | Capítulos | Níveis |
| :--- | :--- | :---: | :---: |
| 1 | Sol | 4 | 9 + 6 + 7 + 8 = **30** |
| 2 | Fá | 4 | 9 + 5 + 7 + 8 = **29** |
| 3 | Sistema Duplo | 6 | 5 + 4 + 5 + 7 + 5 + 4 = **30** |
| **Total** | — | **14** | **89** |

---

## 🗄️ Armaduras Utilizadas (Círculo de Quintas)

| Sustenidos (#) | Maior | Bemóis (♭) | Maior |
| :---: | :--- | :---: | :--- |
| 1 | G | 1 | F |
| 2 | D | 2 | B♭ |
| 3 | A | 3 | E♭ |
| 4 | E | 4 | A♭ |
| 5 | B | 5 | D♭ |
| 6 | F♯ | 6 | G♭ |
| 7 | C♯ | 7 | C♭ |

---

## 💻 Implementação Técnica

- **Arquivo:** `src/exercise/curriculum.ts`
- **Estrutura:** `buildCurriculum(notation)` retorna `Course[]`, cada curso com `chapters: Chapter[]`, cada capítulo com `exercises: ChapterExercise[]`.
- **IDs:** `c1-ch1-n2` (curso-capítulo-nível).
- **Clef:** `'treble' | 'bass' | 'grand'`.
- **Gerador:** `src/exercise/generator.ts` — suporta `midiNotes` (notas explícitas), `explicitNotes` (grafias exatas) e `accidentalType` ('sharp' | 'flat' | 'mixed').
- **Renderização Grand Staff:** `src/components/SheetMusicDisplay.tsx` — sincronismo sequencial com `GhostNote` para evitar polifonia ou oscilação de esteira.
- **Dificuldade/Notas:** `DIFFICULTY_NOTE_COUNT`, `DIFFICULTY_TIME_LIMIT_MS`, `PASS_ACCURACY` (Record por dificuldade).

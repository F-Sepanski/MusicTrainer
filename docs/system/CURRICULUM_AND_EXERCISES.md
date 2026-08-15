# 🎼 Modelagem do Currículo e Gerador de Exercícios

Este documento explica como a progressão pedagógica do **MusicTrainer** é modelada em código e como estender capítulos e o algoritmo de geração de notas.

> Para a **especificação completa e exata** do currículo atual (todos os cursos, capítulos e níveis), consulte o **[CURRICULUM.md](./CURRICULUM.md)**.

---

## 1. Modelo do Currículo (`src/exercise/curriculum.ts`)

O currículo é organizado em **3 Cursos**, cada um contendo **Capítulos** e cada capítulo contendo **Níveis** (exercícios):

```
Course (3) → Chapter (Capítulo) → ChapterExercise (Nível)
```

```typescript
export type Clef = 'treble' | 'bass' | 'grand';

export interface ChapterExercise {
  id: string;              // ex: 'c1-ch1-n2'
  level: number;           // número do nível (1-based)
  title: string;
  description: string;
  pool: number[];          // pitch classes (0-11) permitidas
  midiNotes?: number[];    // notas MIDI explícitas (sobrepõem pool+range)
  explicitNotes?: { midiNote: number; vfKey: string }[]; // grafias exatas (E#, Cb...)
  keyFifths: number;       // armadura (0 = Dó Maior)
  clef: Clef;
  range: { min: number; max: number };
  hasAccidentals?: boolean;
}

export interface Chapter {
  id: string;              // ex: 'c1-ch1'
  index: number;
  title: string;
  description: string;
  clef: Clef;
  range: { min: number; max: number };
  exercises: ChapterExercise[];
}

export interface Course {
  id: string;              // ex: 'c1'
  index: number;
  title: string;           // 'Curso 1'
  subtitle: string;        // 'Clave de Sol'
  chapters: Chapter[];
}
```

### Atributos Chave
- **`clef`**: `treble` (Sol), `bass` (Fá) ou `grand` (sistema duplo / Grand Staff).
- **`range`**: limites $MIDI$ das notas do capítulo/nível (ex: C4 = 60, G5 = 79).
- **`keyFifths`**: armadura pelo número de quintas, de $-7$ (Dó♭ Maior) a $+7$ (Dó♯ Maior); $0$ = Dó Maior/Lá Menor.
- **`midiNotes`**: lista explícita de notas MIDI; quando presente, o gerador amostra apenas dessas notas.
- **`explicitNotes`**: pares `{ midiNote, vfKey }` com grafia exata, necessário para **enarmonias sem tecla preta** (E♯, B♯, F♭, C♭), que a renderização padrão de nomes não produz.

---

## 2. Gerador Procedural de Notas (`src/exercise/generator.ts`)

O gerador cria uma série de notas para o nível ativo. As fontes de notas, em ordem de precedência:

1. **`explicitNotes`** — grafias exatas (enarmonias).
2. **`midiNotes`** — notas MIDI explícitas.
3. **`pool` + `range`** — sorteio aleatório de um MIDI no intervalo cujo pitch class esteja no pool.

```typescript
export function generateExercise(config: GeneratedExercise): ExerciseNote[]

export function configFromExercise(
  exercise: {
    pool: number[];
    midiNotes?: number[];
    explicitNotes?: { midiNote: number; vfKey: string }[];
    keyFifths?: number;
    clef: Clef;
    range: { min: number; max: number };
  },
  extra?: Partial<GeneratedExercise>
): GeneratedExercise
```

### Grand Staff
No modo `grand`, cada nota é atribuída a uma pauta pela altura:
- **MIDI ≥ 60 (C4)** → Clave de Sol.
- **MIDI < 60** → Clave de Fá.

---

## 3. Dificuldade e Aprovação

Cada nível pode ser executado nas três dificuldades, com regras fixas:

```typescript
export const DIFFICULTY_NOTE_COUNT = { easy: 32, medium: 48, hard: 64 };
export const DIFFICULTY_TIME_LIMIT_MS = { easy: 4000, medium: 3000, hard: 2000 };
export const PASS_ACCURACY = { easy: 80, medium: 85, hard: 90 };
```

> Um nível é aprovado quando a **precisão ≥ limite da dificuldade** **E** o **tempo médio/nota ≤ limite da dificuldade**.

---

## 4. Como Adicionar um Novo Nível ou Capítulo

1. Abra `src/exercise/curriculum.ts`.
2. Localize a função de construção do curso desejado (`buildCourse1Treble`, `buildCourse2Bass` ou `buildCourse3Grand`).
3. Adicione um nível ao `exercises` do capítulo (ou um capítulo novo com `chapters.push`):

```typescript
{
  id: 'c1-ch1-n10',
  level: 10,
  title: 'Nota Extra',
  description: 'Descrição do nível.',
  pool: [0, 2, 4, 5, 7, 9, 11],
  midiNotes: [60, 62, 64],   // opcional: notas explícitas
  keyFifths: 0,
  clef: 'treble',
  range: { min: 60, max: 64 },
}
```

4. Se o nível usa **enarmonias** (grafia exata), use `explicitNotes`:
```typescript
explicitNotes: [
  { midiNote: 65, vfKey: 'e#/4' }, // E#4 = F4
  { midiNote: 59, vfKey: 'cb/4' }, // Cb4 = B3
]
```

5. O sistema registra automaticamente o nível/capítulo na interface de treino e no armazenamento local de progresso.

> ⚠️ **Importante:** ao alterar a estrutura do currículo (IDs de níveis/capítulos), **incremente a constante `CURRICULUM_VERSION`** em `src/storage/storage.ts` para resetar o progresso salvo antigo e evitar IDs obsoletos.

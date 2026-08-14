# 🎼 Estrutura do Currículo e Gerador de Exercícios

Este documento explica como a progressão pedagógica do **MusicTrainer** é modelada e como estender capítulos e algoritmos de geração de notas.

---

## 1. Modelo de Capítulos (`src/exercise/curriculum.ts`)

O currículo é dividido em capítulos progressivos, indexados por nível de dificuldade (`beginner`, `learner`, `intermediate`, `experienced`, `professional`):

```typescript
export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  level: Level;
  clef: 'treble' | 'bass';
  range: { min: number; max: number };
  keySignature: { fifths: number; name: string };
  exercises: ExerciseDefinition[];
}
```

### Atributos Chave:
- **`clef`**: Define se o capítulo utiliza a Clave de Sol (`treble`) ou Clave de Fá (`bass`).
- **`range`**: Limites $MIDI$ mínimo e máximo das notas geradas no capítulo (ex: C4=60 a G4=67).
- **`keySignature`**: Armadura de clave definida pelo número de quintas (`fifths`: de $-7$ para Dó♭ Maior a $+7$ para Dó♯ Maior, sendo $0$ para Dó Maior / Lá Menor).

---

## 2. Gerador Procedural de Notas (`src/exercise/generator.ts`)

O gerador cria séries de notas adaptadas para o exercício ativo com as seguintes propriedades:
1. **Conformidade com a Escala**: Gera apenas notas pertencentes à armadura de clave ativa ou aos acidentes específicos configurados.
2. **Controle de Saltos Intervalares**: Pondera a probabilidade para privilegiar movimentos conjuntos (graus conjuntos) e saltos melódicos naturais (terças e quartas), evitando saltos extremos consecutivos.
3. **Alternância e Não-Repetição**: Evita a repetição consecutiva da mesma nota mais de 2 vezes.

```typescript
// Exemplo de configuração de geração
const config: ExerciseConfig = {
  chapterId: 1,
  clef: 'treble',
  range: { min: 60, max: 72 },
  allowedNotes: [60, 62, 64, 65, 67, 69, 71, 72],
  noteCount: 12,
  keyFifths: 0,
};

const generatedExercise = generateExercise(config);
```

---

## 3. Como Adicionar um Novo Capítulo

Para adicionar um novo capítulo à progressão:

1. Abra `src/exercise/curriculum.ts`.
2. Adicione um novo objeto `Chapter` ao array `CHAPTERS`:

```typescript
{
  id: 9,
  title: 'Capítulo 9: Escala Pentatônica e Blues',
  subtitle: 'Treino com Blue Notes e síncopes',
  description: 'Leitura melódica na Clave de Sol com foco em C e F#.',
  level: 'intermediate',
  clef: 'treble',
  range: { min: 60, max: 77 },
  keySignature: { fifths: 0, name: 'C Maior' },
  exercises: [
    {
      id: '9-1',
      title: 'Pentatônica Básica',
      description: 'Notas da escala pentatônica maior.',
      clef: 'treble',
      notePool: [60, 62, 64, 67, 69, 72],
      keyFifths: 0,
    },
  ],
}
```

3. O sistema registrará automaticamente o capítulo na tela de seleção (`ChapterSelectScreen.tsx`) e integrará seu progresso no armazenamento local.

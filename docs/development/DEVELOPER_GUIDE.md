# 🛠️ Guia do Desenvolvedor & Extensibilidade (DEVELOPER GUIDE)

Este guia prático ensina como configurar, executar e estender o **MusicTrainer**.

> **Leia primeiro**: [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (arquitetura + **políticas de estrutura**), [GUIDELINES.md](./GUIDELINES.md) (padrões de código/design).

---

## 1. Instalação e Execução Local

### Pré-requisitos
- **Node.js**: Versão 18.0 ou superior
- **NPM**: Versão 9.0 ou superior
- **Navegador**: Chrome, Edge, Firefox ou Safari recente (com suporte à Web Audio API e ResizeObserver)

### Comandos Principais

```bash
# 1. Instalar dependências
npm install

# 2. Executar o servidor de desenvolvimento local (Vite)
npm run dev

# 3. Executar o build de produção e checagem de tipos TypeScript
npm run build

# 4. Pré-visualizar o build de produção localmente
npm run preview
```

> **Alias de caminho**: `@/` resolve para `src/` (configurado em `vite.config.ts` e `tsconfig.json`). Imports entre slices usam `@/...`.

---

## 2. Arquitetura & Como Adicionar uma Nova Feature

### 2.1. Layout de Slices

```
src/
├── audio/       # Motor de áudio (barrel: index.ts)
├── components/  # Telas & widgets (barrel: index.ts)
├── exercise/    # Currículo & gerador (barrel: index.ts)
├── shared/      # ★ Shared stack — domínio canônico (shared/domain/)
├── storage/     # Persistência localStorage
├── theme/       # Design System
└── types/       # Tipos de fluxo (wizard)
```

### 2.2. Passo a passo — Adicionar uma feature

1. Crie um slice em `src/<feature>/` com subpastas internas consistentes (`components/`, `logic/`, `types/`).
2. Exporte a superfície pública num `index.ts` (barrel) com `export *`.
3. Importe de shared stacks via alias: `import { Clef } from '@/shared/domain'`.
4. **Nunca** importe internals de outro slice — use apenas o barrel (`@/audio`, `@/exercise`, `@/components`).
5. Novos tipos de domínio vão em `src/shared/domain/` (não duplique) e são re-exportados.
6. Rode `npm run build` — deve passar sem tocar no restante do app.

> **Regra**: se precisar de persistência, use as funções de `@/storage`, nunca `localStorage` direto.

---

## 3. Como Adicionar um Novo Tema Visual

Os temas são presets em `src/theme/presets.ts` (tipo `CustomTheme`, veja `src/theme/types.ts`).

1. Abra `src/theme/presets.ts`.
2. Adicione seu preset ao objeto `PRESET_THEMES`:
   ```typescript
   export const PRESET_THEMES: Record<ThemePreset, CustomTheme> = {
     // ... presets existentes ...
     'cyberpunk': {
       mode: 'dark',
       accent: '#f72585',
       accentSecondary: '#4cc9f0',
       bg: { base: '#0a0a12', elevated: '#161626', subtle: '#22223b', muted: '#4a4e69' },
       text: { primary: '#f8f9fa', secondary: '#4cc9f0', muted: '#9aa0b0' },
       border: '#f72585',
     },
   };
   ```
3. Registre o novo id no union `ThemePreset` em `src/theme/types.ts`:
   ```typescript
   export type ThemePreset = /* ... */ | 'cyberpunk';
   ```
4. (Opcional) Adicione um rótulo em `PRESET_NAMES` e inclua em `PRESET_LIST` em `presets.ts`.
5. O tema ficará disponível no `ThemeSettings` e no modal de configurações.

> **Nota**: cada preset pode ter variantes light/dark quando aplicável. O tema custom (acento/modo do usuário) é tratado em `theme/apply.ts` (`buildCustomTheme`).

---

## 4. Como Adicionar um Novo Instrumento Manual (ex: Contrabaixo / Ukulele)

### 4.1. Registrar o tipo canônico
O tipo `ManualType` vive em **`src/shared/domain/manualType.ts`** (fonte única):
```typescript
export type ManualType = 'guitar' | 'piano' | 'circle' | 'bass' | 'ukulele';
```
Ele é re-exportado por `src/types/wizard.ts` e pelo barrel `@/shared/domain`.

### 4.2. Registrar na lista de opções
Em **`src/shared/domain/instruments.ts`**, adicione a entrada em `MANUAL_TYPES`:
```typescript
export const MANUAL_TYPES: ManualOption[] = [
  // ... existentes ...
  { type: 'bass', label: 'Contrabaixo', icon: 'guitar', desc: 'Clique nas casas' },
];
```

### 4.3. Criar o componente visual
Em `src/components/inputs.tsx`, crie o componente:
```tsx
export function BassFretboard({ onNote, showLabels, notation }: NoteInputProps) {
  const BASS_STRINGS = [28, 33, 38, 43]; // E1, A1, D2, G2
  // Renderize as 4 cordas e as casas desejadas...
}
```

### 4.4. Registrar no wrapper `AdaptedInstrumentInput`
Em `src/components/inputs.tsx`:
```tsx
switch (manualType) {
  case 'guitar': return <GuitarFretboard {...rest} />;
  case 'piano': return <PianoKeyboard {...rest} />;
  case 'circle': return <CircleOfFifths {...rest} />;
  case 'bass': return <BassFretboard {...rest} />;
}
```

### 4.5. Configurar a regra de oitava automática
Em `src/components/ChapterTrainingScreen.tsx`:
```typescript
const effectiveOctaveShift = inputMode === 'manual'
  ? (wizardConfig.manualType === 'guitar' ? -1 : wizardConfig.manualType === 'bass' ? -2 : 0)
  : (wizardConfig.octaveShift ?? 0);
```

---

## 5. Como Adicionar um Novo Ícone

1. Adicione o literal ao union `IconName` em **`src/shared/domain/iconName.ts`** (fonte única).
2. Adicione o mapeamento `faXxx` em `ICONS` em **`src/components/Icon.tsx`**.
3. Use `<Icon name="meu-icone" />` em qualquer componente.

> O `IconName` é re-exportado por `@/shared/domain`; os componentes continuam importando de `./Icon`.

---

## 6. Integração com WebMIDI API (Próximos Passos)

Para adicionar suporte a teclados e controladores MIDI físicos via USB/Bluetooth:

```typescript
// Exemplo de hook para WebMIDI
if (navigator.requestMIDIAccess) {
  const midiAccess = await navigator.requestMIDIAccess();
  for (const input of midiAccess.inputs.values()) {
    input.onmidimessage = (event) => {
      const [status, noteNumber, velocity] = event.data;
      if (status === 144 && velocity > 0) { // Note On
        handleManualNote(noteNumber);
      }
    };
  }
}
```
Isso permite plugar qualquer teclado musical USB diretamente no navegador sem drivers adicionais.

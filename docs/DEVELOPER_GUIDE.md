# 🛠️ Guia do Desenvolvedor & Extensibilidade (DEVELOPER GUIDE)

Este guia prático ensina como configurar, executar, testar e estender o **MusicTrainer**.

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

---

## 2. Como Adicionar um Novo Tema Visual

Os temas visuais são definidos em `src/theme/presets.ts`. Cada tema define superfícies, bordas, textos e acentos cromáticos:

1. Abra `src/theme/presets.ts`.
2. Adicione seu novo tema à lista `THEMES`:

```typescript
export const CyberpunkTheme: ThemeConfig = {
  id: 'cyberpunk',
  name: 'Cyberpunk 2077',
  type: 'dark',
  colors: {
    bg: { base: '#0a0a12', elevated: '#161626', subtle: '#22223b', muted: '#4a4e69' },
    border: '#f72585',
    text: { primary: '#f8f9fa', secondary: '#4cc9f0', muted: '#7209b7' },
    accentPrimary: '#f72585',
    accentSecondary: '#4cc9f0',
  },
};
```

3. O tema ficará imediatamente disponível no `ThemeSettings.tsx` e no modal de configurações.

---

## 3. Como Adicionar um Novo Instrumento Manual (ex: Contrabaixo / Ukulele)

Para adicionar um novo instrumento interativo:

1. Em `src/types/wizard.ts`, adicione o novo identificador ao tipo `ManualType`:
   ```typescript
   export type ManualType = 'guitar' | 'piano' | 'circle' | 'bass' | 'ukulele';
   ```

2. Em `src/components/inputs.tsx`, crie o componente visual:
   ```tsx
   export function BassFretboard({ onNote, showLabels, notation }: NoteInputProps) {
     const BASS_STRINGS = [28, 33, 38, 43]; // E1, A1, D2, G2
     // Renderize as 4 cordas e as casas desejadas...
   }
   ```

3. Registre no wrapper `AdaptedInstrumentInput` em `src/components/inputs.tsx`:
   ```tsx
   export function AdaptedInstrumentInput({ manualType, ...rest }: AdaptedInputProps) {
     switch (manualType) {
       case 'guitar': return <GuitarFretboard {...rest} />;
       case 'piano': return <PianoKeyboard {...rest} />;
       case 'circle': return <CircleOfFifths {...rest} />;
       case 'bass': return <BassFretboard {...rest} />;
     }
   }
   ```

4. Em `ChapterTrainingScreen.tsx`, configure a regra de oitava automática para o novo instrumento:
   ```typescript
   const effectiveOctaveShift = inputMode === 'manual'
     ? (wizardConfig.manualType === 'guitar' ? -1 : wizardConfig.manualType === 'bass' ? -2 : 0)
     : (wizardConfig.octaveShift ?? 0);
   ```

---

## 4. Integração com WebMIDI API (Próximos Passos)

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

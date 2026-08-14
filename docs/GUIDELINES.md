# 📐 Diretrizes de Desenvolvimento, Padrões e Boas Práticas (GUIDELINES)

Este guia define as regras de engenharia de software, padrões de design visual e especificações de tipografia musical para manter a consistência e a alta performance do **MusicTrainer**.

---

## 1. Padrões de Código & Arquitetura React

### 1.1. TypeScript Estrito & Tipagem Explícita
- **Zero `any`**: Todas as interfaces, callbacks, eventos e payloads devem ter tipos estritos definidos em `src/types/`.
- **Valores Numéricos Musicais**: Sempre utilize $MIDI$ integers (0–127), Pitch Classes (0–11) e frequências em Hz ($f \in \mathbb{R}^+$).

### 1.2. Gerenciamento de Estado & Prevenção de Re-renders
- **Evitar State Loops em Altas Frequências**: Não utilize `useState` para contadores de animação de alta frequência (ex: barras de progresso temporizadas). Utilize animações baseadas em CSS (como `@keyframes shrinkWidth`) combinadas com `setTimeout` único.
- **Refs para Listeners Assíncronos**: Em ouvintes de teclado (`keydown`) e callbacks de áudio contínuos (`onPitch`), utilize `useRef` para capturar referências ativas (`phaseRef`, `notesRef`, `currentNoteIndexRef`, `lastOctaveRef`) sem disparar re-inscrições de hooks a cada ciclo.

---

## 2. Padrões de Design Visual & UI/UX

### 2.1. Tokens Semânticos de Variáveis CSS
Todos os componentes devem consumir variáveis de cor e espaçamento do Design System:
- **Superfícies**: `var(--bg-base)`, `var(--bg-elevated)`, `var(--bg-subtle)`
- **Bordas**: `var(--border)`
- **Tipografia**: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- **Acentos**: `var(--accent-primary)`, `var(--accent-secondary)`
- **Métricas de Pauta**: `var(--staff-line)`, `var(--note-default)`, `var(--note-correct)`, `var(--note-incorrect)`

### 2.2. Regras Estéticas (Design Anti-Clichê)
- **Superfícies Opacas & Legíveis**: Elementos flutuantes (como o HUD Toast de digitação) devem ter fundos sólidos com alto contraste (`bg-surface-800 border-2 border-surface-600 shadow-2xl`), sem efeito translúcido excessivo que prejudique a leitura sobre as cordas ou teclas.
- **Micro-animações Funcionais**: Animações devem servir para feedback imediato (ex: pulso verde ao acertar uma nota, escala suave ao passar o cursor sobre as teclas e casas do violão).

---

## 3. Tipografia Musical & Glifos Vetoriais (SMuFL / Canonical MDI)

### 3.1. Glifos Vetoriais com Caixa Delimitadora Ajustada
Para evitar espaços transparentes indesejados ao redor dos acidentes, os componentes `<SharpGlyph />`, `<FlatGlyph />` e `<NaturalGlyph />` utilizam `viewBox` recortado para o limite exato dos traços:
- **Sustenido (`SharpGlyph`)**: `viewBox="7 5.5 10 13"`
- **Bemol (`FlatGlyph`)**: `viewBox="8.5 5 7 14"`
- **Bequadro (`NaturalGlyph`)**: `viewBox="8 3.5 8 17"`

```tsx
// Exemplo de uso
<SharpGlyph size={12} className="text-neon-cyan" />
```

### 3.2. Formatação de Rótulos de Nota (`NoteLabelDisplay`)
As notas musicais completas (ex: `C#4`, `Dó#3`, `Bb2`) utilizam uma estrutura de coluna empilhada em dois níveis com espaçamento proporcional relativo (`em`):

```
     [ ♯ / ♭ ]  <- Expoente (acidente vetorial SVG)
[ Dó ]
     [   4   ]  <- Subscrito (número da oitava)
```

- **Margem Esquerda**: `ml-[0.06em]` (escalável proporcionalmente desde fontes de 8px no violão até 32px no HUD).
- **Alinhamento Vertical**: O acidente e a oitava mantêm alinhamento vertical absoluto sem deslocar a letra da nota base para a esquerda.

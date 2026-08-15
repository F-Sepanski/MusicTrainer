# 🎮 Guia dos Modos de Entrada & Hardware (INPUT MODES)

O **MusicTrainer** oferece cinco métodos de entrada distintos e ergonomicamente otimizados para treino de percepção e leitura musical.

---

## 1. 🎤 Modo Microfone (Audio Pitch Tracking)

Permite treinar cantando ou tocando instrumentos acústicos/elétricos diretamente no microfone.

### Parâmetros Configuráveis:
- **Frequência de Referência A4**: Ajustável de 430 Hz a 450 Hz (com presets para 432 Hz, 440 Hz, 442 Hz e 443 Hz).
- **Limiar de Volume (RMS Threshold)**: Filtra ruídos ambientes indesejados.
- **Tolerância de Afinação (Cents)**: Define a margem de erro permitida em centésimos de semitom (padrão: $\pm 30$ cents).
- **Tempo de Sustentação (Note Delay)**: Tempo em que a nota precisa ser mantida com precisão antes de ser computada como correta (padrão: 250ms).
- **Transposição de Oitava (Microfone)**:
  - `-2`: 2 oitavas abaixo (-24 semitons)
  - `-1`: 1 oitava abaixo (-12 semitons · Violão e Guitarra clássica)
  - `0`: Tom real (Piano, Flauta, Voz feminina, etc.)
  - `+1`: 1 oitava acima (+12 semitons)
  - `+2`: 2 oitavas acima (+24 semitons)

---

## 2. 🎹 Modo Teclado Virtual (PianoKeyboard)

- **Alcance Efetivo**: **D3 (MIDI 50)** a **B6 (MIDI 95)**.
- **Estrutura Cromática**: 27 teclas brancas e 19 teclas pretas dispostas na geometria padrão de piano.
- **Auto-centralização**: Ao iniciar o exercício, a visão rola suavemente para centralizar o **Dó Central (C4 = MIDI 60)**.
- **Rótulos Dinâmicos**: Botão "Mostrar nomes" exibe o nome de cada nota com oitava e glifos vetoriais para sustenidos e bemóis.

---

## 3. 🎸 Modo Braço de Violão (GuitarFretboard)

- **Número de Casas**: **20 Casas** (posições 0 a 20 em todas as 6 cordas).
- **Afinação Padrão**: E2 (40), A2 (45), D3 (50), G3 (55), B3 (59), E4 (64).
- **Marcações de Madrepérola (Inlays)**:
  - Casas **3, 5, 7, 9, 15, 17 e 19**: Marcadores circulares posicionados no **centro exato entre a corda Ré (D) e Sol (G)**.
  - Casa **12**: Marcador duplo simétrico acima e abaixo do centro.
- **Transposição Automática (-1 Oitava / 8vb)**: A partitura exibe a clave de Sol com `8vb`, mapeando a posição física das cordas para a altura escrita na pauta.
- **Badges de Alto Contraste**: As notas no braço utilizam fundo sólido escuro com borda e contraste reforçado para máxima legibilidade.

---

## 4. ⭕ Modo Círculo de Notas (CircleOfFifths / Dual Ring)

- **Estrutura de Anel Duplo**:
  - **Anel Externo (Naturais)**: Dó (0°), Ré (60°), Mi (120°), Fá (150°), Sol (210°), Lá (270°), Si (330°).
  - **Anel Interno (Acidentes)**: Dó♯ (30°), Ré♯ (90°), Fá♯ (180°), Sol♯ (240°), Lá♯ (300°).
- **Intercalação Cromática**: Cada acidente fica posicionado exatamente no ângulo intermediário entre suas duas notas naturais vizinhas.
- **Avaliação por Pitch Class**: Aceita a nota tocada independentemente da oitava, ideal para treino de classes de notas.

---

## 5. ⌨️ Modo Digitação via Teclado Físico (Typing HUD)

Permite treinar com agilidade utilizando o teclado do computador:

| Tecla | Função | Exemplo |
| :--- | :--- | :--- |
| `A`, `B`, `C`, `D`, `E`, `F`, `G` | Nome da nota base | Digitar `C` seleciona Dó |
| `↑` (Seta Cima) | Aplica Sustenido (♯) | `C` + `↑` $\rightarrow$ **C♯** |
| `↓` (Seta Baixo) | Aplica Bemol (♭) | `D` + `↓` $\rightarrow$ **D♭** |
| `1` a `9` | Especifica a oitava | `C` + `4` $\rightarrow$ **C4** |
| `Espaço` | Pula a nota atual (Skip) | Avança sem pontuar |

### Recursos do HUD Flutuante:
- **Toast Flutuante Opaque**: Posicionado de forma absoluta na base da tela (`fixed bottom-6 left-1/2 -translate-x-1/2`).
- **Temporizador Suave via CSS**: Barra de contagem regressiva de 900ms acionada por animação CSS fluida.
- **Memória Contextual de Oitava (`lastOctaveRef`)**: Se o usuário digitar apenas a nota (ex: `C` ou `F#`) sem especificar o número da oitava, o sistema utiliza automaticamente a última oitava digitada ou a oitava média do capítulo.
- **Isolamento de Teclas Inválidas**: Teclas não musicais são ignoradas sem penalizar o usuário com erros acidentais.

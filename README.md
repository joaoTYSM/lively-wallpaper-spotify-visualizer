# PulseDeck — Now Playing Visualizer

Wallpaper HTML para o **Lively Wallpaper**. Exibe um espectro de áudio na parte inferior da tela e, no centro, a capa, o título e o artista da mídia atual quando o Windows disponibiliza esses metadados.

## Como funciona

O projeto usa duas funções nativas do Lively:

- `--audio` chama `livelyAudioListener(audioArray)` com 128 valores do espectro do áudio de reprodução do sistema. O visualizer usa esses valores para animar as barras. Não usa microfone.
- `--system-nowplaying` chama `livelyCurrentTrack(data)` com os dados da mídia atual do Windows, incluindo `Title`, `Artist` e `Thumbnail` em Base64 quando disponíveis.

As duas fontes são independentes. Portanto, o espectro pode reagir a jogos, vídeos, sons do navegador e outros áudios mesmo quando o aplicativo não fornece título ou capa. A identificação da música depende de o player publicar informações na sessão de mídia do Windows.

## Instalação

1. Extraia `PulseDeck-Lively.zip` ou arraste o ZIP diretamente para a janela do Lively Wallpaper.
2. Selecione **PulseDeck — Now Playing Visualizer** e aplique como wallpaper.
3. Abra **Personalizar** para ajustar cor, quantidade de barras, altura, sensibilidade e distância da taskbar.
4. Se o espectro não reagir, confira nas configurações do Lively a fonte/dispositivo de áudio do visualizer.

## Taskbar do Windows

Um wallpaper do Lively é renderizado atrás da interface do Windows; ele não consegue desenhar por cima da taskbar nativa. Por isso, o espectro fica logo acima dela. Use a opção **Distância da taskbar** para ajustar a posição conforme a altura/posição da sua barra. Em taskbar transparente, a aparência pode se misturar visualmente com ela.

## Observações

- O suporte aos dados da música depende do player e da sessão de mídia do Windows. Quando não há metadados, o visualizer continua reagindo ao áudio e mostra um aviso no cartão central.
- A capa só aparece quando o Windows fornece `Thumbnail`.
- Requer Lively Wallpaper com suporte a `--system-nowplaying` (Lively 2.0.6.0 ou superior).

## Licença

MIT.

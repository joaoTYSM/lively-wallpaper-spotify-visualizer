'use strict';

(() => {
  const canvas = document.getElementById('spectrumCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const titleEl = document.getElementById('trackTitle');
  const artistEl = document.getElementById('trackArtist');
  const artEl = document.getElementById('albumArt');
  const placeholderEl = document.getElementById('coverPlaceholder');
  const stateEl = document.getElementById('trackStatus');
  const stateDot = document.getElementById('stateDot');
  const cardEl = document.getElementById('trackCard');

  const settings = {
    accent: '#9b7cff',
    barCount: 80,
    barHeight: 150,
    sensitivity: 1.4,
    taskbarGap: 62,
    glow: true,
    showTrack: true
  };

  let spectrum = new Float32Array(128);
  let bars = new Float32Array(settings.barCount);
  let isPaused = false;
  let currentTrack = null;
  let lastAudioAt = 0;
  let lastSignalAt = 0;
  let audioLevel = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : [155, 124, 255];
  }

  function applyAccent(hex) {
    const rgb = hexToRgb(hex);
    settings.accent = hex;
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', rgb.join(', '));
  }

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, canvas.parentElement.clientWidth || window.innerWidth);
    height = Math.max(1, canvas.parentElement.clientHeight || settings.barHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setTrack(track) {
    currentTrack = track;
    if (!track) {
      titleEl.textContent = 'Aguardando reprodução';
      artistEl.textContent = 'O áudio do computador continuará reagindo';
      stateEl.textContent = 'ESPERANDO MÍDIA';
      stateDot.classList.remove('active');
      artEl.classList.remove('visible');
      artEl.removeAttribute('src');
      placeholderEl.style.display = 'grid';
      return;
    }

    titleEl.textContent = track.Title || track.DisplayName || 'Faixa sem título';
    artistEl.textContent = track.Artist || track.AlbumArtist || track.AlbumTitle || 'Artista não informado';
    stateEl.textContent = 'MÍDIA IDENTIFICADA';
    stateDot.classList.add('active');

    const thumbnail = typeof track.Thumbnail === 'string' ? track.Thumbnail.trim() : '';
    if (thumbnail) {
      const src = thumbnail.startsWith('data:image/') ? thumbnail : `data:image/png;base64,${thumbnail}`;
      artEl.onload = () => {
        artEl.classList.add('visible');
        placeholderEl.style.display = 'none';
      };
      artEl.onerror = () => {
        artEl.classList.remove('visible');
        placeholderEl.style.display = 'grid';
      };
      artEl.src = src;
    } else {
      artEl.classList.remove('visible');
      artEl.removeAttribute('src');
      placeholderEl.style.display = 'grid';
    }
  }

  // Lively calls this with a 128-value spectrum from the system's playback audio.
  // This is not microphone capture; it follows the audio source selected in Lively.
  window.livelyAudioListener = function (audioArray) {
    if (!audioArray || typeof audioArray.length !== 'number') return;
    const len = Math.min(spectrum.length, audioArray.length);
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const value = Number.isFinite(Number(audioArray[i])) ? Math.abs(Number(audioArray[i])) : 0;
      spectrum[i] = clamp(value, 0, 4);
      sum += value * value;
      if (value > peak) peak = value;
    }
    for (let i = len; i < spectrum.length; i++) spectrum[i] = 0;
    audioLevel = Math.sqrt(sum / Math.max(1, len));
    lastAudioAt = performance.now();

    // Keep the metadata card useful even when a player exposes no track details.
    if (peak > 0.001) lastSignalAt = lastAudioAt;
    if (!currentTrack && peak > 0.001) {
      stateEl.textContent = 'ÁUDIO DO SISTEMA DETECTADO';
      stateDot.classList.add('active');
      titleEl.textContent = 'Áudio do sistema';
      artistEl.textContent = 'Este aplicativo não enviou os dados da música';
    } else if (!currentTrack && lastAudioAt - lastSignalAt > 1200) {
      stateEl.textContent = 'ESPERANDO MÍDIA';
      stateDot.classList.remove('active');
      titleEl.textContent = 'Aguardando reprodução';
      artistEl.textContent = 'O áudio do computador aparecerá aqui';
    }
  };

  // Lively supplies title, artist and (when available) artwork from Windows Now Playing.
  window.livelyCurrentTrack = function (data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      setTrack(parsed && typeof parsed === 'object' ? parsed : null);
    } catch (error) {
      console.warn('PulseDeck: não foi possível interpretar os dados da faixa.', error);
      setTrack(null);
    }
  };

  window.livelyWallpaperPlaybackChanged = function (data) {
    try {
      const status = typeof data === 'string' ? JSON.parse(data) : data;
      isPaused = !!(status && status.IsPaused);
    } catch (_) {
      isPaused = false;
    }
  };

  window.livelyPropertyListener = function (name, value) {
    switch (name) {
      case 'accentColor':
        applyAccent(value);
        break;
      case 'barCount': {
        const options = [48, 64, 80, 96];
        settings.barCount = options[clamp(Number(value) || 0, 0, options.length - 1)];
        bars = new Float32Array(settings.barCount);
        break;
      }
      case 'barHeight':
        settings.barHeight = clamp(Number(value) || 150, 40, 300);
        document.documentElement.style.setProperty('--bar-height', `${settings.barHeight}px`);
        resizeCanvas();
        break;
      case 'sensitivity':
        settings.sensitivity = clamp(Number(value) || 140, 20, 500) / 100;
        break;
      case 'taskbarGap':
        settings.taskbarGap = clamp(Number(value) || 0, 0, 240);
        document.documentElement.style.setProperty('--taskbar-gap', `${settings.taskbarGap}px`);
        break;
      case 'glow':
        settings.glow = !!value;
        break;
      case 'showTrack':
        settings.showTrack = !!value;
        cardEl.style.opacity = settings.showTrack ? '1' : '0';
        cardEl.style.pointerEvents = 'none';
        break;
    }
  };

  function sampleBar(index) {
    const count = bars.length;
    const start = Math.floor(Math.pow(index / count, 1.72) * (spectrum.length - 1));
    const end = Math.max(start + 1, Math.floor(Math.pow((index + 1) / count, 1.72) * spectrum.length));
    let sum = 0;
    let peak = 0;
    let samples = 0;
    for (let i = start; i < Math.min(end, spectrum.length); i++) {
      const value = spectrum[i];
      sum += value;
      peak = Math.max(peak, value);
      samples++;
    }
    const average = sum / Math.max(1, samples);
    return Math.pow(clamp(average * 0.72 + peak * 0.28, 0, 2) * settings.sensitivity, 0.78);
  }

  function roundedBar(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  function drawSpectrum(now) {
    ctx.clearRect(0, 0, width, height);
    const color = hexToRgb(settings.accent);
    const count = bars.length;
    const side = Math.max(24, width * 0.045);
    const usable = Math.max(1, width - side * 2);
    const slot = usable / count;
    const barWidth = Math.max(1.5, slot * 0.53);
    const baseline = height - 22;
    const maxHeight = Math.min(settings.barHeight * 0.82, height * 0.8);
    const fade = clamp(1 - (now - lastAudioAt) / 1500, 0, 1);
    const active = audioLevel > 0.001 && fade > 0;

    for (let i = 0; i < count; i++) {
      const target = active ? clamp(sampleBar(i), 0, 1.4) * maxHeight * fade : 0;
      const easing = target > bars[i] ? 0.42 : 0.12;
      bars[i] += (target - bars[i]) * easing;
      if (bars[i] < 0.45) bars[i] = 0;

      const x = side + i * slot + (slot - barWidth) / 2;
      const barH = Math.max(2, bars[i]);
      const y = baseline - barH;
      const strength = clamp(barH / maxHeight, 0, 1);
      const alpha = 0.28 + strength * 0.72;
      const gradient = ctx.createLinearGradient(0, y, 0, baseline);
      gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.38 + strength * 0.35})`);
      ctx.fillStyle = gradient;
      if (settings.glow && barH > 9) {
        ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, .52)`;
        ctx.shadowBlur = 8 + strength * 13;
      } else {
        ctx.shadowBlur = 0;
      }
      roundedBar(x, y, barWidth, barH, Math.min(4, barWidth / 2));
    }

    ctx.shadowBlur = 0;
    const lineGradient = ctx.createLinearGradient(side, 0, width - side, 0);
    lineGradient.addColorStop(0, `rgba(${color.join(',')}, 0)`);
    lineGradient.addColorStop(.12, `rgba(${color.join(',')}, .28)`);
    lineGradient.addColorStop(.5, `rgba(${color.join(',')}, .52)`);
    lineGradient.addColorStop(.88, `rgba(${color.join(',')}, .28)`);
    lineGradient.addColorStop(1, `rgba(${color.join(',')}, 0)`);
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(side, baseline + 1);
    ctx.lineTo(width - side, baseline + 1);
    ctx.stroke();
  }

  function frame(now) {
    if (!isPaused) drawSpectrum(now);
    requestAnimationFrame(frame);
  }

  applyAccent(settings.accent);
  document.documentElement.style.setProperty('--bar-height', `${settings.barHeight}px`);
  document.documentElement.style.setProperty('--taskbar-gap', `${settings.taskbarGap}px`);
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });
  requestAnimationFrame(frame);
})();

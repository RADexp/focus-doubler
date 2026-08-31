let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

type ToneType = OscillatorType;

interface Tone {
  freq: number;
  start: number;
  duration: number;
  peak: number;
  type?: ToneType;
}

/** Odgrywa zestaw tonów na wspólnym kontekście audio. */
function playTones(tones: Tone[]): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = t.type ?? "sine";
      osc.frequency.value = t.freq;
      gain.gain.setValueAtTime(0.0001, now + t.start);
      gain.gain.linearRampToValueAtTime(t.peak, now + t.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t.start);
      osc.stop(now + t.start + t.duration + 0.05);
    }
  } catch (e) {
    console.error("Dźwięk alertu niedostępny:", e);
  }
}

/** Frequency sweep (up or down) realizowany przez rampę na oscylatorze. */
function playSweep(opts: {
  from: number;
  to: number;
  start: number;
  duration: number;
  peak: number;
  type?: ToneType;
}): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(opts.from, now + opts.start);
    osc.frequency.linearRampToValueAtTime(opts.to, now + opts.start + opts.duration);
    gain.gain.setValueAtTime(0.0001, now + opts.start);
    gain.gain.linearRampToValueAtTime(opts.peak, now + opts.start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.start + opts.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + opts.start);
    osc.stop(now + opts.start + opts.duration + 0.05);
  } catch (e) {
    console.error("Dźwięk alertu niedostępny:", e);
  }
}

/**
 * Check-in: dwa zdecydowane, krótkie piknięcia (trójkąt) — wyraźnie głośniejsze
 * i ostrzejsze niż poprzedni subtelny sinus, ale nie inwazyjne, bo powtarzają się często.
 */
export function playChimeCheckin(): void {
  playTones([
    { freq: 988, start: 0, duration: 0.18, peak: 0.28, type: "triangle" },
    { freq: 988, start: 0.22, duration: 0.22, peak: 0.28, type: "triangle" },
  ]);
}

/**
 * Koniec bloku deep work: wznoszący się trójdźwięk (dur), grany głośno —
 * ma brzmieć jak wyraźny, satysfakcjonujący sygnał zakończenia.
 */
export function playChimeBlockEnd(): void {
  playTones([
    { freq: 523.25, start: 0, duration: 0.5, peak: 0.32, type: "sine" },
    { freq: 659.25, start: 0.12, duration: 0.5, peak: 0.3, type: "sine" },
    { freq: 783.99, start: 0.24, duration: 0.65, peak: 0.32, type: "triangle" },
  ]);
}

/**
 * Koniec przerwy: kaskada czterech szybkich, jasnych dźwięków — energiczne
 * wezwanie do powrotu do skupienia, głośniejsze i bardziej wyraziste niż reszta.
 */
export function playChimeBreakEnd(): void {
  playTones([
    { freq: 659.25, start: 0, duration: 0.14, peak: 0.3, type: "square" },
    { freq: 783.99, start: 0.1, duration: 0.14, peak: 0.3, type: "square" },
    { freq: 987.77, start: 0.2, duration: 0.14, peak: 0.3, type: "square" },
    { freq: 1174.66, start: 0.3, duration: 0.4, peak: 0.32, type: "triangle" },
  ]);
}

/**
 * Zapasowy wariant: syrenowe zamiatanie częstotliwości w górę i w dół —
 * bardzo trudny do zignorowania. Nieprzypisany domyślnie do żadnego zdarzenia.
 */
export function playChimeSirenSweep(): void {
  playSweep({ from: 500, to: 1000, start: 0, duration: 0.25, peak: 0.3 });
  playSweep({ from: 1000, to: 500, start: 0.28, duration: 0.25, peak: 0.3 });
}

/**
 * Zapasowy wariant: trzy krótkie, ostre pulsy tego samego tonu (piła) —
 * perkusyjny, natarczywy alert. Nieprzypisany domyślnie do żadnego zdarzenia.
 */
export function playChimePulseTriplet(): void {
  playTones([
    { freq: 880, start: 0, duration: 0.1, peak: 0.3, type: "sawtooth" },
    { freq: 880, start: 0.14, duration: 0.1, peak: 0.3, type: "sawtooth" },
    { freq: 880, start: 0.28, duration: 0.3, peak: 0.32, type: "sawtooth" },
  ]);
}

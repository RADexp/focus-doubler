let audioCtx: AudioContext | null = null;

/** Dwa ciche tony sinusoidalne (D5 -> A5) — bez plików zewnętrznych. */
export function playChime(): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const now = audioCtx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, peak: 0.05 },
      { freq: 880, start: 0.16, peak: 0.045 },
    ];
    for (const n of notes) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, now + n.start);
      gain.gain.linearRampToValueAtTime(n.peak, now + n.start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + 0.7);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + 0.75);
    }
  } catch (e) {
    console.error("Dźwięk check-inu niedostępny:", e);
  }
}

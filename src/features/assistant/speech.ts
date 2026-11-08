'use client';

/**
 * Voice in, using only what the browser already ships.
 *
 * This is `SpeechRecognition` from the Web Speech API: no key, no account, no
 * per-request cost — which is the whole point of doing it this way first. In
 * Chrome the audio goes to Google's recogniser, so it needs a connection, and
 * it needs either HTTPS or localhost for the microphone permission.
 *
 * Voice *out* is deliberately gone. `speechSynthesis` was here until 8 Nov
 * 2026 and the owner asked for it to go: Windows ships no Bengali voice, so a
 * Latin voice sounded out Bengali letters, and the assistant answers in cards,
 * tables and prices that do not read aloud usefully anyway. The assistant
 * listens and answers in text.
 *
 * TypeScript's DOM library still does not declare SpeechRecognition (it is
 * prefixed in Chrome and absent in Firefox), so the parts of it used here are
 * declared below rather than reached for through `any`.
 */

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
}

interface RecognitionEvent {
  resultIndex: number;
  results: { length: number } & Record<number, RecognitionResult>;
}

interface RecognitionErrorEvent {
  error: string;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => Recognition;

function recognitionCtor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function micSupported(): boolean {
  return recognitionCtor() !== null;
}

/**
 * Which Bengali tag this browser accepts, remembered after the first success.
 *
 * Chrome's recogniser is asked for bn-BD first; a browser that rejects the tag
 * answers `language-not-supported`, and the next one is tried. English last,
 * because a Banglish sentence ("kal ratre") transcribes far better as English
 * than it does as nothing at all.
 */
const LANG_CHAIN = ['bn-BD', 'bn-IN', 'en-US'];
let langIndex = 0;

export interface ListenCallbacks {
  /** Interim words, for the "শুনছি…" line. */
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  /** The raw Web Speech error code, e.g. `not-allowed`, `no-speech`. */
  onError: (code: string) => void;
  onEnd?: () => void;
}

/**
 * Listens once and stops at the end of the sentence. Returns a canceller.
 *
 * Push-to-talk rather than always-on: continuous recognition in a browser tab
 * holds the microphone open, drains a phone battery and picks up every
 * conversation in the room.
 */
export function listenOnce(callbacks: ListenCallbacks): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    callbacks.onError('unsupported');
    return () => {};
  }

  let stopped = false;
  const recognition = new Ctor();
  recognition.lang = LANG_CHAIN[langIndex];
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? '';
      if (result.isFinal) {
        if (!stopped && text.trim()) callbacks.onFinal(text.trim());
        return;
      }
      interim += text;
    }
    if (!stopped && interim.trim()) callbacks.onPartial?.(interim.trim());
  };

  recognition.onerror = (event) => {
    // Move down the chain and let the caller retry, rather than reporting a
    // dead microphone when it is only the language tag that was refused.
    if (event.error === 'language-not-supported' && langIndex < LANG_CHAIN.length - 1) {
      langIndex += 1;
      if (!stopped) callbacks.onError('retry-language');
      return;
    }
    if (!stopped) callbacks.onError(event.error);
  };

  recognition.onend = () => {
    if (!stopped) callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    // start() throws if one is already running; treat it as a dropped attempt.
    callbacks.onError('busy');
  }

  return () => {
    stopped = true;
    try {
      recognition.abort();
    } catch {
      /* already finished */
    }
  };
}

/** A human-readable reason, for the one line shown under the mic button. */
export function micErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি — ব্রাউজারের অ্যাড্রেস বারে তালা আইকনে গিয়ে অনুমতি দিন';
    case 'no-speech':
      return 'কিছু শোনা যায়নি, আবার চেষ্টা করুন';
    case 'audio-capture':
      return 'মাইক্রোফোন পাওয়া যায়নি';
    case 'network':
      return 'ইন্টারনেট ছাড়া ভয়েস কাজ করে না';
    case 'unsupported':
      return 'এই ব্রাউজারে ভয়েস সাপোর্ট নেই — ক্রোম ব্যবহার করুন';
    default:
      return 'ভয়েস কাজ করছে না, লিখে চেষ্টা করুন';
  }
}

/**
 * Voice catalogue for the two free voice engines.
 * Shared by the admin panel (which engines people may pick from), the
 * production layout (voice picker + preview) and the narration generator.
 */

export type VoiceOption = {
  id: string;
  label: string;
  engine: string;
  gender: "female" | "male";
  blurb: string;
  /** Prebuilt voice used by the built-in voice engine. */
  gatewayVoice: string;
  /** ElevenLabs voice used when a paid key is configured. */
  elevenId: string;
  /** Delivery direction prepended to the narration. */
  direction: string;
};

export type VoiceEngine = {
  id: string;
  label: string;
  blurb: string;
  voices: VoiceOption[];
};

export const VOICE_ENGINES: VoiceEngine[] = [
  {
    id: "edge-tts",
    label: "Edge voices",
    blurb: "Free newsroom-clean narration. Great for explainers and documentaries.",
    voices: [
      {
        id: "edge-aria",
        label: "Aria",
        engine: "edge-tts",
        gender: "female",
        blurb: "Warm, confident presenter",
        gatewayVoice: "Kore",
        elevenId: "9BWtsMINqrJLrRacOk9x",
        direction: "warm, confident and clear, like a trusted presenter",
      },
      {
        id: "edge-guy",
        label: "Guy",
        engine: "edge-tts",
        gender: "male",
        blurb: "Punchy, upbeat host",
        gatewayVoice: "Puck",
        elevenId: "TX3LPaxmHKxFdv7VOQHJ",
        direction: "upbeat, punchy and energetic, like a popular YouTube host",
      },
      {
        id: "edge-davis",
        label: "Davis",
        engine: "edge-tts",
        gender: "male",
        blurb: "Deep documentary tone",
        gatewayVoice: "Charon",
        elevenId: "onwK4e9ZLuTAKqWW03F9",
        direction: "deep, slow and cinematic, like a documentary narrator",
      },
      {
        id: "edge-jenny",
        label: "Jenny",
        engine: "edge-tts",
        gender: "female",
        blurb: "Calm, friendly storyteller",
        gatewayVoice: "Aoede",
        elevenId: "EXAVITQu4vr4xnSDxMaL",
        direction: "calm, friendly and gently paced, like a bedtime storyteller",
      },
      {
        id: "edge-sonia",
        label: "Sonia",
        engine: "edge-tts",
        gender: "female",
        blurb: "Crisp British newsreader",
        gatewayVoice: "Achernar",
        elevenId: "ThT5KcBeYPX3keUQqHPh",
        direction: "crisp, precise and articulate, like a British news anchor",
      },
      {
        id: "edge-ryan",
        label: "Ryan",
        engine: "edge-tts",
        gender: "male",
        blurb: "Polished corporate narrator",
        gatewayVoice: "Iapetus",
        elevenId: "JBFqnCBsd6RMkjVDRZzb",
        direction: "polished, measured and professional, like a corporate narrator",
      },
      {
        id: "edge-natasha",
        label: "Natasha",
        engine: "edge-tts",
        gender: "female",
        blurb: "Sunny, approachable read",
        gatewayVoice: "Autonoe",
        elevenId: "cgSgspJ2msm6clMCkdW9",
        direction: "sunny, approachable and easy-going",
      },
      {
        id: "edge-william",
        label: "William",
        engine: "edge-tts",
        gender: "male",
        blurb: "Authoritative explainer",
        gatewayVoice: "Rasalgethi",
        elevenId: "N2lVS1w4EtoT3dr4eOWO",
        direction: "authoritative and knowledgeable, like a seasoned explainer",
      },
      {
        id: "edge-clara",
        label: "Clara",
        engine: "edge-tts",
        gender: "female",
        blurb: "Bright tutorial guide",
        gatewayVoice: "Erinome",
        elevenId: "FGY2WhTYpPnrIDTdsKH5",
        direction: "bright, helpful and instructive, like a friendly tutorial guide",
      },
      {
        id: "edge-liam",
        label: "Liam",
        engine: "edge-tts",
        gender: "male",
        blurb: "Casual, conversational",
        gatewayVoice: "Umbriel",
        elevenId: "cjVigY5qzO86Huf0OWal",
        direction: "casual and conversational, like talking to a friend",
      },
      {
        id: "edge-mia",
        label: "Mia",
        engine: "edge-tts",
        gender: "female",
        blurb: "Fast-paced social host",
        gatewayVoice: "Laomedeia",
        elevenId: "XrExE9yKIg1WjnnlVkGX",
        direction: "fast-paced, snappy and engaging, like a short-form social host",
      },
      {
        id: "edge-noah",
        label: "Noah",
        engine: "edge-tts",
        gender: "male",
        blurb: "Reassuring audiobook read",
        gatewayVoice: "Schedar",
        elevenId: "nPczCjzI2devNBz1zQrb",
        direction: "reassuring, smooth and steady, like an audiobook reader",
      },
      {
        id: "edge-elena",
        label: "Elena",
        engine: "edge-tts",
        gender: "female",
        blurb: "Elegant, cinematic tone",
        gatewayVoice: "Vindemiatrix",
        elevenId: "LcfcDJNUP1GQjkzn1xUU",
        direction: "elegant, refined and cinematic",
      },
      {
        id: "edge-marcus",
        label: "Marcus",
        engine: "edge-tts",
        gender: "male",
        blurb: "Bold sports commentator",
        gatewayVoice: "Alnilam",
        elevenId: "pqHfZKP75CvOlQylNhV4",
        direction: "bold, high-energy and dramatic, like a sports commentator",
      },
    ],
  },
  {
    id: "kokoro",
    label: "Kokoro voices",
    blurb: "Free character-rich narration. Great for stories and faceless channels.",
    voices: [
      {
        id: "kokoro-bella",
        label: "Bella",
        engine: "kokoro",
        gender: "female",
        blurb: "Bright and expressive",
        gatewayVoice: "Leda",
        elevenId: "Xb7hH8MSUJpSbSDYk0k2",
        direction: "bright, expressive and lively",
      },
      {
        id: "kokoro-nicole",
        label: "Nicole",
        engine: "kokoro",
        gender: "female",
        blurb: "Soft, close-mic whisper",
        gatewayVoice: "Zephyr",
        elevenId: "pFZP5JQG7iQjIQuC4Bku",
        direction: "soft, intimate and close to the microphone, almost a whisper",
      },
      {
        id: "kokoro-adam",
        label: "Adam",
        engine: "kokoro",
        gender: "male",
        blurb: "Steady, natural read",
        gatewayVoice: "Orus",
        elevenId: "bIHbv24MWmeRgasZH58o",
        direction: "steady, natural and conversational",
      },
      {
        id: "kokoro-michael",
        label: "Michael",
        engine: "kokoro",
        gender: "male",
        blurb: "Dramatic trailer voice",
        gatewayVoice: "Fenrir",
        elevenId: "iP95p4xoKVk53GoZ742B",
        direction: "dramatic and intense, like a movie trailer",
      },
      {
        id: "kokoro-sarah",
        label: "Sarah",
        engine: "kokoro",
        gender: "female",
        blurb: "Grounded, trustworthy",
        gatewayVoice: "Callirrhoe",
        elevenId: "EXAVITQu4vr4xnSDxMaL",
        direction: "grounded, sincere and trustworthy",
      },
      {
        id: "kokoro-river",
        label: "River",
        engine: "kokoro",
        gender: "female",
        blurb: "Cool, understated",
        gatewayVoice: "Despina",
        elevenId: "SAz9YHcvj6GT2YYXdXww",
        direction: "cool, understated and effortlessly calm",
      },
      {
        id: "kokoro-eric",
        label: "Eric",
        engine: "kokoro",
        gender: "male",
        blurb: "Sharp, modern presenter",
        gatewayVoice: "Algieba",
        elevenId: "cjVigY5qzO86Huf0OWal",
        direction: "sharp, modern and confident, like a tech presenter",
      },
      {
        id: "kokoro-santiago",
        label: "Santiago",
        engine: "kokoro",
        gender: "male",
        blurb: "Rich, resonant storyteller",
        gatewayVoice: "Enceladus",
        elevenId: "onwK4e9ZLuTAKqWW03F9",
        direction: "rich, resonant and unhurried, like a master storyteller",
      },
      {
        id: "kokoro-luna",
        label: "Luna",
        engine: "kokoro",
        gender: "female",
        blurb: "Dreamy, mysterious",
        gatewayVoice: "Sulafat",
        elevenId: "XB0fDUnXU5powFXDhCwa",
        direction: "dreamy, mysterious and hushed",
      },
      {
        id: "kokoro-theo",
        label: "Theo",
        engine: "kokoro",
        gender: "male",
        blurb: "Youthful, playful",
        gatewayVoice: "Puck",
        elevenId: "TX3LPaxmHKxFdv7VOQHJ",
        direction: "youthful, playful and cheeky",
      },
      {
        id: "kokoro-ivy",
        label: "Ivy",
        engine: "kokoro",
        gender: "female",
        blurb: "Curious, wide-eyed",
        gatewayVoice: "Gacrux",
        elevenId: "9BWtsMINqrJLrRacOk9x",
        direction: "curious and wide-eyed, full of wonder",
      },
      {
        id: "kokoro-atlas",
        label: "Atlas",
        engine: "kokoro",
        gender: "male",
        blurb: "Epic, larger than life",
        gatewayVoice: "Achird",
        elevenId: "nPczCjzI2devNBz1zQrb",
        direction: "epic and larger than life, like a fantasy narrator",
      },
      {
        id: "kokoro-hana",
        label: "Hana",
        engine: "kokoro",
        gender: "female",
        blurb: "Gentle, meditative",
        gatewayVoice: "Sadachbia",
        elevenId: "pFZP5JQG7iQjIQuC4Bku",
        direction: "gentle, slow and meditative, like a guided relaxation",
      },
      {
        id: "kokoro-felix",
        label: "Felix",
        engine: "kokoro",
        gender: "male",
        blurb: "Wry, deadpan humour",
        gatewayVoice: "Zubenelgenubi",
        elevenId: "JBFqnCBsd6RMkjVDRZzb",
        direction: "wry and deadpan, with dry humour",
      },
    ],
  },
];


/** Engine ids that can be switched on for everyone at once. */
export const FREE_VOICE_ENGINE_IDS = VOICE_ENGINES.map((engine) => engine.id);

export const ALL_VOICES: VoiceOption[] = VOICE_ENGINES.flatMap((engine) => engine.voices);

export const DEFAULT_VOICE_ID = "edge-aria";

/** Legacy tone names once stored on videos. */
const LEGACY: Record<string, string> = {
  warm: "edge-aria",
  bright: "kokoro-bella",
  deep: "edge-davis",
  calm: "edge-jenny",
  Kore: "edge-aria",
  Puck: "edge-guy",
  Charon: "edge-davis",
  Aoede: "edge-jenny",
};

export function findVoice(voiceId: string | null | undefined): VoiceOption {
  const id = voiceId ? (LEGACY[voiceId] ?? voiceId) : DEFAULT_VOICE_ID;
  return ALL_VOICES.find((voice) => voice.id === id) ?? ALL_VOICES[0]!;
}

/** Voices a viewer may pick, limited to the engines the admin turned on. */
export function voicesForEngines(engineIds: string[]): VoiceEngine[] {
  const allowed = engineIds.length ? engineIds : FREE_VOICE_ENGINE_IDS;
  return VOICE_ENGINES.filter((engine) => allowed.includes(engine.id));
}

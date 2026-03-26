/**
 * Audio preloader and player for Vocab Vibes.
 * Files live in public/audio/ and are served at BASE_URL/audio/.
 */

const BASE = import.meta.env.BASE_URL + "audio/";
const cache = new Map(); // url -> HTMLAudioElement

function sanitize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

// Map reaction display text → audio path
const REACTION_MAP = {
  // correct
  "Slay! 💅": "reactions/correct/slay.mp3",
  "No cap! 🔥": "reactions/correct/no_cap.mp3",
  "It's giving genius 🧠": "reactions/correct/its_giving_genius.mp3",
  "Bussin! 🎉": "reactions/correct/bussin.mp3",
  "W! 🏆": "reactions/correct/w.mp3",
  "Ate that! 🍽️": "reactions/correct/ate_that.mp3",
  "Periodt! 💜": "reactions/correct/periodt.mp3",
  "You cooked! 👨‍🍳": "reactions/correct/you_cooked.mp3",
  "Main character energy! ✨": "reactions/correct/main_character_energy.mp3",
  "So iconic! 💖": "reactions/correct/so_iconic.mp3",
  "Yaaas! 🌟": "reactions/correct/yaaas.mp3",
  "Rizz level 100! 😎": "reactions/correct/rizz_level_100.mp3",
  "Sheeeesh! 🥶": "reactions/correct/sheeeesh.mp3",
  "On point! 🎯": "reactions/correct/on_point.mp3",
  "Vibes! 🦋": "reactions/correct/vibes.mp3",
  // streak
  "Ate and left no crumbs! 🍰✨": "reactions/streak/ate_and_left_no_crumbs.mp3",
  "Unstoppable queen! 👑🔥": "reactions/streak/unstoppable_queen.mp3",
  "Serving LOOKS and BRAINS! 💅🧠": "reactions/streak/serving_looks_and_brains.mp3",
  "Living rent free in genius town! 🏠💜": "reactions/streak/living_rent_free_in_genius_town.mp3",
  // wrong
  "Bruh 💀": "reactions/wrong/bruh.mp3",
  "Oof 😬": "reactions/wrong/oof.mp3",
  "Not the L... 📉": "reactions/wrong/not_the_l.mp3",
  "It's giving wrong answer 🫣": "reactions/wrong/its_giving_wrong_answer.mp3",
  "That ain't it chief 😅": "reactions/wrong/that_aint_it_chief.mp3",
  "Nah fam 🙈": "reactions/wrong/nah_fam.mp3",
  "Plot twist! 😵": "reactions/wrong/plot_twist.mp3",
  // master
  "LOCKED IN! 🔒✨": "reactions/master/locked_in.mp3",
  "This word is YOUR bestie now! 💕": "reactions/master/this_word_is_your_bestie_now.mp3",
  "Permanent brain resident! 🧠🏠": "reactions/master/permanent_brain_resident.mp3",
  "Added to the collection! 💎": "reactions/master/added_to_the_collection.mp3",
};

function urlFor(path) {
  return BASE + path;
}

function wordUrl(word) {
  return urlFor("words/" + word.toLowerCase().replace(/ /g, "_") + ".mp3");
}

function reactionUrl(reactionText) {
  const path = REACTION_MAP[reactionText];
  return path ? urlFor(path) : null;
}

function uiUrl(name) {
  return urlFor("reactions/ui/" + name + ".mp3");
}

/** Preload a single URL and cache it. Returns a promise. */
function preloadOne(url) {
  if (cache.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    audio.addEventListener("canplaythrough", () => {
      cache.set(url, audio);
      resolve();
    }, { once: true });
    audio.addEventListener("error", () => {
      // Skip failed loads silently
      resolve();
    }, { once: true });
    audio.load();
  });
}

/**
 * Preload all audio for a word list.
 * Calls onProgress(loaded, total) as files load.
 * Returns a promise that resolves when all are loaded.
 */
export function preloadForList(words, onProgress) {
  const urls = new Set();

  // All reaction audio
  for (const path of Object.values(REACTION_MAP)) {
    urls.add(urlFor(path));
  }
  // UI audio
  urls.add(uiUrl("the_answer_was"));
  urls.add(uiUrl("you_understood_the_assignment"));
  urls.add(uiUrl("word_mastered"));
  urls.add(uiUrl("welcome"));

  // Word audio
  for (const w of words) {
    urls.add(wordUrl(w.word));
  }

  const total = urls.size;
  let loaded = 0;

  const promises = [...urls].map((url) =>
    preloadOne(url).then(() => {
      loaded++;
      onProgress?.(loaded, total);
    })
  );

  return Promise.all(promises);
}

/** Play audio for a reaction string. */
export function playReaction(reactionText) {
  const url = reactionUrl(reactionText);
  if (!url) return;
  play(url);
}

/** Play audio for a word. */
export function playWord(word) {
  play(wordUrl(word));
}

/** Play a UI sound by name. */
export function playUI(name) {
  play(uiUrl(name));
}

function play(url) {
  const cached = cache.get(url);
  if (cached) {
    const clone = cached.cloneNode();
    clone.play().catch(() => {});
  } else {
    // Fallback: play uncached
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }
}

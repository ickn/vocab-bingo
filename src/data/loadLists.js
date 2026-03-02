const modules = import.meta.glob("../../data/lists/*.yaml", { eager: true });

function toDisplayName(filename) {
  // "book_4_lesson_18.yaml" → "Book 4 - Lesson 18"
  const base = filename.replace(/\.yaml$/, "");
  const parts = base.split("_");
  // Group into pairs: ["book","4","lesson","18"] → "Book 4 - Lesson 18"
  const chunks = [];
  for (let i = 0; i < parts.length; i += 2) {
    const label = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    const num = parts[i + 1] || "";
    chunks.push(`${label} ${num}`.trim());
  }
  return chunks.join(" - ");
}

function transformWords(raw) {
  return raw.map((entry) => ({
    word: entry.word,
    definitions: entry.definitions.map((d) => ({
      partOfSpeech: d.part_of_speech,
      definition: d.definition,
    })),
  }));
}

const lists = Object.entries(modules).map(([path, mod]) => {
  const filename = path.split("/").pop();
  const id = filename.replace(/\.yaml$/, "");
  return {
    id,
    name: toDisplayName(filename),
    words: transformWords(mod.default),
  };
});

lists.sort((a, b) => a.name.localeCompare(b.name));

export default lists;

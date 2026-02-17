export default function DefinitionPrompt({ definition }) {
  if (!definition) return null;

  return (
    <div className="definition-prompt">
      <span className="part-of-speech">({definition.partOfSpeech})</span>{" "}
      {definition.definition}
    </div>
  );
}

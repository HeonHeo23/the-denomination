import type { DilemmaDefinition } from "../../simulation";

interface DilemmaPanelProps {
  readonly dilemma: DilemmaDefinition;
  readonly onChoose: (choiceId: string) => void;
}

export function DilemmaPanel({ dilemma, onChoose }: DilemmaPanelProps) {
  return (
    <div className="dilemma-backdrop" role="presentation">
      <section
        className="dilemma"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dilemma-title"
      >
        <span className="dilemma__eyebrow">A decision is required</span>
        <h2 id="dilemma-title">{dilemma.title}</h2>
        <p>{dilemma.description}</p>
        <div className="dilemma__choices">
          {dilemma.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice.id)}
            >
              <strong>{choice.label}</strong>
              <span>{choice.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

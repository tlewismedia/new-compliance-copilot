// TEMP_SAMPLE_QUESTIONS: Temporary dev affordance (issue #37).
// Delete this file and its imports when no longer needed.
// Grep for `TEMP_SAMPLE_QUESTIONS` to find all references.
"use client";

import { useState } from "react";

const TEMP_SAMPLE_QUESTIONS: ReadonlyArray<{
  topic: string;
  question: string;
}> = [
  {
    topic: "Reg SHO",
    question:
      "When can a broker-dealer skip the locate requirement for a short sale?",
  },
  {
    topic: "FINRA 3110",
    question:
      "How often do branch offices need to be inspected under FINRA 3110?",
  },
  {
    topic: "CIP",
    question:
      "What documents count for verifying a new individual customer's identity under the CIP rule?",
  },
  {
    topic: "Marketing Rule",
    question:
      "Can we show a gross-return figure in an ad without also showing net returns?",
  },
  {
    topic: "Rule 15c3-1",
    question:
      "What's the lowest our net capital can go after we pay a dividend out to the parent?",
  },
];

export function SampleQuestions({
  onSelect,
}: {
  onSelect: (question: string) => void;
}): React.JSX.Element {
  const [i, setI] = useState(0);
  const total = TEMP_SAMPLE_QUESTIONS.length;
  const current = TEMP_SAMPLE_QUESTIONS[i];

  function goPrev() {
    setI((prev) => (prev === 0 ? total - 1 : prev - 1));
  }

  function goNext() {
    setI((prev) => (prev === total - 1 ? 0 : prev + 1));
  }

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      data-testid="sample-questions"
    >
      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous sample question"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6b7a70] transition-all hover:-translate-y-px hover:bg-white/70 hover:text-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M7.5 3L4.5 6L7.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => onSelect(current.question)}
        aria-label={`Use sample question for ${current.topic}`}
        className="group flex min-w-0 items-center justify-center text-center transition-colors hover:text-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40"
      >
        <span className="min-w-0 max-w-[480px] text-center text-[13px] leading-relaxed text-[#6b7a70]">
          {current.question}
        </span>
      </button>

      <button
        type="button"
        onClick={goNext}
        aria-label="Next sample question"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6b7a70] transition-all hover:-translate-y-px hover:bg-white/70 hover:text-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M4.5 3L7.5 6L4.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

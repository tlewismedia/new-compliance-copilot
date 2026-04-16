// TEMP_SAMPLE_QUESTIONS: Temporary dev affordance (issue #37).
// Delete this file and its imports when no longer needed.
// Grep for `TEMP_SAMPLE_QUESTIONS` to find all references.
"use client";

import { useState } from "react";
import { Card } from "./card";

const TEMP_SAMPLE_QUESTIONS: ReadonlyArray<{
  regulation: string;
  question: string;
}> = [
  {
    regulation: "Reg Z",
    question:
      "Under Regulation Z, when must a creditor provide the initial disclosure statement for a closed-end consumer credit transaction secured by a dwelling?",
  },
  {
    regulation: "Reg E",
    question:
      "Under Regulation E, what are the consumer's liability limits for an unauthorized electronic fund transfer reported more than two business days after discovery?",
  },
  {
    regulation: "BSA/AML",
    question:
      "Under the Bank Secrecy Act, what are the Currency Transaction Report (CTR) filing thresholds and timing requirements for cash transactions?",
  },
  {
    regulation: "Reg DD",
    question:
      "Under Regulation DD, what annual percentage yield (APY) disclosure is required in advertisements for deposit accounts?",
  },
  {
    regulation: "UDAAP",
    question:
      "What are the key factors examiners consider when evaluating whether a bank's practice constitutes an unfair, deceptive, or abusive act or practice under UDAAP?",
  },
];

export function SampleQuestions(): React.JSX.Element {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopy(index: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex((current) => (current === index ? null : current));
      }, 1000);
    } catch {
      // Clipboard unavailable (e.g. insecure context); no-op.
    }
  }

  return (
    <Card className="p-5" data-testid="sample-questions">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          Sample Questions
        </span>
        <span className="text-[11px] text-[#8a968f]">Click to copy</span>
      </div>
      <ul className="mt-3 grid gap-2">
        {TEMP_SAMPLE_QUESTIONS.map((item, index) => {
          const copied = copiedIndex === index;
          return (
            <li key={item.regulation}>
              <button
                type="button"
                onClick={() => void handleCopy(index, item.question)}
                aria-label={`Copy sample question for ${item.regulation}`}
                className="group flex w-full items-start gap-3 rounded-xl border border-[#2d4a35]/10 bg-white/70 px-4 py-3 text-left transition-all hover:border-[#6ea580]/40 hover:bg-white focus:border-[#6ea580] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40"
              >
                <span className="mt-0.5 shrink-0 rounded-full bg-[#2d4a35]/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#2d4a35]">
                  {item.regulation}
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#1f2a23]">
                  {item.question}
                </span>
                <span
                  aria-live="polite"
                  className={`ml-auto shrink-0 text-[11px] font-medium transition-opacity ${
                    copied
                      ? "text-[#2d4a35] opacity-100"
                      : "text-[#8a968f] opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

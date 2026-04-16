import { AnswerEvaluation } from "../_components/answer-evaluation";
import { RetrievalEvaluation } from "../_components/retrieval-evaluation";
import { SERIF } from "../_components/shared";

export function EvaluationsPage(): React.JSX.Element {
  return (
    <main className="relative mx-auto w-full max-w-[1360px] flex-1 px-8 pb-24 pt-4">
      <div className="mb-6">
        <h1
          className="text-[28px] tracking-tight text-[#1f2a23]"
          style={SERIF}
        >
          Evaluations
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7a70]">
          Track answer quality across regression suites and ad-hoc probes.
        </p>
      </div>
      <div className="space-y-8">
        <RetrievalEvaluation />
        <AnswerEvaluation />
      </div>
    </main>
  );
}

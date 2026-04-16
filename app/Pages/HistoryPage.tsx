import { Card } from "../_components/card";
import { SERIF } from "../_components/shared";

export function HistoryPage(): React.JSX.Element {
  return (
    <main className="relative mx-auto w-full max-w-[1360px] flex-1 px-8 pb-24 pt-4">
      <div className="mb-6">
        <h1
          className="text-[28px] tracking-tight text-[#1f2a23]"
          style={SERIF}
        >
          History
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7a70]">
          Recently asked questions, answers, and the runs behind them.
        </p>
      </div>
      <Card className="p-8">
        <p className="text-[13px] text-[#6b7a70]">
          Query history coming soon.
        </p>
      </Card>
    </main>
  );
}

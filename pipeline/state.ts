import { Annotation } from "@langchain/langgraph";
import type { Retrieval, Citation } from "../shared/types";

export const GraphStateAnnotation = Annotation.Root({
  query: Annotation<string>,
  retrievals: Annotation<Retrieval[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  answer: Annotation<string | undefined>,
  citations: Annotation<Citation[] | undefined>,
});

export type GraphState = typeof GraphStateAnnotation.State;

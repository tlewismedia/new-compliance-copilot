import { Pinecone } from "@pinecone-database/pinecone";
import type { GraphState } from "../state";
import type { Retrieval } from "../../shared/types";

export function createRetrieveNode(
  vectorStore: ReturnType<Pinecone["index"]>
) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const response = await vectorStore.searchRecords({
      query: { topK: 5, inputs: { text: state.query } },
    });

    const retrievals: Retrieval[] = response.result.hits.map((hit) => ({
      chunkId: hit._id,
      text: (hit.fields as Record<string, unknown>)["text"] as string,
      score: hit._score,
      metadata: undefined,
    }));

    return { retrievals };
  };
}

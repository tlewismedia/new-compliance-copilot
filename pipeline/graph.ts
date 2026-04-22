import { StateGraph } from "@langchain/langgraph";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { GraphStateAnnotation } from "./state";
import { createRetrieveNode } from "./nodes/retrieve";
import { createGenerateNode } from "./nodes/generate";
import { bumpBuild, logMemory } from "./instrument";

type Pipeline = {
  graph: ReturnType<typeof compileGraph>;
  openai: OpenAI;
};

function compileGraph(vectorStore: ReturnType<Pinecone["index"]>, openai: OpenAI) {
  return new StateGraph(GraphStateAnnotation)
    .addNode("retrieve", createRetrieveNode(vectorStore))
    .addNode("generate", createGenerateNode(openai))
    .addEdge("__start__", "retrieve")
    .addEdge("retrieve", "generate")
    .addEdge("generate", "__end__")
    .compile();
}

function buildPipeline(): Pipeline {
  const n = bumpBuild();
  logMemory(`graph:build#${n}`);
  if (n > 1) {
    console.warn(
      `[pipeline] rebuilding graph (count=${n}). ` +
        `globalThis cache missed — likely a new worker or VM context.`,
    );
  }
  const vectorStore = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
    .index(process.env.PINECONE_INDEX!);
  const openai = new OpenAI();
  return { graph: compileGraph(vectorStore, openai), openai };
}

// Cache clients + compiled graph on globalThis so Next.js dev HMR doesn't
// leak a new Pinecone client, OpenAI client, and LangGraph instance on
// every module re-evaluation.
type GlobalWithPipeline = typeof globalThis & {
  __pipeline?: Pipeline;
};

const g = globalThis as GlobalWithPipeline;

export function getGraph() {
  g.__pipeline ??= buildPipeline();
  return g.__pipeline.graph;
}

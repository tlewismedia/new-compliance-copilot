import { StateGraph } from "@langchain/langgraph";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { GraphStateAnnotation } from "./state";
import { createRetrieveNode } from "./nodes/retrieve";
import { createGenerateNode } from "./nodes/generate";

const vectorStore = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
  .index(process.env.PINECONE_INDEX!);
const openai = new OpenAI();

export const graph = new StateGraph(GraphStateAnnotation)
  .addNode("retrieve", createRetrieveNode(vectorStore))
  .addNode("generate", createGenerateNode(openai))
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

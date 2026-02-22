/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentEvents from "../agentEvents.js";
import type * as clients from "../clients.js";
import type * as composio from "../composio.js";
import type * as contradictions from "../contradictions.js";
import type * as dataSources from "../dataSources.js";
import type * as demoData from "../demoData.js";
import type * as explorations from "../explorations.js";
import type * as forum from "../forum.js";
import type * as http from "../http.js";
import type * as knowledge from "../knowledge.js";
import type * as pipeline from "../pipeline.js";
import type * as questionnaires from "../questionnaires.js";
import type * as seed from "../seed.js";
import type * as triggerPipeline from "../triggerPipeline.js";
import type * as visualizationGraph from "../visualizationGraph.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentEvents: typeof agentEvents;
  clients: typeof clients;
  composio: typeof composio;
  contradictions: typeof contradictions;
  dataSources: typeof dataSources;
  demoData: typeof demoData;
  explorations: typeof explorations;
  forum: typeof forum;
  http: typeof http;
  knowledge: typeof knowledge;
  pipeline: typeof pipeline;
  questionnaires: typeof questionnaires;
  seed: typeof seed;
  triggerPipeline: typeof triggerPipeline;
  visualizationGraph: typeof visualizationGraph;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

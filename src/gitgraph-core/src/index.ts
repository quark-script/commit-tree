// Runtime values (classes, enums, functions).
export { GitgraphCore } from "./gitgraph";
export { Mode } from "./mode";
export { GitgraphUserApi } from "./user-api/gitgraph-user-api";
export { BranchUserApi } from "./user-api/branch-user-api";
export { Branch } from "./branch";
export { Commit } from "./commit";
export { Tag } from "./tag";
export { Refs } from "./refs";
export { MergeStyle, TemplateName, templateExtend } from "./template";
export { Orientation } from "./orientation";
export { toSvgPath } from "./branches-paths";
export { arrowSvgPath } from "./utils";

// Type-only re-exports. Kept separate so per-file transpilers (esbuild/Vite,
// Babel) don't emit runtime bindings for erased types.
export type { GitgraphOptions, RenderedData } from "./gitgraph";
export type {
  GitgraphCommitOptions,
  GitgraphBranchOptions,
  GitgraphTagOptions,
} from "./user-api/gitgraph-user-api";
export type { GitgraphMergeOptions } from "./user-api/branch-user-api";
export type { BranchesPaths, Coordinate } from "./branches-paths";

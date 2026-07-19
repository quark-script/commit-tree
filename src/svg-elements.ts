import type { Commit } from "./gitgraph-core/src/index";

export {
  SVG_NAMESPACE,
  COLORS,
  createSvg,
  createG,
  createText,
  createNode,
  createRect,
  createPath,
  createUse,
  createClipPath,
  createDefs,
  createForeignObject,
};
export type { NodeStyle };

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * Generic, brand-neutral palette used by the rendering layer.
 *
 * Kept here (instead of hard-coded throughout) so consumers have a single
 * place to retheme the graph. Colors are intentionally product-agnostic.
 */
const COLORS = {
  /** Path & label color for branches that have been deleted. */
  deletedBranch: "#cc0000",
  nodeFill: "#F7F9FF",
  nodeBorder: "#606DAC",
  nodeHover: "#E8EBF7",
  nodeText: "#2F397D",
  metaText: "#8A8A8A",
  metaLabel: "#595858",
  tooltipBubble: "#EEEEEE",
  tooltipBubbleText: "#333333",
};

interface SVGOptions {
  viewBox?: string;
  height?: number;
  width?: number;
  children?: SVGElement[];
}

function createSvg(options?: SVGOptions): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  if (!options) return svg;

  if (options.children) {
    options.children.forEach((child) => svg.appendChild(child));
  }

  if (options.viewBox) {
    svg.setAttribute("viewBox", options.viewBox);
  }

  if (options.height) {
    svg.setAttribute("height", options.height.toString());
  }

  if (options.width) {
    svg.setAttribute("width", options.width.toString());
  }

  return svg;
}

interface GOptions {
  children: Array<SVGElement | null>;
  translate?: {
    x: number;
    y: number;
  };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}

function createG(options: GOptions): SVGGElement {
  const g = document.createElementNS(SVG_NAMESPACE, "g");
  options.children.forEach((child) => child && g.appendChild(child));

  if (options.translate) {
    g.setAttribute(
      "transform",
      `translate(${options.translate.x}, ${options.translate.y})`,
    );
  }

  if (options.fill) {
    g.setAttribute("fill", options.fill);
  }

  if (options.stroke) {
    g.setAttribute("stroke", options.stroke);
  }

  if (options.strokeWidth) {
    g.setAttribute("stroke-width", options.strokeWidth.toString());
  }

  if (options.onClick) {
    g.addEventListener("click", options.onClick);
  }

  if (options.onMouseOver) {
    g.addEventListener("mouseover", options.onMouseOver);
  }

  if (options.onMouseOut) {
    g.addEventListener("mouseout", options.onMouseOut);
  }

  return g;
}

interface TextOptions {
  content: string;
  fill?: string;
  font?: string;
  anchor?: "start" | "middle" | "end";
  translate?: {
    x: number;
    y: number;
  };
  onClick?: () => void;
}

function createText(options: TextOptions): SVGTextElement {
  const text = document.createElementNS(SVG_NAMESPACE, "text");
  text.setAttribute("alignment-baseline", "central");
  text.setAttribute("dominant-baseline", "central");
  text.textContent = options.content;

  if (options.fill) {
    text.setAttribute("fill", options.fill);
  }

  if (options.font) {
    text.setAttribute("style", `font: ${options.font}`);
  }

  if (options.anchor) {
    text.setAttribute("text-anchor", options.anchor);
  }

  if (options.translate) {
    text.setAttribute("x", options.translate.x.toString());
    text.setAttribute("y", options.translate.y.toString());
  }

  if (options.onClick) {
    text.addEventListener("click", options.onClick);
  }

  return text;
}

/**
 * Available renderings for a commit node.
 *
 * - `hash`  - a compact pill showing the abbreviated commit hash. The commit
 *   title and metadata live in the message column to the right.
 * - `label` - the commit subject rendered inside a wider node, for graphs
 *   where the title is the primary thing to read.
 */
type NodeStyle = "hash" | "label";

interface NodeOptions {
  nodeStyle?: NodeStyle;
}

/**
 * Truncate a string to `max` characters, appending an ellipsis when clipped.
 */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Render a commit node.
 *
 * Replaces gitgraph's plain circle dot with a pill/label node. Two visual
 * concerns are handled here beyond the base library:
 *
 * 1. Node style (`hash` vs `label`) - see {@link NodeStyle}.
 * 2. Merge-commit indicator - commits with more than one parent get a dashed
 *    ring so merges stand out from ordinary commits.
 *
 * Click / hover behavior is owned by the wrapping group in the renderer, which
 * forwards to the commit's `onClick` / `onMouseOver` / `onMouseOut` callbacks.
 */
function createNode(commit: Commit, options: NodeOptions = {}): SVGGElement {
  const nodeStyle: NodeStyle = options.nodeStyle || "hash";
  const isLabel = nodeStyle === "label";
  const borderColor = commit.style.color || COLORS.nodeBorder;

  const g = document.createElementNS(SVG_NAMESPACE, "g");

  const x = -20;
  const y = 2;
  const width = isLabel ? 210 : 70;
  const height = 25;

  // Merge-commit indicator: a dashed ring drawn behind the node marks commits
  // that join two branches (more than one parent).
  if (commit.parents.length > 1) {
    const ring = document.createElementNS(SVG_NAMESPACE, "rect");
    ring.setAttribute("x", (x - 4).toString());
    ring.setAttribute("y", (y - 4).toString());
    ring.setAttribute("width", (width + 8).toString());
    ring.setAttribute("height", (height + 8).toString());
    ring.setAttribute("rx", "16");
    ring.setAttribute("ry", "16");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", borderColor);
    ring.setAttribute("stroke-width", "1.5");
    ring.setAttribute("stroke-dasharray", "3 3");
    g.appendChild(ring);
  }

  const rect = document.createElementNS(SVG_NAMESPACE, "rect");
  rect.setAttribute("x", x.toString());
  rect.setAttribute("y", y.toString());
  rect.setAttribute("width", width.toString());
  rect.setAttribute("height", height.toString());
  rect.setAttribute("rx", "13");
  rect.setAttribute("ry", "13");
  rect.setAttribute("fill", COLORS.nodeFill);
  rect.setAttribute("stroke", borderColor);
  rect.setAttribute("stroke-width", "1");
  rect.setAttribute("cursor", "pointer");

  const label = isLabel
    ? truncate(commit.subject, 28)
    : commit.hashAbbrev;

  const text = document.createElementNS(SVG_NAMESPACE, "text");
  text.setAttribute("x", (x + (isLabel ? 12 : width / 2)).toString());
  text.setAttribute("y", (y + height / 2).toString());
  text.setAttribute("font-size", "12px");
  text.setAttribute("font-family", "Arial, sans-serif");
  text.setAttribute("fill", COLORS.nodeText);
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("text-anchor", isLabel ? "start" : "middle");
  text.setAttribute("cursor", "pointer");
  text.textContent = label;

  // Local hover affordance (the wrapping group forwards the actual click).
  const enter = () => rect.setAttribute("fill", COLORS.nodeHover);
  const leave = () => rect.setAttribute("fill", COLORS.nodeFill);
  rect.addEventListener("mouseenter", enter);
  rect.addEventListener("mouseleave", leave);
  text.addEventListener("mouseenter", enter);
  text.addEventListener("mouseleave", leave);

  g.appendChild(rect);
  g.appendChild(text);

  return g;
}

interface RectOptions {
  width: number;
  height: number;
  borderRadius?: number;
  fill?: string;
  stroke?: string;
}

function createRect(options: RectOptions): SVGRectElement {
  const rect = document.createElementNS(SVG_NAMESPACE, "rect");
  rect.setAttribute("width", options.width.toString());
  rect.setAttribute("height", options.height.toString());

  if (options.borderRadius) {
    rect.setAttribute("rx", options.borderRadius.toString());
  }

  if (options.fill) {
    rect.setAttribute("fill", options.fill || "none");
  }

  if (options.stroke) {
    rect.setAttribute("stroke", options.stroke);
  }

  return rect;
}

interface PathOptions {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  translate?: {
    x: number;
    y: number;
  };
}

function createPath(options: PathOptions): SVGPathElement {
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", options.d);

  if (options.fill) {
    path.setAttribute("fill", options.fill);
  }

  if (options.stroke) {
    path.setAttribute("stroke", options.stroke);
  }

  if (options.strokeWidth) {
    path.setAttribute("stroke-width", options.strokeWidth.toString());
  }

  if (options.strokeDasharray) {
    path.setAttribute("stroke-dasharray", options.strokeDasharray);
  }

  if (options.translate) {
    path.setAttribute(
      "transform",
      `translate(${options.translate.x}, ${options.translate.y})`,
    );
  }

  return path;
}

function createUse(href: string): SVGUseElement {
  const use = document.createElementNS(SVG_NAMESPACE, "use");
  use.setAttribute("href", `#${href}`);
  // xlink:href is deprecated in SVG2, but we keep it for retro-compatibility
  // => https://developer.mozilla.org/en-US/docs/Web/SVG/Element/use#Browser_compatibility
  use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${href}`);

  return use;
}

function createClipPath(): SVGClipPathElement {
  return document.createElementNS(SVG_NAMESPACE, "clipPath");
}

function createDefs(children: SVGElement[]): SVGDefsElement {
  const defs = document.createElementNS(SVG_NAMESPACE, "defs");
  children.forEach((child) => defs.appendChild(child));

  return defs;
}

interface ForeignObjectOptions {
  content: string;
  width: number;
  translate?: {
    x: number;
    y: number;
  };
}

function createForeignObject(
  options: ForeignObjectOptions,
): SVGForeignObjectElement {
  const result = document.createElementNS(SVG_NAMESPACE, "foreignObject");
  result.setAttribute("width", options.width.toString());

  if (options.translate) {
    result.setAttribute("x", options.translate.x.toString());
    result.setAttribute("y", options.translate.y.toString());
  }

  const p = document.createElement("p");
  p.textContent = options.content;
  p.style.fontSize = "12px";
  p.style.color = COLORS.metaText;
  result.appendChild(p);

  return result;
}

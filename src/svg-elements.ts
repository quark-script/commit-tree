export {
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

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const svgNS = "http://www.w3.org/2000/svg";

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
  return text;
}

interface CircleOptions {
  radius: number;
  id?: string;
  fill?: string;
}


function wrapText(text: string, maxWidth: number, lineHeight: string) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = measureTextWidth(currentLine + " " + word);
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function measureTextWidth(text: string) {
  const tempSvg = document.createElementNS(svgNS, "svg");
  const tempText = document.createElementNS(svgNS, "text");
  tempText.setAttribute("font-size", "14px");
  tempText.setAttribute("font-family", "Arial");
  tempText.textContent = text;
  tempSvg.appendChild(tempText);
  document.body.appendChild(tempSvg);
  const width = tempText.getBBox().width;
  document.body.removeChild(tempSvg);
  return width;
}

function createNode(options: CircleOptions): SVGElement {
  const g = document.createElementNS(svgNS, "g");

  // rectangel for the node
  const rect1 = document.createElementNS(svgNS, "rect");
  rect1.setAttribute("x", "-110");
  rect1.setAttribute("y", "10");
  rect1.setAttribute("width", "257");
  rect1.setAttribute("height", "40");
  rect1.setAttribute("rx", "17");
  rect1.setAttribute("ry", "17");
  rect1.setAttribute("fill", "white");
  rect1.setAttribute("stroke", "#9194B3");
  rect1.setAttribute("stroke-width", "1");

  // text for node
  const text = document.createElementNS(svgNS, "text");
  text.setAttribute("x", "40");
  text.setAttribute("y", "35");
  text.setAttribute("font-size", "14px");
  text.setAttribute("font-family", "Arial");
  text.setAttribute("font-weight", "normal");

  const wrappedText = wrapText("F-lambda-rph- INV (rrnD, rrnE) Δ...", 220, 18);
  wrappedText.forEach((line, index) => {
    const tspan = document.createElementNS(svgNS, "tspan");
    tspan.setAttribute("x", "-90");
    tspan.setAttribute("dy", index === 0 ? "0" : "1.2em");
    tspan.textContent = line;
    text.appendChild(tspan);
  });

  // hover tooltip
  const tooltipGroup = document.createElementNS(svgNS, "g");
  tooltipGroup.setAttribute("visibility", "hidden");

  const rect = document.createElementNS(svgNS, "rect");
  rect.setAttribute("x", "-110");
  rect.setAttribute("y", "-100");
  rect.setAttribute("width", "257");
  rect.setAttribute("height", "100");
  rect.setAttribute("rx", "10");
  rect.setAttribute("fill", "#3B4574");

  const genotypeText = document.createElementNS(svgNS, "text");
  genotypeText.setAttribute("x", "-90");
  genotypeText.setAttribute("y", "-70");
  genotypeText.setAttribute("fill", "white");

  const tooltipWrappedText = wrapText("Genotype: F-lambda-rph- INV (rrnD, rrnE) ΔlacI ΔlysA ΔmetA", 220, 18);
  tooltipWrappedText.forEach((line, index) => {
    const tspan = document.createElementNS(svgNS, "tspan");
    tspan.setAttribute("x", "-90");
    tspan.setAttribute("dy", index === 0 ? "0" : "1.2em");
    tspan.textContent = line;
    genotypeText.appendChild(tspan);
  })

  const speciesText = document.createElementNS(svgNS, "text");
  speciesText.setAttribute("x", "-90");
  speciesText.setAttribute("y", "-25");
  speciesText.setAttribute("fill", "white");
  speciesText.textContent = "Species: Escherichia coli";

  const arrow = document.createElementNS(svgNS, "polygon");
  arrow.setAttribute("points", "-10,-1 10,-1 0,10"); // Adjust the points to position the triangle
  arrow.setAttribute("fill", "#3B4574");
  arrow.setAttribute("transform", "translate(13, 0)"); // Adjust to position the arrow below the tooltip


  tooltipGroup.appendChild(rect);
  tooltipGroup.appendChild(genotypeText);
  tooltipGroup.appendChild(speciesText);
  tooltipGroup.appendChild(arrow);

  g.appendChild(rect1);
  g.appendChild(text);
  g.appendChild(tooltipGroup);

  g.addEventListener('mouseenter', () => {
    tooltipGroup.setAttribute("visibility", "visible");
  });

  g.addEventListener('mouseleave', () => {
    tooltipGroup.setAttribute("visibility", "hidden");
  });

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
  result.appendChild(p);

  return result;
}

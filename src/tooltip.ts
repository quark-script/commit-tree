import type { Commit } from "./gitgraph-core/src/index";
import { formatToUserLocalTime } from "./gitgraph-core/src/utils";

import { createG, createPath, COLORS, SVG_NAMESPACE } from "./svg-elements";

export { createTooltip, PADDING };

const PADDING = 10;
const OFFSET = 10;

/**
 * Build the hover tooltip for a commit.
 *
 * Beyond the upstream "hash - subject" tooltip, this renders commit metadata
 * (author and formatted date) on a second line when available, and grows the
 * speech bubble to fit. The bubble path is recomputed from the measured text
 * width once the text is in the DOM.
 */
function createTooltip(commit: Commit): SVGElement {
  const path = createPath({ d: "", fill: COLORS.tooltipBubble });

  const lines = [`${commit.hashAbbrev} · ${commit.subject}`];
  const meta = [commit.author && commit.author.name, formatToUserLocalTime(commit.date)]
    .filter(Boolean)
    .join("   ·   ");
  if (meta) lines.push(meta);

  const hasMeta = lines.length > 1;
  const boxHeight = hasMeta ? 58 : 44;

  const text = document.createElementNS(SVG_NAMESPACE, "text");
  text.setAttribute("fill", COLORS.tooltipBubbleText);
  lines.forEach((line, index) => {
    const tspan = document.createElementNS(SVG_NAMESPACE, "tspan");
    tspan.setAttribute("x", (OFFSET + PADDING).toString());
    if (index === 0) {
      tspan.setAttribute("y", (hasMeta ? -6 : 0).toString());
      tspan.setAttribute("font-size", "13px");
    } else {
      tspan.setAttribute("dy", "1.5em");
      tspan.setAttribute("font-size", "11px");
      tspan.setAttribute("fill", "#6B6B6B");
    }
    tspan.textContent = line;
    text.appendChild(tspan);
  });

  const commitSize = commit.style.dot.size * 2;
  const tooltip = createG({
    translate: { x: commitSize, y: commitSize / 2 },
    children: [path],
  });

  const observer = new MutationObserver(() => {
    const { width } = text.getBBox();

    const radius = 5;
    const boxWidth = OFFSET + width + 2 * PADDING;

    const pathD = [
      "M 0,0",
      `L ${OFFSET},${OFFSET}`,
      `V ${boxHeight / 2 - radius}`,
      `Q ${OFFSET},${boxHeight / 2} ${OFFSET + radius},${boxHeight / 2}`,
      `H ${boxWidth - radius}`,
      `Q ${boxWidth},${boxHeight / 2} ${boxWidth},${boxHeight / 2 - radius}`,
      `V -${boxHeight / 2 - radius}`,
      `Q ${boxWidth},-${boxHeight / 2} ${boxWidth - radius},-${boxHeight / 2}`,
      `H ${OFFSET + radius}`,
      `Q ${OFFSET},-${boxHeight / 2} ${OFFSET},-${boxHeight / 2 - radius}`,
      `V -${OFFSET}`,
      "z",
    ].join(" ");

    path.setAttribute("d", pathD.toString());
  });

  observer.observe(tooltip, {
    attributes: false,
    subtree: false,
    childList: true,
  });

  tooltip.appendChild(text);

  return tooltip;
}

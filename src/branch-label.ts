import type { Branch, Commit } from "./gitgraph-core/src/index";
import { createG, createRect, createText, COLORS } from "./svg-elements";

export { createBranchLabel, PADDING_X, PADDING_Y };

const PADDING_X = 10;
const PADDING_Y = 5;

/**
 * Render a branch label (the pill showing the branch name at its tip).
 *
 * Deleted branches (empty name) are drawn in the "deleted" color so they read
 * as removed rather than active. The box is sized from the measured text once
 * it is in the DOM, then the caller positions it in the message column.
 */
function createBranchLabel(branch: Branch, commit: Commit): SVGElement {
  const isDeleted = branch.isDeleted();
  const strokeColor = isDeleted
    ? COLORS.deletedBranch
    : branch.style.label.strokeColor || commit.style.color;
  const textColor = isDeleted
    ? COLORS.deletedBranch
    : branch.style.label.color || commit.style.color;
  const name = isDeleted ? "deleted" : branch.name;

  const rect = createRect({
    width: 0,
    height: 0,
    borderRadius: branch.style.label.borderRadius,
    stroke: strokeColor,
    fill: branch.style.label.bgColor,
  });
  const text = createText({
    content: name,
    translate: {
      x: PADDING_X,
      y: 0,
    },
    font: branch.style.label.font,
    fill: textColor,
  });

  const branchLabel = createG({ children: [rect] });

  const observer = new MutationObserver(() => {
    const { height, width } = text.getBBox();

    const boxWidth = width + 2 * PADDING_X;
    const boxHeight = height + 2 * PADDING_Y;

    rect.setAttribute("width", boxWidth.toString());
    rect.setAttribute("height", boxHeight.toString());
    text.setAttribute("y", (boxHeight / 2).toString());
  });

  observer.observe(branchLabel, {
    attributes: false,
    subtree: false,
    childList: true,
  });

  // Add text after observer is set up => react based on text size.
  branchLabel.appendChild(text);

  return branchLabel;
}

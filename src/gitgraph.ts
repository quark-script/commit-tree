import {
  GitgraphCore,
  MergeStyle,
  arrowSvgPath,
  toSvgPath,
  Mode,
  Orientation,
  TemplateName,
  templateExtend,
} from "./gitgraph-core/src/index";
import type {
  GitgraphOptions,
  Commit,
  GitgraphCommitOptions,
  RenderedData,
  Coordinate,
  BranchUserApi,
  GitgraphBranchOptions,
  GitgraphTagOptions,
  GitgraphMergeOptions,
} from "./gitgraph-core/src/index";
import { formatToUserLocalTime } from "./gitgraph-core/src/utils";

import {
  createSvg,
  createG,
  createText,
  createNode,
  createPath,
  COLORS,
  SVG_NAMESPACE,
  NodeStyle,
} from "./svg-elements";
import {
  createBranchLabel,
  PADDING_X as BRANCH_LABEL_PADDING_X,
  PADDING_Y as BRANCH_LABEL_PADDING_Y,
} from "./branch-label";
import { createTag, PADDING_X as TAG_PADDING_X } from "./tag";
import { createTooltip, PADDING as TOOLTIP_PADDING } from "./tooltip";

type CommitOptions = GitgraphCommitOptions<SVGElement>;
type BranchOptions = GitgraphBranchOptions<SVGElement>;
type TagOptions = GitgraphTagOptions<SVGElement>;
type MergeOptions = GitgraphMergeOptions<SVGElement>;
type Branch = BranchUserApi<SVGElement>;

/**
 * Options accepted by {@link createGitgraph}, extending the core options with
 * rendering choices added by this library.
 */
type CommitTreeOptions = GitgraphOptions & {
  /** Fit the graph responsively to its container. */
  responsive?: boolean;
  /** Commit node rendering. Defaults to `"hash"`. See {@link NodeStyle}. */
  nodeStyle?: NodeStyle;
  /** Render the branch color legend above the graph. Defaults to `true`. */
  legend?: boolean;
};

export {
  createGitgraph,
  Mode,
  Orientation,
  TemplateName,
  templateExtend,
  MergeStyle,
};
export type {
  CommitOptions,
  CommitTreeOptions,
  Branch,
  BranchOptions,
  TagOptions,
  MergeOptions,
  NodeStyle,
};

interface CommitYWithOffsets {
  [key: number]: number;
}

function createGitgraph(
  graphContainer: HTMLElement,
  options?: CommitTreeOptions,
) {
  let commitsElements: {
    [commitHash: string]: {
      branchLabel: SVGGElement | null;
      tags: SVGGElement[];
      message: SVGGElement | null;
    };
  } = {};
  // Store a map to replace commits y with the correct value,
  // including the message offset. Allows custom, flexible message height.
  // E.g. {20: 30} means for commit: y=20 -> y=30
  // Offset should be computed when graph is rendered (componentDidUpdate).
  let commitYWithOffsets: CommitYWithOffsets = {};
  let shouldRecomputeOffsets = false;
  let lastData: RenderedData<SVGElement>;
  let $commits: SVGElement;
  let commitMessagesX = 0;
  let $tooltip: SVGElement | null = null;

  const nodeStyle: NodeStyle = (options && options.nodeStyle) || "hash";
  const showLegend = !(options && options.legend === false);

  // Create an `svg` context in which we'll render the graph.
  const svg = createSvg();
  adaptSvgOnUpdate(Boolean(options && options.responsive));
  graphContainer.appendChild(svg);

  if (options && options.responsive) {
    graphContainer.setAttribute(
      "style",
      "display:inline-block; position: relative; width:100%; padding-bottom:100%; vertical-align:middle; overflow:hidden;",
    );
  }

  // React on gitgraph updates to re-render the graph.
  const gitgraph = new GitgraphCore(options);

  gitgraph.subscribe((data) => {
    shouldRecomputeOffsets = true;
    render(data);
  });

  // Return usable API for end-user.
  return gitgraph.getUserApi();

  function render(data: RenderedData<SVGElement>): void {
    // Reset before new rendering to flush previous state.
    commitsElements = {};

    const { commits, branchesPaths } = data;
    commitMessagesX = data.commitMessagesX;

    // Store data so we can re-render after offsets are computed.
    lastData = data;

    if (showLegend) renderBranchesLegend(branchesPaths);

    // Store $commits so we can compute offsets from actual height.
    $commits = renderCommits(commits);

    // Reset SVG with new content.
    svg.innerHTML = "";
    svg.appendChild(
      createG({
        // Translate the graph so left-most nodes and top-most tooltips are not
        // cropped by the viewBox (which starts at 0,0).
        translate: { x: 60, y: 70 },
        children: [renderBranchesPaths(branchesPaths), $commits],
      }),
    );
  }

  function adaptSvgOnUpdate(adaptToContainer: boolean): void {
    const observer = new MutationObserver(() => {
      if (shouldRecomputeOffsets) {
        shouldRecomputeOffsets = false;
        computeOffsets();
        render(lastData);
      } else {
        positionCommitsElements();
        adaptGraphDimensions(adaptToContainer);
      }
    });

    observer.observe(svg, {
      attributes: false,
      // Listen to subtree changes to react when we append the tooltip.
      subtree: true,
      childList: true,
    });

    function computeOffsets(): void {
      const commits: Element[] = Array.from($commits.children);
      let totalOffsetY = 0;

      // In VerticalReverse orientation, commits are in the same order in the DOM.
      const orientedCommits =
        gitgraph.orientation === Orientation.VerticalReverse
          ? commits
          : commits.reverse();

      commitYWithOffsets = orientedCommits.reduce<CommitYWithOffsets>(
        (newOffsets, commit) => {
          const commitY = parseInt(
            commit.getAttribute("transform")!.split(",")[1].slice(0, -1),
            10,
          );

          const firstForeignObject = commit.getElementsByTagName(
            "foreignObject",
          )[0];
          const customHtmlMessage =
            firstForeignObject && firstForeignObject.firstElementChild;

          newOffsets[commitY] = commitY + totalOffsetY;

          // Increment total offset after setting the offset
          // => offset next commits accordingly.
          totalOffsetY += getMessageHeight(customHtmlMessage);

          return newOffsets;
        },
        {},
      );
    }

    function positionCommitsElements(): void {
      if (gitgraph.isHorizontal) {
        // Elements don't appear on horizontal mode, yet.
        return;
      }

      const padding = 10;

      // Ensure commits elements (branch labels, message…) are well positionned.
      // It can't be done at render time since elements size is dynamic.
      Object.keys(commitsElements).forEach((commitHash) => {
        const { branchLabel, tags, message } = commitsElements[commitHash];

        // We'll store X position progressively and translate elements.
        let x = commitMessagesX;

        if (branchLabel) {
          moveElement(branchLabel, x);

          // BBox width misses box padding
          // => they are set later, on branch label update.
          // We would need to make branch label update happen before to solve it.
          const branchLabelWidth =
            branchLabel.getBBox().width + 2 * BRANCH_LABEL_PADDING_X;
          x += branchLabelWidth + padding;
        }

        tags.forEach((tag) => {
          moveElement(tag, x);

          // BBox width misses box padding and offset
          // => they are set later, on tag update.
          // We would need to make tag update happen before to solve it.
          const offset = parseFloat(tag.getAttribute("data-offset") || "0");
          const tagWidth = tag.getBBox().width + 2 * TAG_PADDING_X + offset;
          x += tagWidth + padding;
        });

        if (message) {
          moveElement(message, x);
        }
      });
    }

    function adaptGraphDimensions(adaptToContainer: boolean): void {
      const { height, width } = svg.getBBox();

      // FIXME: In horizontal mode, we mimic @gitgraph/react behavior
      // => it gets re-rendered after offsets are computed
      // => it applies paddings twice!
      //
      // It works… by chance. Technically, we should compute what would
      // *actually* go beyond the computed limits of the graph.
      const horizontalCustomOffset = 50;
      const verticalCustomOffset = 20;

      const widthOffset = gitgraph.isHorizontal
        ? horizontalCustomOffset
        : // Add `TOOLTIP_PADDING` so we don't crop the tooltip text.
        // Add `BRANCH_LABEL_PADDING_X` so we don't cut branch label.
        BRANCH_LABEL_PADDING_X + TOOLTIP_PADDING;

      const heightOffset = gitgraph.isHorizontal
        ? horizontalCustomOffset
        : // Add `TOOLTIP_PADDING` so we don't crop tooltip text
        // Add `BRANCH_LABEL_PADDING_Y` so we don't crop branch label.
        BRANCH_LABEL_PADDING_Y + TOOLTIP_PADDING + verticalCustomOffset;

      if (adaptToContainer) {
        svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
        svg.setAttribute(
          "viewBox",
          `0 0 ${width + widthOffset} ${height + heightOffset}`,
        );
      } else {
        svg.setAttribute("width", (width + widthOffset).toString());
        svg.setAttribute("height", (height + heightOffset).toString());
      }
    }
  }

  function moveElement(target: Element, x: number): void {
    const transform = target.getAttribute("transform") || "translate(0, 0)";
    target.setAttribute(
      "transform",
      transform.replace(/translate\(([\d\.]+),/, `translate(${x},`),
    );
  }

  function renderBranchesPaths(
    branchesPaths: RenderedData<SVGElement>["branchesPaths"],
  ): SVGElement {
    const offset = gitgraph.template.commit.dot.size;
    const isBezier = gitgraph.template.branch.mergeStyle === MergeStyle.Bezier;

    const paths = Array.from(branchesPaths).map(([branch, coordinates]) => {
      const isDeleted = branch.isDeleted();
      return createPath({
        d: toSvgPath(
          coordinates.map((coordinate) => coordinate.map(getWithCommitOffset)),
          isBezier,
          gitgraph.isVertical,
        ),
        fill: "none",
        // Deleted-branch marker: removed branches keep their commits but their
        // path is drawn in the "deleted" color and dashed.
        stroke: isDeleted ? COLORS.deletedBranch : branch.computedColor || "",
        strokeWidth: branch.style.lineWidth,
        strokeDasharray: isDeleted ? "6 4" : undefined,
        translate: {
          x: offset,
          y: offset,
        },
      });
    });

    return createG({ children: paths });
  }

  /**
   * Render a compact legend of branch names/colors above the graph.
   *
   * Because commit nodes show hashes rather than branch names, the legend keeps
   * the branch <-> color mapping legible. Entries wrap three-per-row.
   */
  function renderBranchesLegend(
    branchesPaths: RenderedData<SVGElement>["branchesPaths"],
  ): void {
    const existing = graphContainer.querySelector(".branch-legends-container");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.className = "branch-legends-container";

    const entries = Array.from(branchesPaths);
    for (let i = 0; i < entries.length; i += 3) {
      const row = document.createElement("div");
      row.className = "legend-row";

      for (let j = 0; j < 3 && i + j < entries.length; j++) {
        const [branch] = entries[i + j];
        const isDeleted = branch.isDeleted();
        const color = isDeleted ? COLORS.deletedBranch : branch.computedColor;
        const name = isDeleted ? "deleted" : branch.name;

        const item = document.createElement("div");
        item.className = "legend-item";

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        if (color) dot.style.backgroundColor = color;

        const label = document.createElement("span");
        label.className = "legend-label";
        label.textContent = name;
        label.setAttribute("title", name);

        item.appendChild(dot);
        item.appendChild(label);
        row.appendChild(item);
      }

      container.appendChild(row);
    }

    graphContainer.insertBefore(container, svg);
  }

  function renderCommits(commits: Commit[]): SVGGElement {
    return createG({ children: commits.map(renderCommit) });

    function renderCommit(commit: Commit): SVGGElement {
      const { x, y } = getWithCommitOffset(commit);

      // Message, branch labels and tags live in a sibling group so CSS can
      // emphasise the commit title when its node is hovered.
      const messageGroup = createG({
        translate: { x: -x, y: 0 },
        children: [
          renderMessage(commit),
          ...renderBranchLabels(commit),
          ...renderTags(commit),
        ],
      });
      messageGroup.classList.add("commit-message-group");

      return createG({
        translate: { x, y },
        children: [
          renderDot(commit),
          ...renderArrows(commit),
          renderLeaderLine(commit, x),
          messageGroup,
        ],
      });
    }

    // Faint horizontal leader line bridging a commit's node and its title
    // column, so the eye can follow the node across to its message.
    function renderLeaderLine(commit: Commit, x: number): SVGElement | null {
      if (gitgraph.isHorizontal) return null;

      const startX = 52; // just right of the node pill
      const endX = commitMessagesX - x - 6; // stop just before the title column
      if (endX <= startX) return null; // node sits too close to the title

      const line = document.createElementNS(SVG_NAMESPACE, "line");
      line.setAttribute("x1", startX.toString());
      line.setAttribute("y1", "14"); // vertical centre of node and title
      line.setAttribute("x2", endX.toString());
      line.setAttribute("y2", "14");
      line.setAttribute("class", "commit-leader-line");
      return line;
    }

    function renderArrows(commit: Commit): Array<SVGElement | null> {
      if (!gitgraph.template.arrow.size) {
        return [null];
      }

      const commitRadius = commit.style.dot.size;

      return commit.parents.map((parentHash) => {
        const parent = commits.find(({ hash }) => hash === parentHash);
        if (!parent) return null;

        // Starting point, relative to commit
        const origin = gitgraph.reverseArrow
          ? {
            x: commitRadius + (parent.x - commit.x),
            y: commitRadius + (parent.y - commit.y),
          }
          : { x: commitRadius, y: commitRadius };

        const path = createPath({
          d: arrowSvgPath(gitgraph, parent, commit),
          fill: gitgraph.template.arrow.color || "",
        });

        return createG({ translate: origin, children: [path] });
      });
    }
  }

  function renderMessage(commit: Commit): SVGElement | null {
    if (!commit.style.message.display) {
      return null;
    }

    let message;

    if (commit.renderMessage) {
      message = createG({ children: [] });

      // Add message after observer is set up => react based on body height.
      adaptMessageBodyHeight(message);
      message.appendChild(commit.renderMessage(commit));

      setMessageRef(commit, message);

      return message;
    }

    const text = createText({
      content: commit.subject,
      fill: commit.style.message.color || "",
      font: commit.style.message.font,
      onClick: commit.onMessageClick,
    });
    text.classList.add("commit-title-text");

    message = createG({
      translate: { x: 0, y: commit.style.dot.size },
      children: [text],
    });

    const metaBlock = createMetaBlock(commit);
    if (metaBlock) {
      // Add block after observer is set up => react based on body height.
      adaptMessageBodyHeight(message);
      message.appendChild(metaBlock);
    }

    setMessageRef(commit, message);

    return message;
  }

  /**
   * Build the per-commit metadata block (date + author) shown under the title.
   *
   * Returns `null` when the commit carries neither, so the title renders alone.
   */
  function createMetaBlock(commit: Commit): SVGForeignObjectElement | null {
    const date = formatToUserLocalTime(commit.date);
    const rawAuthor = (commit.author && commit.author.name) || "";
    const author = rawAuthor
      ? rawAuthor.charAt(0).toUpperCase() + rawAuthor.slice(1)
      : "";

    if (!date && !author) return null;

    const fo = document.createElementNS(SVG_NAMESPACE, "foreignObject");
    fo.setAttribute("width", "600");
    fo.setAttribute("height", "40");
    fo.setAttribute("x", "0");
    fo.setAttribute("y", "9");
    fo.style.overflow = "visible";

    const container = document.createElement("div");
    container.style.fontSize = "12px";
    container.style.color = COLORS.metaText;
    container.style.display = "flex";
    container.style.flexDirection = "column";

    if (date) {
      const dateEl = document.createElement("div");
      dateEl.textContent = date;
      container.appendChild(dateEl);
    }

    if (author) {
      const authorEl = document.createElement("div");
      const key = document.createElement("span");
      key.textContent = "Author: ";
      key.style.color = COLORS.metaLabel;
      const value = document.createElement("span");
      value.textContent = author;
      authorEl.appendChild(key);
      authorEl.appendChild(value);
      container.appendChild(authorEl);
    }

    fo.appendChild(container);
    return fo;
  }

  function adaptMessageBodyHeight(message: SVGElement): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(({ target }) => setChildrenForeignObjectHeight(target));
    });

    observer.observe(message, {
      attributes: false,
      subtree: false,
      childList: true,
    });

    function setChildrenForeignObjectHeight(node: Node): void {
      if (node.nodeName === "foreignObject") {
        // We have to access the first child's parentElement to retrieve
        // the Element instead of the Node => we can compute dimensions.
        const foreignObject = node.firstChild && node.firstChild.parentElement;
        if (!foreignObject) return;

        // Force the height of the foreignObject (browser issue)
        foreignObject.setAttribute(
          "height",
          getMessageHeight(foreignObject.firstElementChild).toString(),
        );
      }

      node.childNodes.forEach(setChildrenForeignObjectHeight);
    }
  }

  function renderBranchLabels(commit: Commit): Array<SVGElement | null> {
    // @gitgraph/core could compute branch labels into commits directly.
    // That will make it easier to retrieve them, just like tags.
    const branches = Array.from(gitgraph.branches.values());
    return branches.map((branch) => {
      if (!branch.style.label.display) return null;

      if (!gitgraph.branchLabelOnEveryCommit) {
        const commitHash = gitgraph.refs.getCommit(branch.name);
        if (commit.hash !== commitHash) return null;
      }

      // For the moment, we don't handle multiple branch labels.
      // To do so, we'd need to reposition each of them appropriately.
      if (commit.branchToDisplay !== branch.name) return null;

      const branchLabel = branch.renderLabel
        ? branch.renderLabel(branch)
        : createBranchLabel(branch, commit);

      let branchLabelContainer;
      if (gitgraph.isVertical) {
        branchLabelContainer = createG({
          children: [branchLabel],
        });
      } else {
        const commitDotSize = commit.style.dot.size * 2;
        const horizontalMarginTop = 10;

        branchLabelContainer = createG({
          translate: { x: commit.x, y: commitDotSize + horizontalMarginTop },
          children: [branchLabel],
        });
      }

      setBranchLabelRef(commit, branchLabelContainer);

      return branchLabelContainer;
    });
  }

  function renderTags(commit: Commit): SVGGElement[] {
    if (!commit.tags) return [];
    if (gitgraph.isHorizontal) return [];

    return commit.tags.map((tag) => {
      const tagElement = tag.render
        ? tag.render(tag.name, tag.style)
        : createTag(tag);
      const tagContainer = createG({
        translate: { x: 0, y: commit.style.dot.size },
        children: [tagElement],
      });
      // `data-offset` is used to position tag element in `positionCommitsElements`.
      // => because when it's executed, tag offsets are not resolved yet
      tagContainer.setAttribute("data-offset", tag.style.pointerWidth.toString());

      setTagRef(commit, tagContainer);

      return tagContainer;
    });
  }

  function renderDot(commit: Commit): SVGElement {
    if (commit.renderDot) {
      return commit.renderDot(commit);
    }

    const node = createNode(commit, { nodeStyle });

    const dotText = commit.dotText
      ? createText({
        content: commit.dotText,
        font: commit.style.dot.font,
        anchor: "middle",
        translate: { x: commit.style.dot.size, y: commit.style.dot.size },
      })
      : null;

    const dotGroup = createG({
      onClick: commit.onClick,
      onMouseOver: () => {
        appendTooltipToGraph(commit);
        commit.onMouseOver();
      },
      onMouseOut: () => {
        if ($tooltip) $tooltip.remove();
        commit.onMouseOut();
      },
      children: [node, dotText],
    });
    // Marker used by CSS to emphasise the sibling commit title on hover.
    dotGroup.classList.add("commit-node");
    return dotGroup;
  }

  function appendTooltipToGraph(commit: Commit): void {
    if (!svg.firstChild) return;

    const tooltip = commit.renderTooltip
      ? commit.renderTooltip(commit)
      : createTooltip(commit);

    $tooltip = createG({
      translate: getWithCommitOffset(commit),
      children: [tooltip],
    });

    svg.firstChild.appendChild($tooltip);
  }

  function getWithCommitOffset({ x, y }: Coordinate): Coordinate {
    return { x, y: commitYWithOffsets[y] || y };
  }

  function setBranchLabelRef(commit: Commit, branchLabels: SVGGElement): void {
    if (!commitsElements[commit.hashAbbrev]) {
      initCommitElements(commit);
    }

    commitsElements[commit.hashAbbrev].branchLabel = branchLabels;
  }

  function setMessageRef(commit: Commit, message: SVGGElement | null): void {
    if (!commitsElements[commit.hashAbbrev]) {
      initCommitElements(commit);
    }

    commitsElements[commit.hashAbbrev].message = message;
  }

  function setTagRef(commit: Commit, tag: SVGGElement): void {
    if (!commitsElements[commit.hashAbbrev]) {
      initCommitElements(commit);
    }

    commitsElements[commit.hashAbbrev].tags.push(tag);
  }

  function initCommitElements(commit: Commit): void {
    commitsElements[commit.hashAbbrev] = {
      branchLabel: null,
      tags: [],
      message: null,
    };
  }
}

function getMessageHeight(message: Element | null): number {
  let messageHeight = 0;

  if (message) {
    const height = message.getBoundingClientRect().height;
    const marginTopInPx = window.getComputedStyle(message).marginTop || "0px";
    const marginTop = parseInt(marginTopInPx.replace("px", ""), 10);

    messageHeight = height + marginTop;
  }

  return messageHeight;
}

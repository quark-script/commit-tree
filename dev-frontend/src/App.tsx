import { useEffect, useRef, useState } from "react";
import "./App.css";
import "../../src/commit-tree.css";
import { createGitgraph } from "../../src/index";
import type { NodeStyle } from "../../src/index";

/**
 * Build a graph that exercises every feature the library adds on top of
 * gitgraph.js:
 *
 * - merge-commit indicators (dashed ring around merge nodes)
 * - deleted-branch markers  (red dashed path for `hotfix`, deleted below)
 * - metadata tooltips       (hover a node for author/date; also shown inline)
 * - dynamic graph sizing     (the long feature message grows its row)
 */
function buildGraph(container: HTMLElement, nodeStyle: NodeStyle) {
  container.innerHTML = "";
  const gitgraph = createGitgraph(container, {
    nodeStyle,
    author: "vipul <vipul@cellrepo.dev>",
  });

  const main = gitgraph.branch("main");
  main.commit({
    subject: "Initial project scaffold",
    author: "vipul",
    date: "2024-01-04T09:12:00Z",
  });
  main.commit({
    subject: "Set up CI and linting",
    author: "vipul",
    date: "2024-01-06T14:20:00Z",
  });

  const develop = main.branch("develop");
  develop.commit({
    subject: "Add data access layer",
    author: "asha",
    date: "2024-01-08T10:05:00Z",
  });

  const feature = develop.branch("feature/graph");
  feature.commit({
    subject:
      "Render branches and commits with dynamic, variable-height message rows",
    author: "vipul",
    date: "2024-01-10T11:00:00Z",
  });
  feature.commit({
    subject: "Add merge-commit indicators and hover tooltips",
    author: "vipul",
    date: "2024-01-11T16:30:00Z",
  });

  // Merge feature into develop -> merge-commit indicator.
  develop.merge({
    branch: feature,
    commitOptions: {
      subject: "Merge feature/graph into develop",
      author: "vipul",
      date: "2024-01-12T09:00:00Z",
    },
  });

  // A short-lived hotfix that gets merged and then deleted -> deleted marker.
  const hotfix = main.branch("hotfix/login");
  hotfix.commit({
    subject: "Patch auth redirect loop",
    author: "asha",
    date: "2024-01-09T08:00:00Z",
  });
  main.merge({
    branch: hotfix,
    commitOptions: {
      subject: "Merge hotfix/login into main",
      author: "asha",
      date: "2024-01-09T18:00:00Z",
    },
  });
  hotfix.delete();

  // Release: fold develop back into main.
  main.merge({
    branch: develop,
    commitOptions: {
      subject: "Release 1.0: merge develop into main",
      author: "vipul",
      date: "2024-01-13T10:00:00Z",
    },
  });

  return gitgraph;
}

function App() {
  const ref = useRef<HTMLDivElement>(null);
  const [nodeStyle, setNodeStyle] = useState<NodeStyle>("hash");

  useEffect(() => {
    if (ref.current) buildGraph(ref.current, nodeStyle);
  }, [nodeStyle]);

  return (
    <div className="demo">
      <header className="demo-header">
        <h1>commit-tree</h1>
        <label>
          Node style{" "}
          <select
            value={nodeStyle}
            onChange={(event) => setNodeStyle(event.target.value as NodeStyle)}
          >
            <option value="hash">hash</option>
            <option value="label">label</option>
          </select>
        </label>
      </header>
      <div id="gitgraph" ref={ref} />
    </div>
  );
}

export default App;

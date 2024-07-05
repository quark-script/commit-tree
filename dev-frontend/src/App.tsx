
import { useEffect } from 'react';
import './App.css'
import { createGitgraph } from "/home/vipulchaudhary/Desktop/Projects/gitgraph.js/packages/gitgraph-js";

function App() {
  useEffect(() => {
    const graphContainer = document.getElementById("gitgraph");
    graphContainer!.innerHTML = "";
    const gitgraph = createGitgraph(graphContainer!);

    const response = [
      {
        branch: "main",
        commit_data: {
          title: "",
          date: ""
        },
      },
      {
        branch: "main",
        commit_data: {
          title: "",
          date: ""
        },
      },
      {
        branch: "main",
        commit_data: {
          title: "",
          date: ""
        },
      },
      {
        branch: "develop",
        source_branch: "main",
        commit_data: {
          title: "",
          date: ""
        },
      },
      {
        branch: "develop",
        commit_data: {
          title: "",
          date: ""
        },
      },
      {
        branch: "feature",
        source_branch: "main",
        commit_data: {
          title: "",
          date: ""
        },
      },
      {
        branch: "feature",
        commit_data: {
          title: "",
          date: ""
        },
        merge_branch: "main"
      },
    ]

    const map = new Map();

    const main = gitgraph.branch("main");
    map.set("main", main);

    response.forEach((data) => {
      let commitBranch;
      if (map.has(data.branch)) {
        commitBranch = map.get(data.branch);
      }
      else {
        const sourceBranch = map.get(data.source_branch);
        commitBranch = sourceBranch.branch(data.branch);
        map.set(data.branch, commitBranch);
      }

      if (data.merge_branch) {
        const targetBranch = map.get(data.branch);
        const sourceBranch = map.get(data.merge_branch);

        targetBranch.merge(sourceBranch);
      }
      else {
        commitBranch.commit();
      }
    })
  }, [])

  return (
    <div id="gitgraph"></div>
  )
}

export default App

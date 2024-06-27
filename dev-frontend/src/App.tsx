
import { useEffect } from 'react';
import './App.css'
import { createGitgraph } from "/home/vipulchaudhary/Desktop/Projects/gitgraph.js/packages/gitgraph-js";

function App() {
  useEffect(() => {
    const graphContainer = document.getElementById("gitgraph");
    graphContainer!.innerHTML = "";
    const gitgraph = createGitgraph(graphContainer!);

    const master = gitgraph.branch("master");
    master.commit("Init the project");

    const newBranch = master.branch("new-branch");
    newBranch.commit("Add a file").commit("Add another file").commit("Do something else").commit("Do something else");
    master
      .commit("Add README")
      .commit("Add tests")
      .commit("Implement feature");
    master.tag("v1.0");
    const newBranch2 = master.branch("new-branch2");
    newBranch2.commit("Add a file").commit("Add another file").commit("Do something else").commit("Do something else");
  
    const newBranch3 = master.branch("new-branch3");
    newBranch3.commit("Add a file").commit("Add another file").commit("Do something else").commit("Do something else");


    

    const develop = gitgraph.branch("develop");
    develop.commit("Implement a feature").commit("Add tests").commit("Fix tests");

    develop.merge(newBranch, "Release new version");

    const newFeature = master.branch("new-feature");
    newFeature.merge(develop, "Release new version");
    newFeature.commit("Implement an awesome feature");
    master.commit("Hotfix a bug");
    newFeature.commit("Fix tests");

    master.merge(newFeature, "Release new version");

    console.log(gitgraph);

  }, [])

  return (
    <div id="gitgraph"></div>
  )
}

export default App

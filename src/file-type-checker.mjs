import { logMinimizer } from "./helpers.mjs"

async function fileTypeChecker(core, github, octokit, exec) {
    const changed_files = await getChangedFiles(github.context, octokit)
    logMinimizer(core, "Changed Files", changed_files)

    const file_tree = await getFileTree(github, octokit, core)
    logMinimizer(core, "File Tree", file_tree)

    for (let i = 0; i < changed_files.length; i++) {
      const file_path = changed_files[i]

      core.info(`Checking file '${file_path}' ...`)
      const file = tree.find(file => file.path === path);
      if (!file) {
        core.error(`File not found at path: ${path}`)
        throw new Error(`File not found at path: ${path}`);
      }


    }
    return true
}

async function getChangedFiles(context, octokit) {
  // get a list of changed files in a PR
  const owner = context.payload.repository.owner.login
  const repo = context.payload.repository.name
  const pr_number = context.payload.pull_request.number
  
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pr_number,
  })
  
  const changed_files = files.map((file) => file.filename)
  return changed_files
}

// function getFileType(_file_path) {
//   try {
//     const { exec_file } = require('child_process')
//     // Execute the 'file' command on the file and capture its output
//     return exec_file(`file ${_file_path}`).toString()
//   } 
//   catch (error) { return null }
// }

// async function getFileType(filePath, exec, core) {
//   // // Check if file exists
//   // try {
//   //   await fs.access(filePath);
//   // } catch (err) {
//   //   throw new Error(`File "${filePath}" not found`);
//   // }

//   // Use the "file" command to determine file type
//   let output = ""
//   let error = ""
//   const options = {}
//   options.listeners = {
//     stdout: (data) => { output += data.toString() },
//     stderr: (data) => { error += data.toString() }
//   }

//   await exec.exec(`file`, ["--mime-type", "--brief", filePath], options);

//   // Check if file is binary or text
//   core.inf(`Output: ${output.trim()}`)
//   core.inf(`Error: ${error.trim()}`)
//   // return output.trim()
//   // return !mimeType.startsWith('text/');
// }
async function getFileTree(github, octokit, core) {
  const { data: { commit: { sha } } } = await octokit.rest.repos.getBranch({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    branch: github.context.payload.pull_request.head.ref
  })

  const { data: { tree } } = await octokit.rest.git.getTree({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    tree_sha: sha
  })

  return tree
}

export { fileTypeChecker }


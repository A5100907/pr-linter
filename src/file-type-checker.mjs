import { logMinimizer } from "./helpers.mjs"

async function fileTypeChecker(core, github, octokit) {
    // check if file contains text
    const changed_files = await getChangedFiles(github.context, octokit)
    logMinimizer(core, "Changed Files", changed_files)

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

function checkIfFileContainsText(filePath) {
  try {
    const { execSync } = require('child_process')
    // Execute the 'file' command on the file and capture its output
    const fileOutput = execSync(`file ${filePath}`).toString()

    // Check if the output contains the string 'text'
    if (fileOutput.includes('text')) {
      return true
    }
  } catch (error) {
    console.error(`An error occurred while checking file '${filePath}': ${error.message}`)
  }
  
  return false
}

export { fileTypeChecker }

// // Example usage
// const filePathList = ['/path/to/file1.txt', '/path/to/file2.jpg', '/path/to/file3.csv']
// let containsText = false

// for (let i = 0; i < filePathList.length; i++) {
//   const filePath = filePathList[i]
//   const fileContainsText = checkIfFileContainsText(filePath)
//   if (fileContainsText) {
//     containsText = true
//     break
//   }
// }

import { logMinimizer } from "./helpers.mjs"

async function fileTypeChecker(core, github, octokit, fs, exec) {
    const changed_files = await getChangedFiles(github.context, octokit)
    logMinimizer(core, "Changed Files", changed_files)

    core.info("Checking if any of the changed files contain text ...")
    for (let i = 0; i < changed_files.length; i++) {
      const file_path = changed_files[i]
      core.info(`Checking file '${file_path}' ...`)
      const file_type = getFileType(file_path, fs, exec)
      core.info(file_type)

      if(!file_type) { 
        core.warning(`Error processing '${file_path}'!`)
        // TODO error handling
      }
      // if (is_binary) { core.warning(`File '${file_path}' is binary!`) }
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

async function getFileType(filePath, fs, exec) {
  // Check if file exists
  try {
    await fs.access(filePath);
  } catch (err) {
    throw new Error(`File "${filePath}" not found`);
  }

  // Use the "file" command to determine file type
  let output = '';
  const options = {
    listeners: {
      stdout: (data) => {
        output += data.toString();
      },
    },
  };
  await exec(`file --mime-type --brief "${filePath}"`, [], options);

  // Check if file is binary or text
  return output.trim();
  // return !mimeType.startsWith('text/');
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

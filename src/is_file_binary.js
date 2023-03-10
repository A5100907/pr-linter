function checkIfFileContainsText(filePath) {
  try {
    const { execSync } = require('child_process');
    // Execute the 'file' command on the file and capture its output
    const fileOutput = execSync(`file ${filePath}`).toString();

    // Check if the output contains the string 'text'
    if (fileOutput.includes('text')) {
      return true;
    }
  } catch (error) {
    console.error(`An error occurred while checking file '${filePath}': ${error.message}`);
  }
  
  return false;
}

// // Example usage
// const filePathList = ['/path/to/file1.txt', '/path/to/file2.jpg', '/path/to/file3.csv'];
// let containsText = false;

// for (let i = 0; i < filePathList.length; i++) {
//   const filePath = filePathList[i];
//   const fileContainsText = checkIfFileContainsText(filePath);
//   if (fileContainsText) {
//     containsText = true;
//     break;
//   }
// }

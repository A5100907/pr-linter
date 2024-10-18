import { logMinimizer } from "./helpers.mjs"
import { isText, isBinary } from "istextorbinary"
import { parseLinkHeader } from '@web3-storage/parse-link-header'

async function fileTypeChecker(core, github, octokit) {
    // main function to check file types
    let found_binaries = new Array()

    // this gets a list of file objects containing info about each file that was added or edited (not removed) in the pull request
    core.info("Getting changed files ...")
    const changed_files = await getChangedFiles(github.context, octokit, core)

    // this filters out know text files by using file extension. This is a quick check to avoid checking the file type of every file
    // full list of known text extensions can be found here: https://raw.githubusercontent.com/bevry/textextensions/master/source/index.ts
    // every file that did not pass the filter will be checked for binary type using files content (blob) as well as its file extension
    // exclude .nsi file types
    const changed_non_text_files = changed_files.filter(file => {
        // treat .nsi files as text files explicitly to avoid flagging them as binaries
        if (file.filename.endsWith('.nsi')) {
            core.info(`File at path ${file.filename} is a .nsi file, treating it as a text file.`)
            return false;
        }
        return !isText(file.filename)
    }) 
    core.info(`Found ${changed_non_text_files.length} files that needs explicit file type check as they are not defined in the list of known text files`)
    logMinimizer(core, "Changed files to explicitly check for a datatype:", changed_non_text_files.map((item) => item.filename))

    // if initial filter marks all files as text, skip the rest of check
    if (changed_non_text_files.length === 0) { return { result:true, binaries:found_binaries }}

    core.info("Checking file types ...")
    for (let i = 0; i < changed_non_text_files.length; i++) {
        const file_path = changed_non_text_files[i].filename
        const file_sha = changed_non_text_files[i].sha
        // get file blob and confirm it is a binary file
        const file_blob = await getFileBlob(github, octokit, file_sha)
        if (isBinary(file_path, file_blob)) {
            core.error(`File at path: ${file_path} is a binary file`)
            found_binaries.push(file_path)
        }
    }

    if (found_binaries.length > 0) { return { result:false, binaries:found_binaries }}
    return { result:true, binaries:found_binaries }
}

async function getChangedFiles(context, octokit, core) {
    // Obtain a list of files that were modified in the Pull Request
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const pull_number = context.payload.pull_request.number

    let current_page = 1
    let full_files_data = []

    // loop over pages of data
    while (true) {
        // Get a single page
        let response = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number,
            per_page: 100,
            page: current_page
        })

        // add data to a full list
        full_files_data = full_files_data.concat(response.data)

        // get info about next page
        // This checks if there is pagination data, as when GitHub only contains data for a less than a single page, there will be no info for next pages at all
        if(response.headers.link) {
            const parsed = parseLinkHeader(response.headers.link)
            if(!parsed.next) {
                // There are no more pages
                break
            }
        }
        else {
            // There is only one page
            break
        }

        current_page++
    }

    // Filter files that were removed from scm and should be ignored
    const deleted_files_count = full_files_data.filter((item) => item.status === "removed").length

    // Filter files that need to be checked
    const changed_files = full_files_data.filter((item) => item.status !== "removed")

    core.info(`Total files in a Pull Request: ${full_files_data.length}`)
    core.info(`Removed files count: ${deleted_files_count}`)
    core.info(`Added or modified files count: ${changed_files.length}`)

    return changed_files
}

async function getFileBlob(github, octokit, file_sha) {
    // get the blob of a file
    const { data: { content } } = await octokit.rest.git.getBlob({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        file_sha: file_sha
    })
    return Buffer.from(content, 'base64')
}

export { fileTypeChecker }

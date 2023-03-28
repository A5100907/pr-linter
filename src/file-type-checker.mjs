import { logMinimizer } from "./helpers.mjs"
import { isText, isBinary } from "istextorbinary"
import { parseLinkHeader } from '@web3-storage/parse-link-header'

async function fileTypeChecker(core, github, octokit) {
    // main function to check file types
    let found_binaries = new Array()

    core.info("Getting changed files ...")
    const changed_files = await getChangedFiles(github.context, octokit, core)
    core.info(`Found ${changed_files.length} changed files`)

    // this filters out know text files by using file extension. This is a quick check to avoid checking the file type of every file
    // full list of known text extensions can be found here: https://raw.githubusercontent.com/bevry/textextensions/master/source/index.ts
    // every file that did not pass the filter will be checked for binary type using files content (blob) as well as its file extension
    const changed_non_text_files = changed_files.filter(file => !isText(file))
    core.info(`Found ${changed_non_text_files.length} files that needs explicit file type check (non in the list of known text files)`)
    logMinimizer(core, "Changed files to explicitly check for type", changed_non_text_files)

    // if initial filter marks all files as text, skip the rest of check
    if (changed_non_text_files.length === 0) { return { result:true, binaries:found_binaries }}

    core.info("Getting repo's file tree ...")
    const file_tree = await getFileTree(github, octokit, core)
    logMinimizer(core, "file tree:", file_tree)

    core.info("Checking file types ...")
    for (let i = 0; i < changed_non_text_files.length; i++) {
        const file_path = changed_non_text_files[i]
        // Find the file in the file tree
        const file = file_tree.find(file => file.path === file_path)
        if (!file) {
            core.error(`file-type-checker: File not found at path '${file_path}'`)
            // TODO
            // throw new Error(`file-type-checker: File not found at path '${file_path}'`)
        }

        // get file blob and confirm it is a binary file
        const file_blob = await getFileBlob(github, octokit, file.sha)
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
        const parsed = parseLinkHeader(response.headers.link)
        if(!parsed.next) {
            //There are no more pages
            break
        }
        current_page++
    }

    // Filter files that were removed from scm and should be ignored
    const deleted_files = full_files_data
        .filter((item) => item.status === "removed")
        .map((item) => item.filename)

    // Filter files that need to be checked
    const changed_files = full_files_data
        .filter((item) => item.status !== "removed")
        .map((item) => item.filename)

    core.info(`Total files in a Pull Request: ${full_files_data.length}`)
    core.info(`Removed files count: ${deleted_files.length}`)
    core.info(`Added or modified files count: ${changed_files.length}`)

    return changed_files
}

async function getFileTree(github, octokit, core) {
    // get a list of files in the repo
    const { data: { commit: { sha } } } = await octokit.rest.repos.getBranch({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        branch: github.context.payload.pull_request.head.ref
    })
    core.info(`Branch: ${github.context.payload.pull_request.head.ref}`)
    core.info(`SHA: ${sha}`)

    const { data: { tree } } = await octokit.rest.git.getTree({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        tree_sha: sha,
        recursive: true
    })
    return tree
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

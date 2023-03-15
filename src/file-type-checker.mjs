import { logMinimizer } from "./helpers.mjs"
import { isText, isBinary } from "istextorbinary"

async function fileTypeChecker(core, github, octokit) {
    // main function to check file types
    let found_binaries = new Array()

    core.info("Getting changed files ...")
    const changed_files = await getChangedFiles(github.context, octokit)
    core.info(`Found ${changed_files.length} changed files`)
    // this filters out know text files by using file extension
    const changed_non_text_files = changed_files.filter(file => !isText(file))
    core.info(`Found ${changed_non_text_files.length} changed non-text files`)
    logMinimizer(core, "Changed non-text files", changed_non_text_files)

    core.info("Getting repo's file tree ...")
    const file_tree = await getFileTree(github, octokit, core)

    core.info("Checking file types ...")
    for (let i = 0; i < changed_non_text_files.length; i++) {
        // loop over every file

        const file_path = changed_non_text_files[i]
        // Find the file in the file tree
        const file = file_tree.find(file => file.path === file_path)
        if (!file) { 
            core.error(`file-type-checker: File not found at path '${file_path}'`)
            throw new Error(`file-type-checker: File not found at path '${file_path}'`)
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

async function getChangedFiles(context, octokit) {
    // get a list of changed files in a PR
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name
    const head_sha = context.payload.pull_request.head.sha
    const base_sha = context.payload.pull_request.base.sha

    // Get the diff between the head and base commits of the pull request
    const { data: diff } = await octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: base_sha,
        head: head_sha,
    });

    // Extract the list of changed files from the diff
    const changed_files = diff.files.map((file) => file.filename);
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


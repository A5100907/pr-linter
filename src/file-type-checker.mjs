import { logMinimizer } from "./helpers.mjs"
import { isBinary } from "istextorbinary"

async function fileTypeChecker(core, github, octokit) {

  let found_binaries = new Array()

  core.info("Getting changed files ...")
  const changed_files = await getChangedFiles(github.context, octokit)
  logMinimizer(core, "Changed Files", changed_files)

  core.info("Getting repo's file tree ...")
  const file_tree = await getFileTree(github, octokit, core)

  for (let i = 0; i < changed_files.length; i++) {
    const file_path = changed_files[i]
    const file = file_tree.find(file => file.path === file_path);
    if (!file) { core.error(`File not found at path: ${file_path}`) }

    core.info('D1')
    const file_blob = await getFileBlob(github, octokit, file.sha)
    core.info('D2')
    if (isBinary(file_path, file_blob)) {
      core.info('D3')
      core.error(`File at path: ${file_path} is a binary file`)
      found_binaries.push(file_path)
    }
  }
  core.info('D4')

  // TODO
  // if (got_errors) {}
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

async function getFileTree(github, octokit, core) {
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
  const { data: { content } } = await octokit.rest.git.getBlob({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    file_sha: file_sha
  })
  return Buffer.from(content, 'base64')
}

export { fileTypeChecker }


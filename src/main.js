import { fileTypeChecker } from "./file-type-checker.mjs"
import { autoLabeler } from "./auto-labeler.mjs"
import { logMinimizer, logSeparator } from "./helpers.mjs"

const core = require("@actions/core")
const github = require("@actions/github")
const time_start = process.hrtime()

async function main() {
    // main

    // set execution values
    const regex_patterns = core.getInput("title_regex").split(";")
    const gh_token = core.getInput("github_token")
    const octokit = github.getOctokit(gh_token)
    const pr_title = github.context.payload.pull_request.title
    const source_branch = github.context.payload.pull_request.head.ref
    const target_branch = github.context.payload.pull_request.base.ref

    try {
        // print out relevant available data from received from a github
        logSeparator(core)
        logMinimizer(core, "github.context", github.context)
        logMinimizer(core, "PR Title", pr_title)
        logMinimizer(core, "Source branch", source_branch)
        logMinimizer(core, "Target branch", target_branch)
        logSeparator(core)

        // contains encountered errors during execution
        var exec_errors = new Array()

        // validate Pull Request title
        if (!isPrTitleValid(regex_patterns, pr_title)) {
            let pr_error = "PR Title did not pass regex validation."
            core.error(pr_error)
            exec_errors.push(pr_error)
        }
        log_timestamp()
        logSeparator(core)

        // Feature: auto-labeler
        if (core.getInput("enable_labeler") === "true") {
            core.info("PR auto-label is enabled for the repo ...")
            const result = await autoLabeler(core, github, octokit)
            if (!result) {
                let auto_labeler_error = "Auto labeler encountered an error"
                core.error(auto_labeler_error)
                exec_errors.push(auto_labeler_error)
            }
        }
        else { core.warning("PR auto-label is disabled for the repo, skipping.") }
        log_timestamp()
        logSeparator(core)

        // Feature: file checker
        if(core.getInput("enable_file_checker") === "true") {
            core.info("PR file-type-checker is enabled for the repo ...")
            const { result, binaries } = await fileTypeChecker(core, github, octokit)
            logMinimizer(core, "Result", result)
            logMinimizer(core, "Binary files", binaries)
            if (!result) {
                const comment = `PR contains binary files: ${binaries.join(", ")}`
                await createCommentOnPR(github, octokit, comment)
                core.setFailed("PR contains binary files.")
            }
        }
        else { core.warning("PR file-type-checker is disabled for the repo, skipping.") }

        // check if execution encountered errors
        if (exec_errors.length) { throw new Error("Workflow encountered errors, see logs for details!") }

        // end of the main block
        log_timestamp()
        logSeparator(core)
        core.info("Exiting gracefully.")
        return
    }
    catch (error) { core.setFailed(error) }
}

function isPrTitleValid(regexes, pr_title) {
    // Validates a PR title against a list of regex patterns
    // Need to match at least one pattern for it to be valid
    // Returns true if valid
    // Returns false if not valid or run into an execution error
    let pr_title_is_valid = false
    try {
        // loop over every defined matching pattern
        regexes.forEach(pattern => {
            core.info(`Validating '${pr_title}' against '${pattern}'`)

            // validate against current regex pattern
            const regex = RegExp(pattern)
            if (regex.test(pr_title)) {
                core.info("Match.")
                pr_title_is_valid = true
            }
            else { core.info("Not a match.") }
        })

        // PR need to match at least one pattern for success
        if (pr_title_is_valid) {
            core.info("PR Title matched at least one pattern.")
            core.info("PR Title is valid.")
            return true
        }

        // code hit this block if it did not match against any defined regex patterns
        core.warning("PR Title did not match against any of the allowed regex patterns.")
        core.warning("Please refer to the PR Title naming policy for your project.")
        return false
    }
    catch (error) {
        core.error(error)
        core.error("Something went wrong in regex pattern validation!")
        core.error("Contact Fusion DevOps team <fusion_devops@johnsoncontrols365.onmicrosoft.com>")
        return false
    }
}

function log_timestamp() {
    // returns a timestamp in seconds
    const hrtime_end = process.hrtime(time_start)
    const seconds = hrtime_end[0] + hrtime_end[1] / 1e9
    core.info(`Execution time: ${seconds.toFixed(2)} seconds`)
}

async function createCommentOnPR(github, octokit, comment) {
    // creates a comment on a PR
    await octokit.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.payload.pull_request.number,
        body: comment
    })
}

main()
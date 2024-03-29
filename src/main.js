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
    const source_sha = github.context.payload.pull_request.head.sha
    const target_branch = github.context.payload.pull_request.base.ref
    const target_sha = github.context.payload.pull_request.base.sha

    try {
        // print out relevant available data from received from a github
        logSeparator(core)
        logMinimizer(core, "github.context", github.context)
        logMinimizer(core, "PR Title", pr_title)
        logMinimizer(core, "HEAD branch", source_branch)
        logMinimizer(core, "HEAD sha", source_sha)
        logMinimizer(core, "Base branch", target_branch)
        logMinimizer(core, "Base sha", target_sha)
        logSeparator(core)

        // contains encountered errors during execution
        var exec_errors = new Array()
        var linter_report = new Array("### :warning: **Pull Request Linter found some issues. Merge is blocked until resolved** :warning:")

        // validate Pull Request title
        if (!isPrTitleValid(regex_patterns, pr_title)) {
            let pr_error = "PR Title did not pass regex validation.\nReview title syntax guidelines here:\nhttps://jci-intrusion.atlassian.net/wiki/spaces/DEV/pages/16942140/Pull+Request+Title+Syntax"
            linter_report.push(pr_error)
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
                linter_report.push(auto_labeler_error)
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
            if (!result) {
                const binaries_count = binaries.length
                core.info(`Found ${binaries_count} binary files.`)
                const binaries_comment = `PR contains ${binaries_count} binary files.\nAddition of binaries to the repo must be approved by repo administrator.\n\`\`\`\n${binaries.join("\n")}\n\`\`\`\n`
                linter_report.push(binaries_comment)
                exec_errors.push(`PR contains ${binaries_count} binary files.`)
            }
        }
        else { core.warning("PR file-type-checker is disabled for the repo, skipping.") }
        log_timestamp()
        logSeparator(core)
        // check if execution encountered errors
        if (exec_errors.length) {
            // create a comment on a PR if there are errors
            core.info("Sending a comment to a PR ...")
            linter_report.push("If you have any questions, please contact Fusion DevOps team\nfusion_devops@johnsoncontrols365.onmicrosoft.com")
            await createCommentOnPR(github, octokit, linter_report.join("\n- "))
            log_timestamp()
            logSeparator(core)
            throw new Error("Workflow encountered errors, see logs for details!") 
        }
        // end of the main block
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
        core.error("PR Title did not match against any of the allowed regex patterns.")
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

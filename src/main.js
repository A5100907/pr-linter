// import necessary modules
import { fileTypeChecker } from "./file-type-checker.mjs"
import { autoLabeler } from "./auto-labeler.mjs"
import { logMinimizer, logSeparator } from "./helpers.mjs"

const core = require("@actions/core")
const github = require("@actions/github")

async function main() {
    // main

    // set execution values
    const regex_patterns = core.getInput("title_regex").split(";")
    const gh_token = core.getInput("github_token")
    const octokit = github.getOctokit(gh_token)
    const pr_title = github.context.payload.pull_request.title
    const base_branch = github.context.payload.pull_request.base.ref
    
    try {
        // print out relevant available data from received from a github
        logSeparator(core)
        logMinimizer(core, "github.context", github.context)
        logMinimizer(core, "PR Title", pr_title)
        logMinimizer(core, "Base branch", base_branch)
        logSeparator(core)

        // contains encountered errors during execution
        var exec_errors = new Array()

        // TODO enable
        // validate Pull Request title
        // if (!isPrTitleValid(regex_patterns, pr_title)) {
        //     let pr_error = "PR Title did not pass regex validation."
        //     core.error(pr_error)
        //     exec_errors.push(pr_error)
        // }

        logSeparator(core)

        // TODO enable
        // Feature: auto-labeler
        // if (core.getInput("enable_labeler") === "true") {
        //     core.info("PR auto-label is enabled for the repo ...")
        //     const result = await autoLabeler(core, github, octokit)
        //     if (!result) {
        //         let auto_labeler_error = "Auto labeler encountered an error"
        //         core.error(auto_labeler_error)
        //         exec_errors.push(auto_labeler_error)
        //     }
        // }
        // else { core.warning("PR auto-label is disabled for the repo, skipping.") }

        logSeparator(core)

        // Feature: file checker
        if(core.getInput("enable_file_checker") === "true") {
            core.info("PR file-type-checker is enabled for the repo ...")
            const exec = require("@actions/exec")
            const result = await fileTypeChecker(core, github, octokit, exec)

        }
        else { core.warning("PR file-type-checker is disabled for the repo, skipping.") }

        // check if execution encountered errors
        if (exec_errors.length) { throw new Error("Workflow encountered errors, see logs for details!") }

        // end of the main block
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

main()
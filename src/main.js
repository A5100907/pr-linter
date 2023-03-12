// import necessary modules
const core = require("@actions/core")
const github = require("@actions/github")
import * as FileCheckerModule from "./is_file_binary.mjs"
import * as AutoLabelerModule from "./auto_labeler.mjs"

async function main() {
    // main

    // set execution values
    const regex_patterns = core.getInput("title_regex").split(";")
    const gh_token = core.getInput("github_token")
    const octokit = github.getOctokit(gh_token)
    const pr_title = github.context.payload.pull_request.title
    
    try {
        // print out relevant available data from received from a github
        logSeparator()
        logMinimizer("github.context", github.context)
        logMinimizer("github.context.payload.pull_request.title", github.context.payload.pull_request.title)
        logSeparator()

        // contains encountered errors during execution
        var exec_errors = new Array()

        // validate Pull Request title
        if (!isPrTitleValid(regex_patterns, pr_title)) {
            let pr_error = "PR Title did not pass regex validation."
            core.error(pr_error)
            exec_errors.push(pr_error)
        }

        logSeparator()

        // Feature: auto-labeler
        if (core.getInput("enable_labeler") === "true") {
            const result = await AutoLabelerModule.autoLabeler(octokit)
            if (!result) {
                let auto_labeler_error = "Auto labeler encountered an error"
                core.error(auto_labeler_error)
                exec_errors.push(auto_labeler_error)
            }
        }
        else { core.warning("PR auto-label is disabled for the repo, skipping.") }

        logSeparator()

        // Feature: file checker
        if(core.getInput("enable_file_checker") === "true") {
            const changed_files = await FileCheckerModule.getChangedFiles(github.context, octokit)
            logMinimizer("Changed Files", changed_files)

        }
        else { core.warning("PR file-type-checker is disabled for the repo, skipping.") }

        // check if execution encountered errors
        if (exec_errors.length) { throw new Error("Workflow encountered errors, see logs for details!") }

        // end of the main block
        logSeparator()
        core.info("Exiting gracefully.")
        return
    } 
    catch (error) { core.setFailed(error) }
}

function logMinimizer(title, text_to_print) {
    // prints into a github's log with ability to collapse an entry
    core.startGroup(title)
    console.log(text_to_print)
    core.endGroup()
}

function logSeparator() {
    // print out a visual separator into a log
    core.info("=".repeat(80))
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
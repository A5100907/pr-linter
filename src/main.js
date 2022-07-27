// TODO cleanup form debug prints
// import necessary modules
const core = require("@actions/core")
const github = require("@actions/github")

async function main() {
    // main

    // set constant values
    const regex_patterns = core.getInput("title_regex").split(";")
    const enable_labeler = (core.getInput("enable_labeler") === "true")
    const pr_title = github.context.payload.pull_request.title
    
    try {
        // print out available data from github
        logSeparator()
        logMinimizer("github.context", github.context)
        logMinimizer("github.context.payload.pull_request.title", github.context.payload.pull_request.title)
        logSeparator()

        // validate PR and throw an error if it fails
        if (!isPrTitleValid(regex_patterns, pr_title)) {
            logSeparator()
            core.error("PR Title did not pass regex validation.")
            throw new Error("Pull Request did not pass naming rules policy!")
        }
        logSeparator()

        // Feature: auto-labeler
        if (enable_labeler) {
            core.info("PR auto-label is enabled for the repo ...")
            // get the head branch of the pull request
            const pr_head = github.context.payload.pull_request.head.ref
            var prj_label = getProjectLabel(pr_head)

            if (prj_label) {
                core.info(`PLACEHOLDER. label: ${prj_label}`)
            }
            else { core.info("Skipping auto-labeler.") }
        }
        else { core.info('PR auto-label is disabled for the repo, skipping.') }

        // end of the main block
        core.info("Exiting gracefully.")
        return
    } 
    catch (error) { core.setFailed(`Action failed. ${error}`) }
}


function logMinimizer(title, text_to_print) {
    // prints into a log with ability to maximize/minimize entry
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
    // Returns false if not valid, true if valid
    let pr_title_is_valid = false
    try {
        // loop over every defined matching pattern
        regexes.forEach(pattern => {
            core.info(`Validating '${pr_title}' against '${pattern}'`)
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

        core.warning("PR Title did not match against any of the allowed regex patterns.")
        core.warning("Please refer to the PR Title naming policy for your project.")
        return false
    } 
    catch (error) {
        core.error(error)
        core.error("Something went wrong in regex pattern validation!")
        core.error("Contact Fusion DevOps team <fusion_devops@johnsoncontrols365.onmicrosoft.com>")
        throw new Error("isPrTitleValid() failed.")
    }
}

function getProjectLabel(head) {
    // Return project label value if meets conditions; null otherwise
    core.info(`PR head: ${head}`)
    var items = new Array(head.split('/'))
    // operates on assumption that:
    // 1 - if split produces 3 items; then 1st element is a project label
    // 2 - if split produces 2 items and 2nd element is 'develop'; then 1st element is project label
    // everything else is skipped (assumed a single project repo or invalid branch for labeler)
    if (items.length() == 3) { return items[0] }
    if ((items.length() == 2) && (items[1].toLowerCase() == 'develop')) { return items[0] }

    core.info("branch name did not qualify for a project label extraction.")
    return null
}

main()
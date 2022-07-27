const core = require("@actions/core")
const github = require("@actions/github")

async function main() {
    const regex_patterns = core.getInput("title_regex").split(";")
    const enable_labeler = (core.getInput("enable_labeler") === "true")
    const pr_title = github.context.payload.pull_request.title
    
    try {
        logSeparator()
        logMinimizer("github.context", github.context)
        logMinimizer("github.context.payload.pull_request.title", github.context.payload.pull_request.title)
        logSeparator()

        if (!isPrTitleValid(regex_patterns, pr_title)) {
            logSeparator()
            core.error("PR Title did not pass regex validation.")
            throw new Error("Pull Request did not pass naming rules policy!")
        }
        logSeparator()
        if (enable_labeler) {
            const pr_head = github.context.payload.pull_request.head.ref

            core.info("PR auto-label is enabled for the repo")
            if (isRepoMultiPrj(pr_head)) {
                core.info("PLACEHOLDER")
            }
            else { core.info("Single-project repo, skipping auto-labeler") }
        } else { core.info('PR auto-label is disabled for the repo, skipping ...') }
            
        core.info("Exiting gracefully ...")
        return
    } 
    catch (error) {
        core.setFailed(`Action failed. ${error}`)
    }
}


function logMinimizer(title, text_to_print) {
    // prints into a log with ability to maximize/minimize entry
    core.startGroup(title)
    console.log(text_to_print)
    core.endGroup()
}

function logSeparator() {
    core.info("=".repeat(80))
}

function isPrTitleValid(regexes, pr_title) {
    // Validates a PR title against a list of regex patterns
    // Need to match at least one pattern for it to be valid
    // Returns false if not valid, true if valid
    core.debug("Running 'isPrTitleValid()' ...")
    let pr_title_is_valid = false
    try {
        regexes.forEach(pattern => {
            core.info(`Validating '${pr_title}' against '${pattern}'`)
            const regex = RegExp(pattern)
            if (regex.test(pr_title)) {
                core.info("Match.")
                pr_title_is_valid = true
            } else {
                core.info("Not a match.")
            }
        })

        if (pr_title_is_valid) {
            core.info("PR Title matched at least one pattern.")
            core.info("PR Title is valid.")
            return true
        }
        core.warning("PR Title did not match against any of the allowed regex patterns.")
        core.warning("Please refer to the PR Title naming policy for your project.")
        return false
    } catch (error) {
        core.error(error)
        core.error("Something went wrong in regex pattern validation!")
        core.error("Contact Fusion DevOps team <fusion_devops@johnsoncontrols365.onmicrosoft.com>")
        throw new Error("isPrTitleValid() failed.")
    }
}

function isRepoMultiPrj(head) {
    // Return true if repo is multi-project, false otherwise.
    core.info(`PR head: ${head}`)
    // branch_name
    // feature/*
    // bugfix/*
    // merge/*
    // release/*
    // develop
    // main
    
    // main
    // main_unstable
    // prj/develop
    // prj/feature/*
    // prj/bugfix/*
    // prj/merge/*
    // prj/release/*
    
    // branch_name.split()
    // 1 - if split produces 3 items; then 1st element is project label
    // 2 - if split produces 2 items and 2nd element is 'develop'; then 1st element is project label
    // everything else is skipped (assumed a single project repo or invalid branch for labeler)
    
    return true
}

main()
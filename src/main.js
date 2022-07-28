// import necessary modules
const core = require("@actions/core")
const github = require("@actions/github")

async function main() {
    // main

    // set constant values
    const regex_patterns = core.getInput("title_regex").split(";")
    const enable_labeler = (core.getInput("enable_labeler") === "true")
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
        if (enable_labeler) {
            const result = await autoLabeler(octokit)
            if (!result) {
                let auto_labeler_error = "Auto labeler encountered an error"
                core.error(auto_labeler_error)
                exec_errors.push(auto_labeler_error)
            }
        }
        else { core.warning("PR auto-label is disabled for the repo, skipping.") }

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

async function autoLabeler(octokit) {
    // execute Auto-labeler
    // return false if encountered an error, otherwise - true
    try {
        core.info("PR auto-label is enabled for the repo ...")
        // get values for labeler execution
        let pr_head = github.context.payload.pull_request.head.ref
        let prj_label = getProjectLabel(pr_head)
        
        if (prj_label) {
            // run labeler
            const pr_labels_obj = await getIssueLabels(octokit)
            // convert full label data into a simple array of label names
            let pr_labels = pr_labels_obj.map(function (item) { return item.name}) 
            logMinimizer("Labels currently attached to the PR", pr_labels)
            
            // check if pr already has expected label
            if (pr_labels.indexOf(prj_label) > -1) { console.log(`PR already has the label '${prj_label}' attached.`) }
            else { 
                // add the label to the PR
                let new_labels = new Array(prj_label)
                await addLabels(octokit, new_labels)
            }
        }
        else { core.info("Skipping auto-labeler.") }
        return true
    }
    catch(e) {
        core.error(e)
        core.error("Something went wrong in auto-labeler!")
        core.error("Contact Fusion DevOps team <fusion_devops@johnsoncontrols365.onmicrosoft.com>")
        return false
    }
}

function getProjectLabel(head) {
    // Return project label value if meets conditions; null otherwise
    core.info(`PR head: ${head}`)
    let items = new Array()
    items = head.split('/')
    // operates on assumption that:
    // 1 - if split produces 3 items; then 1st element is a project label
    // 2 - if split produces 2 items and 2nd element is 'develop'; then 1st element is project label
    // everything else is skipped (assumed a single project repo or invalid branch for labeler)
    if (items.length == 3) { return items[0] }
    if ((items.length == 2) && (items[1].toLowerCase() == 'develop')) { return items[0] }

    core.info("branch name did not qualify for a project label extraction.")
    return null
}

async function addLabels(octokit, prj_labels) {
    try {
        // add specified label to current PR
        core.info("Adding a label(s) to the PR ...")
        core.info(`repos owner: ${github.context.repo.owner}`)
        core.info(`repos name: ${github.context.repo.repo}`)
        core.info(`issue_number: ${github.context.payload.pull_request.number}`)
        logMinimizer("label(s) to add", prj_labels)
        
        await octokit.rest.issues.addLabels({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: github.context.payload.pull_request.number,
            labels: prj_labels,
        })
    }
    catch(e) { throw new Error(e)}
}

async function getIssueLabels(octokit) {
    try {
        // return list of label objects of all labels on current PR
        const response = await octokit.rest.issues.listLabelsOnIssue({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: github.context.payload.pull_request.number,
        })
        return response.data
    }
    catch(e) { throw new Error(e)}
}

main()
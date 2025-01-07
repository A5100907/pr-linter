import { logMinimizer } from "./helpers.mjs"

async function autoLabeler(core, github, octokit) {
    // execute Auto-labeler
    // return false if encountered an error, otherwise - true
    try {
        // get values for labeler execution
        let pr_head = github.context.payload.pull_request.head.ref
        let prj_label = getProjectLabel(core, pr_head)
        
        if (prj_label) {
            // run labeler
            const pr_labels_obj = await getIssueLabels(github, octokit)
            // convert full label data into a simple array of label names
            let pr_labels = pr_labels_obj.map(function (item) { return item.name}) 
            logMinimizer(core, "Labels currently attached to the PR", pr_labels)
            
            // check if pr already has expected label
            for (const label of prj_label) {
                if (pr_labels.indexOf(label) > -1) { console.log(`PR already has the label '${label}' attached.`) }
                else { 
                    // add the label to the PR
                    await addLabels(core, github, octokit, [label])
                    core.info("Done.")
                }
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

function getProjectLabel(core, head) {
    // Return project label value if meets conditions; null otherwise
    core.info(`PR head: ${head}`)
    let items = new Array()
    items = head.split('/')
    // operates on assumption that:
    // 1 - if split produces 3 items; then 1st element is a project label
    // 2 - if split produces 2 items and 2nd element is 'develop'; then 1st element is project label
    // everything else is skipped (assumed a single project repo or invalid branch for labeler)
    if (items.length > 0) { return items }
    // if (items.length == 3) { return items[0] }
    // if ((items.length == 2) && (items[1].toLowerCase() == 'develop')) { return items[0] }

    core.info("branch name did not qualify for a project label extraction.")
    return null
}

async function addLabels(core, github, octokit, prj_labels) {
    try {
        // add specified label to current PR
        core.info("Adding a label(s) to the PR ...")
        core.info(`repos owner: ${github.context.repo.owner}`)
        core.info(`repos name: ${github.context.repo.repo}`)
        core.info(`issue_number: ${github.context.payload.pull_request.number}`)
        logMinimizer(core, "label(s) to add", prj_labels)
        
        await octokit.rest.issues.addLabels({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: github.context.payload.pull_request.number,
            labels: prj_labels,
        })
    }
    catch(e) { throw new Error(e) }
}

async function getIssueLabels(github, octokit) {
    try {
        // return list of label objects of all labels on current PR
        const response = await octokit.rest.issues.listLabelsOnIssue({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: github.context.payload.pull_request.number,
        })
        return response.data
    }
    catch(e) { throw new Error(e) }
}

export { autoLabeler }

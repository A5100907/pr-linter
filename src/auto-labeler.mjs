import { logMinimizer } from "./helpers.mjs"

async function autoLabeler(core, github, octokit) {
    // execute Auto-labeler
    // return false if encountered an error, otherwise - true
    try {
        // get values for labeler execution
        let pr_base = github.context.payload.pull_request.base.ref
        let prj_label = getProjectLabel(core, pr_base)
        
        if (prj_label) {
            // run labeler
            const pr_labels_obj = await getIssueLabels(github, octokit)
            // convert full label data into a simple array of label names
            let pr_labels = pr_labels_obj.map(function (item) { return item.name.toLowerCase()}) 
            logMinimizer(core, "Labels currently attached to the PR", pr_labels)
            
            // check if pr already has expected label
            const labels_to_add = []
            for (const label of prj_label) {
                if (pr_labels.indexOf(label.toLowerCase()) > -1) { console.log(`PR already has the label '${label}' attached.`) }
                else { // add the label to the PR
                    labels_to_add.push(label.toLowerCase())
                }
            }
            if (labels_to_add.length > 0) {
                await addLabels(core, github, octokit, labels_to_add)
                core.info("Done.")
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
    return items
}

async function addLabels(core, github, octokit, prj_labels) {
    try {
        // add specified label to current PR
        core.info("Adding a label(s) to the PR ...")
        core.info(`repos owner: ${github.context.repo.owner}`)
        core.info(`repos name: ${github.context.repo.repo}`)
        core.info(`issue_number: ${github.context.payload.pull_request.number}`)
        logMinimizer(core, "label(s) to add", prj_labels)
        
        const total_repo_labels = []
        let repo_labels = []
        let page = 0
        do {
            const response = await octokit.rest.issues.listLabelsForRepo({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                per_page: 100,
                page: page
            })
            repo_labels = response.data.map(label => label.name.toLowerCase())
            total_repo_labels.push(...repo_labels)
            page++
        } while (repo_labels.length >= 100)
        logMinimizer(core, "label(s) in repo", total_repo_labels)
        const labels_to_create = prj_labels.map(label => label.toLowerCase()).filter(label => !total_repo_labels.includes(label))
        logMinimizer(core, "label(s) to create", labels_to_create)
        for (const label of labels_to_create) {
            await octokit.rest.issues.createLabel({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                name: label
            })
        }

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

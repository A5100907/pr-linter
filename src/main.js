const core = require("@actions/core")
const github = require("@actions/github")

async function main() {
    const regex_patterns = core.getInput("title-regex").split(";")
    const raise_failure = core.getBooleanInput("fail-action-on-regex-failure")
    const request_changes = core.getBooleanInput("request-changes-on-regex-failure")
    const failure_comment = core.getInput("comment-on-regex-failure")

    
    try {
        core.info(github)
        core.info(github.context)
    } catch (error) {
        logMinimizer("Event context data",github.context)
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

// TODO Remove, this is for debug prints
function typeOf(obj) {
    return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
}

main()
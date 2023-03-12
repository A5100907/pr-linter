function logMinimizer(core, title, text_to_print) {
    // prints into a github's log with ability to collapse an entry
    core.startGroup(title)
    console.log(text_to_print)
    core.endGroup()
}

function logSeparator(core) {
    // print out a visual separator into a log
    core.info("=".repeat(80))
}
export { logMinimizer, logSeparator }
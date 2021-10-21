# Pull Request Linter

Validates a syntax of the pull request title against specified regexes.

## Using the action

### Inputs
* __github_token__ - GitHub authentication token, can be passed in as '${{ secrets.GITHUB_TOKEN }}'. Make sure to add write permission to content!
    * required: true

* __title_regex__ - Semicolon separated list of Regex patterns to validate the pull request title against
    * required: true
    * NOTE: Do not use " or ' characters to wrap the string with, pass as is (see example)

### Usage
#### Example 1:
```
name: "Pull Request Linter"
 
on:
  pull_request:
    types: ['opened', 'edited', 'reopened', 'synchronize']
 
jobs:
  execute:
    name: pr-linter
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: run-pr-linter
        uses: A5100907/pr-linter@feature/SDO-2516
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          title_regex: ^(\[([A-Z0-9]{1,6}-[0-9]{1,6})\] [a-zA-Z0-9 \!\?\'\"\=\.\,\(\)\_\-\+]*)$;^(\[(BF|HF)\] [a-zA-Z0-9 \!\?\'\"\=\.\,\(\)\_\-\+]*)$
               
```
#### This would enforce following:

  * Valid:
  ```
  [M-1] valid Example of a feature PR title 1234=-+_.,!?'"()
  [IQ4-101] Yet Another valid Example of a PR of a feature
  
  [BF] Valid BugFix title
  [HF] Valid HotFix title 1234=-+_.,!?'"()
  ```

  * Invalid:
  ```
  [IQ4-101]Invalid
  [I4-1]:Invalid
  [IA-11] Title @#$%^&*{};\/~`
  ```

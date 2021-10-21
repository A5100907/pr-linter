# Pull Request Linter

Validates a syntax of the pull request title against specified regexes.

## Using the action

### Inputs
* __github_token__ - GitHub authentication token, can be passed in as '${{ secrets.GITHUB_TOKEN }}'. Make sure to add write permission to content!
    * required: true

* __title_regex__ - Semicolon separated list of Regex patterns to validate the pull request title against
    * required: true

### Usage Examples
#### Example 1:
```
name: "Branch name enforcer"

on:
  create:

jobs:
  validate_branch_name:
    name: validate_branch_name
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: run-enforcer
        uses: A5100907/branch-name-enforcer@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ignore_branches: "master;main;teamshare;product_teamshare"
          regex: "^([A-Z0-9]*/)((teamshare)|(feature/[A-Z]*-[0-9]*)|(release/[0-9]{1,2}.[0-9]{1,2}.[0-9]{1,5}$))"
          delete_branch: "true"
```
#### Example 2:
```
name: "Branch name enforcer"

on:
  create:

jobs:
  validate_branch_name:
    name: validate_branch_name
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: run-enforcer
        uses: A5100907/branch-name-enforcer@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ignore_branches: "master;main;teamshare;product_teamshare"
          regex: "^([A-Z0-9]*/)(teamshare);^([A-Z0-9]*/)(feature/[A-Z]*-[0-9]*[-_A-Za-z0-9]*);^([A-Z0-9]*/)(release/[0-9]{1,2}.[0-9]{1,2}.[0-9]{1,5}$)"
          delete_branch: "true"
```
Both of these examples would enforce following:

  * Valid:
  ```
  PROJECT/teamshare
  PROJECT/feature/SDO-123456
  PROJECT/feature/XXO-1
  PROJECT/release/2.0.0
  PROJECT/release/1.0.1

  PRJ1/teamshare
  PRJ1/feature/SDO-123456
  PRJ1/feature/XXO-1
  PRJ1/release/2.0.01234
  PRJ1/release/1.0.1

  PRJ2/teamshare
  PRJ2/feature/SDO-123456_test
  PRJ2/feature/SDO-123456-test
  PRJ2/feature/SDO-123456_test
  PRJ2/feature/XXO-1
  PRJ2/release/2.0.0
  PRJ2/release/1.0.1

  PRJ9/teamshare
  PRJ9/feature/SDO-123456
  PRJ9/feature/XXO-1
  ```

  * Invalid:
  ```
  test_prefix/NEO-PROJECT/teamshare
  neo-project/teamshare
  Ex1/teamshare
  prj2/teamshare-random-suffix
  PRJ6/feature/SDO123456
  ExAmPlE/release/01.02.12345-random-suffix
  ```

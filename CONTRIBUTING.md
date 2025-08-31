# Contributor's Guide

This guide provides instructions for contributing to this project, including our Git branching strategy.

## Branching Strategy

To ensure a clean and manageable repository, we use a branching model based on GitFlow. This model uses a few long-running branches and several types of temporary branches for specific purposes.

### Core Branches

*   **`main`**: This branch should always reflect a production-ready state. Nothing is committed directly here. It only receives merges from release or hotfix branches.
*   **`develop`**: This is your main development branch. It contains the latest delivered development changes for the next release. All feature and bugfix branches are created from and merged back into `develop`.

### Branch Naming Convention

To bring order to your temporary branches and make it clear what part of the codebase is being worked on, we use the following naming convention:

`<type>/<scope>/<short-description>`

*   **`<type>`**: Defines the purpose of the branch.
    *   `feature`: For new features.
    *   `bugfix`: For non-urgent bug fixes.
    *   `hotfix`: For urgent production bugs.
    *   `release`: For preparing a new release.
*   **`<scope>`**: Refers to the part of the codebase the branch focuses on:
    *   `backend`
    *   `extension`
    *   `docs`
    *   `ci` (for continuous integration changes)
    *   `project` (for global changes)
*   **`<short-description>`**: A few words in kebab-case (e.g., `add-dark-mode`).

### Example Branches

*   `feature/extension/add-dark-mode`
*   `bugfix/backend/fix-user-auth-timeout`
*   `feature/backend/new-analysis-endpoint`
*   `docs/backend/update-personalization-api`
*   `hotfix/project/critical-security-patch`

### Workflow Example (for a new feature)

1.  **Start from `develop`**: Always create new feature or bugfix branches from the `develop` branch.
    ```shell
    git checkout develop
    git pull
    git checkout -b feature/extension/new-popup-design
    ```

2.  **Do your work**: Make your commits on this new branch.

3.  **Open a Pull Request**: When the feature is complete, push your branch to the remote and open a pull request to merge it into `develop`.

4.  **Review and Merge**: After the pull request is reviewed and approved, merge it into `develop`.

5.  **Delete the branch**: Once merged, the feature branch can be deleted.

# Contributing to Atlas Identity Platform

Welcome to Atlas Identity Platform (Opendex, Inc)!

Due to the nature of authentication, this may not be the easiest project to contribute to, so if you are looking for projects to help gain programming experience, we may not be a great match. If you're looking for projects for beginners, check out [Awesome First PR Opportunities](https://github.com/MunGell/awesome-for-beginners).

## Table of contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [How to contribute](#how-to-contribute)
- [Security & bug bounties](#security--bug-bounties)
- [Before creating a pull request](#before-creating-a-pull-request)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## How to contribute

If you think Atlas Identity Platform is a good fit for you, follow these steps:

1. Use Atlas Identity Platform. The best way to understand the project is to use it and build an application on top of it.
2. Give us feedback on GitHub; let us know where you got stuck, and which things you wish were easier. (We appreciate contributions most when they solve problems the authors encountered themselves in real usage.)
3. Contribute to the documentation in `docs/` and create examples & guides. This way, you can share your knowledge and expertise with everyone else who's just getting started.
4. Only then, start [contributing to the codebase](README.md#-development--contribution).


## Security & bug bounties

For any security-related concerns & bug bounties, please email us at [security@opendex.com](mailto:security@opendex.com).


## Before creating a pull request

Please make sure to:

- Install ESLint in your IDE and follow the code format of the code base (e.g., spaces around `=`, semicolons at the end, etc.).
  - If you are using VSCode, select "Show Recommended Extensions" from the command palette (`Ctrl+Shift+P`) to install the recommended extensions.
- Run `pnpm run test`. All tests should pass.
- If you changed the Prisma schema, make sure you've created a migration file. Create only one DB migration file per PR.
- If you changed the API, make sure you have added endpoint tests in `apps/e2e`.
- Ensure all dependencies are in the correct `package.json` files.
- Ensure the PR is ready for review. If you want to discuss WIP code, mark it as a draft.

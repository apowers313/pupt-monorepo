---
title: New Project
author: Adam Powers <apowers@ato.ms>
creationDate: 20250815
tags: []
---

Create a design for a new project called {{input "projectName"}}. The project is written in {{input "programmingLanguage"}}. The purpose of the project is to: {{input "projectPurpose"}}. The requirements for the project are:
{{editor "requirements"}}

The design will use the current directory as the base for the project, do not create a directory under this one. The design should include scaffolding for the project for building, linting, testing, and code coverage. My preferred tools are: {{input "preferredTools"}}. Create the design in {{input "designFile"}}. List all the tools that will be used for the scaffolding near the top of the file. Make sure the design file is easy for a human to read and edit, but it should include sufficient detail for AI tooling to create an implementation plan.

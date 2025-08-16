---
title: Implementation Plan
---
Create an implementation plan for {{file "designFile"}} . Use test-driven design: write the tests first and then implement the features that fulfill the tests. The plan should be broken down into small steps, making sure we test each step before moving on to the next step. The steps are grouped into phases that will all be implemented at the same time. Each phase should implement something that a human can verify is working at the end of the phase. 

When creating the plan, idententify areas where we can reuse existing code, refactor our code to create common utilities, modules, and test helpers. Also, consider reusing libraries and searching online for libraries that may have implemented modules for us. Our testing strategy should ensure that we have proper isolation from our current environment and using modules that we create or packages we install will make it easier to mock functionality.

Ensure our implementation plan has sufficient detail for Claude Code to implement, but is easy for a human to read. Include code examples for the implementation, grouped together at the end of the implementation plan so that a human can easily review the implementation plan without having to review all the code. Write our implementation plan to {{reviewFile "implementationPlanFile"}}.

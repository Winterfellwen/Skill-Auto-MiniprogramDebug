---
description: Scan and auto-fix issues in a WeChat miniprogram project
---
First, load the `wechat-miniprogram-ai-debug` skill by calling the `skill` tool.

AFTER loading the skill, follow the Fix flow. **Critical: automator API calls must use `node -e` directly — do NOT write a diagnose.js script.** Source file editing/fix scripts are fine, just don't wrap automator in a script file.

Project path: $ARGUMENTS
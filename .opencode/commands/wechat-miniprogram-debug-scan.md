---
description: Scan a WeChat miniprogram project for issues without modifying code
---
First, load the `wechat-miniprogram-ai-debug` skill by calling the `skill` tool.

AFTER loading the skill, follow the Scan flow. **Critical: automator API calls must use `node -e` directly — do NOT write a diagnose.js script.** Source file editing is fine, just don't wrap automator in a script file.

Project path: $ARGUMENTS
# Troubleshooting

This guide helps you resolve common issues with PUPT.

## Common Issues

### No prompts found

If PUPT can't find any prompts:

1. **Check your configuration**
   ```bash
   # View current configuration
   cat .pt-config.json
   ```

2. **Verify prompt directories exist**
   ```bash
   # Check if prompt directory exists
   ls -la .prompts/
   ```

3. **Ensure proper file permissions**
   ```bash
   # Check file permissions
   ls -la .prompts/*.md
   ```

4. **Run initialization again**
   ```bash
   pt init
   ```

### Command not found after installation

If the `pt` command isn't recognized:

1. **Verify npm global bin directory is in PATH**
   ```bash
   # Check npm bin location
   npm config get prefix
   
   # Add to PATH (example for bash)
   export PATH="$PATH:$(npm config get prefix)/bin"
   ```

2. **Try using npx**
   ```bash
   npx pt
   ```

3. **Reinstall globally**
   ```bash
   npm uninstall -g pupt
   npm install -g pupt
   ```

### File input not working properly

Issues with file selection:

1. **File paths support `~` expansion**
   ```bash
   # Works
   ~/my-file.txt
   
   # Also works
   ./relative/path.txt
   ```

2. **Use Tab key for autocompletion**
   - Press Tab to see available files
   - Continue typing to filter results

3. **Check base path configuration**
   ```yaml
   variables:
     - name: sourceFile
       type: file
       basePath: "./src"  # Ensure this exists
   ```

### History not being saved

If history entries aren't being created:

1. **Check history configuration**
   ```json
   {
     "historyDir": "~/.pt/history"
   }
   ```

2. **Verify directory permissions**
   ```bash
   # Check if directory exists and is writable
   ls -la ~/.pt/history
   ```

3. **Check available disk space**
   ```bash
   df -h
   ```

4. **Enable history in configuration**
   ```bash
   # Edit configuration
   pt init
   # Select "Yes" for history tracking
   ```

## Debugging Tips

### Enable Debug Logging

Set log level to debug for more information:

```json
{
  "logLevel": "debug"
}
```

Or use environment variable:
```bash
PT_LOG_LEVEL=debug pt
```

### Check Configuration Loading

See which configuration files are being loaded:

```bash
PT_LOG_LEVEL=trace pt help
```

### Validate Prompt Files

Check if a prompt file is valid:

```bash
# Try to parse the frontmatter
head -20 your-prompt.md

# Check for syntax errors
pt run --dry-run
```

### Common Template Errors

#### Unclosed Handlebars Tags
```handlebars
{{input "name"   # Missing closing braces
```

#### Invalid Variable Names
```handlebars
{{input "my-name"}}  # Hyphens not allowed
{{input "myName"}}   # Use camelCase instead
```

#### Missing Required Fields
```yaml
variables:
  - name: language
    type: select
    # Missing: choices array
```

## Performance Issues

### Slow Prompt Loading

1. **Reduce prompt directories**
   - Only include necessary directories
   - Avoid deep directory hierarchies

2. **Exclude large directories**
   ```json
   {
     "promptDirs": ["./prompts"],
     "exclude": ["node_modules", ".git"]
   }
   ```

### Large History Files

1. **Archive old history**
   ```bash
   # Move old entries
   mv ~/.pt/history/2023-* ~/.pt/history-archive/
   ```

2. **Set retention policy**
   ```json
   {
     "outputCapture": {
       "retentionDays": 30
     }
   }
   ```

## Getting Help

If you're still experiencing issues:

1. **Check existing issues**
   - Visit [GitHub Issues](https://github.com/apowers313/pupt/issues)

2. **Create a new issue**
   - Include PUPT version: `pt --version`
   - Include configuration (remove sensitive data)
   - Include error messages
   - Describe steps to reproduce

3. **Community support**
   - Join discussions on GitHub
   - Share your use cases and get tips

## Reporting Bugs

When reporting bugs, please include:

1. **System information**
   ```bash
   pt --version
   node --version
   npm --version
   echo $SHELL
   ```

2. **Configuration file** (sanitized)
   ```bash
   cat .pt-config.json | grep -v password
   ```

3. **Error output**
   ```bash
   PT_LOG_LEVEL=debug pt [command] 2>&1 | tee error.log
   ```

4. **Steps to reproduce**
   - Exact commands run
   - Expected behavior
   - Actual behavior
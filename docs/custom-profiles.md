# Custom Profiles Guide

Custom Profiles allow you to create personalised AI behaviour configurations beyond the built-in profiles (Interview, Sales, Meeting, etc.). This feature gives you complete control over how the AI responds in different contexts.

## Overview

Custom Profiles consist of five main sections that define the AI's behaviour:

1. **Introduction** - Defines the AI's role and primary mission
2. **Format Requirements** - Specifies how responses should be formatted
3. **Search Usage** - Instructions for when and how to use Google search
4. **Content & Examples** - Main instructions with detailed examples
5. **Output Instructions** - Final formatting and style guidelines

## Creating a Custom Profile

### Step 1: Access Profile Management
1. Open the **Customise** view from the main navigation
2. In the "AI Profile & Behavior" section, click **"Manage Custom Profiles"**
3. Click **"+ Create New Profile"**

### Step 2: Basic Information
- **Profile Name**: Give your profile a descriptive name (e.g., "Technical Support", "Creative Writing")
- **Description**: Optional brief description of when to use this profile

### Step 3: Configure AI Behaviour

#### Introduction Section
Define the AI's primary role and mission. This sets the overall context.

**Example:**
```
You are a technical support assistant specialising in software troubleshooting. Your mission is to help users resolve technical issues quickly and efficiently by providing clear, step-by-step solutions.
```

#### Format Requirements
Specify how the AI should structure its responses.

**Default template:**
```
**RESPONSE FORMAT REQUIREMENTS:**
- Keep responses SHORT and CONCISE (1-3 sentences max)
- Use **markdown formatting** for better readability
- Use **bold** for key points and emphasis
- Use bullet points (-) for lists when appropriate
- Focus on the most essential information only
```

#### Search Usage Instructions
Define when the AI should use Google search for up-to-date information.

**Example:**
```
**SEARCH TOOL USAGE:**
- If the user mentions **recent software updates, new features, or current bugs**, **ALWAYS use Google search**
- If they ask about **specific error codes or recent patches**, search for the latest information
- After searching, provide a **concise, informed response** based on real-time data
```

#### Content & Examples
This is the main section where you provide detailed instructions and examples.

**Example:**
```
Focus on providing practical, actionable solutions. Always:

1. Acknowledge the user's problem clearly
2. Provide step-by-step troubleshooting instructions
3. Offer alternative solutions if the first approach doesn't work

Examples:

User: "My application keeps crashing when I try to save files"
You: "**Issue**: Application crashes during file save. **Solution**: 1) Try saving to a different location, 2) Check available disk space, 3) Run the application as administrator. **Alternative**: If crashes persist, try saving in compatibility mode."

User: "How do I update my drivers?"
You: "**Driver Update Steps**: 1) Right-click 'This PC' → Properties → Device Manager, 2) Find the device with issues, 3) Right-click → Update driver → Search automatically. **Alternative**: Download latest drivers directly from manufacturer's website."
```

#### Output Instructions
Final guidelines for response style and format.

**Example:**
```
**OUTPUT INSTRUCTIONS:**
Provide direct, technical solutions in **markdown format**. Include specific steps, keyboard shortcuts, and file paths when relevant. Keep responses **practical and immediately actionable**.
```

## Managing Custom Profiles

### Editing Profiles
1. Go to **Manage Custom Profiles**
2. Click **"Edit"** next to the profile you want to modify
3. Make your changes and click **"Update Profile"**

### Deleting Profiles
1. Go to **Manage Custom Profiles**
2. Click **"Delete"** next to the profile you want to remove
3. Confirm the deletion (this action cannot be undone)

### Using Custom Profiles
1. In the **Customise** view, select your custom profile from the "Profile Type" dropdown
2. Custom profiles appear below the built-in profiles
3. Start a session - the AI will use your custom configuration

## Import/Export Functionality

### Exporting Profiles

#### Export Single Profile
1. Go to **Manage Custom Profiles**
2. Click the **💾** icon next to the profile you want to export
3. A JSON file will be downloaded to your computer

#### Export All Profiles
1. Go to **Manage Custom Profiles**
2. Click **"💾 Export All"**
3. A backup file containing all your custom profiles will be downloaded

### Importing Profiles

1. Go to **Manage Custom Profiles**
2. Click **"📁 Import Profiles"**
3. Select a JSON file exported from Cheating Daddy
4. Choose whether to overwrite existing profiles with the same name
5. Imported profiles will appear in your profile list

### Sharing Profiles

You can share custom profiles with others by:
1. Exporting the profile to a JSON file
2. Sending the file to another user
3. They can import it using the import functionality

## Best Practices

### Profile Design Tips

1. **Be Specific**: The more specific your instructions, the better the AI will perform
2. **Include Examples**: Provide concrete examples of desired responses
3. **Test Iteratively**: Create a basic profile, test it, then refine based on results
4. **Use Clear Language**: Write instructions as if explaining to a human assistant

### Content Guidelines

1. **Keep Instructions Focused**: Each profile should serve a specific purpose
2. **Provide Context**: Explain not just what to do, but why
3. **Include Edge Cases**: Consider unusual scenarios the AI might encounter
4. **Update Regularly**: Refine profiles based on real-world usage

### Organisation Tips

1. **Use Descriptive Names**: Make it easy to identify the right profile
2. **Add Descriptions**: Brief descriptions help you remember each profile's purpose
3. **Regular Backups**: Export your profiles regularly to avoid losing custom configurations
4. **Version Control**: Keep notes about changes you make to profiles over time

## Troubleshooting

### Profile Not Working as Expected
1. Check that all required fields (Name, Introduction, Content) are filled
2. Review your instructions for clarity and specificity
3. Test with simple scenarios first
4. Gradually add complexity to identify issues

### Import/Export Issues
1. Ensure JSON files are valid and not corrupted
2. Check that files were exported from Cheating Daddy
3. Verify file permissions if import fails
4. Try importing individual profiles if bulk import fails

### Performance Considerations
1. Very long profiles may slow down response generation
2. Keep instructions concise but comprehensive
3. Use clear, structured formatting for better AI comprehension

## Technical Details

### Profile Structure
Custom profiles are stored locally using IndexedDB and contain:
- Unique identifier
- Name and description
- Five behaviour sections
- Creation and modification timestamps

### Data Storage
- Profiles are stored locally on your device
- No data is sent to external servers
- Profiles persist between application sessions
- Data is automatically backed up during export

### Compatibility
- Custom profiles work with all application features
- Compatible with Google search integration
- Support for all language settings
- Work with advanced mode features

## Support

If you encounter issues with custom profiles:
1. Check the application console for error messages
2. Try creating a simple test profile to isolate issues
3. Ensure you're using the latest version of the application
4. Consider resetting to default settings if problems persist

For additional help, refer to the main application documentation or support channels.

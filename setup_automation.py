#!/usr/bin/env python3
import subprocess
import json

def run_gh_command(cmd):
    """Run GitHub CLI command"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}")
        return None

def create_workflow_rule(name, trigger, action):
    """Create a workflow automation rule"""
    # GitHub CLI doesn't support workflow creation via CLI yet
    # We'll document the manual steps instead
    print(f"📋 Rule: {name}")
    print(f"   Trigger: {trigger}")  
    print(f"   Action: {action}")
    print()

def main():
    print("🤖 Setting up GitHub Project Automation Rules...")
    print("(These need to be set up manually in the web interface)")
    print()
    
    # Define automation rules
    rules = [
        ("New Issue", "Issue opened", "Set status to 'Backlog'"),
        ("Start Work", "Issue assigned to someone", "Set status to 'Todo'"),
        ("PR Created", "Pull request opened", "Set status to 'In Progress'"),
        ("PR Merged", "Pull request merged", "Set status to 'Done'"),
        ("Issue Closed", "Issue closed", "Set status to 'Done'"),
    ]
    
    print("🔧 MANUAL SETUP REQUIRED:")
    print("Go to your project → Settings → Workflows")
    print("Create these automation rules:")
    print()
    
    for name, trigger, action in rules:
        create_workflow_rule(name, trigger, action)
    
    print("🌐 Project URL: https://github.com/users/ollehca/projects/1")
    print("⚙️  Settings URL: https://github.com/users/ollehca/projects/1/settings")
    print()
    print("💡 After setting up automation, run organize_project.py to fix current statuses")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
import subprocess
import time

def add_issue_to_project(issue_number):
    """Add a GitHub issue to the project"""
    cmd = [
        "gh", "project", "item-add", "1",
        "--owner", "@me",
        "--url", f"https://github.com/ollehca/penpot-desktop/issues/{issue_number}"
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"✅ Added issue #{issue_number} to project")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to add issue #{issue_number}: {e.stderr.decode().strip()}")
        return False

def main():
    # Add all issues from 1 to 76 (the range we created)
    added_count = 0
    failed_count = 0
    
    print("Adding all issues to GitHub Project...")
    
    for issue_num in range(1, 77):  # Issues 1-76
        if add_issue_to_project(issue_num):
            added_count += 1
        else:
            failed_count += 1
        
        # Rate limiting - small pause between requests
        time.sleep(0.5)
    
    print(f"\n🎉 Project update complete!")
    print(f"✅ Added: {added_count} issues")
    print(f"❌ Failed: {failed_count} issues")
    print(f"\nView your project: https://github.com/users/ollehca/projects/1")

if __name__ == "__main__":
    main()
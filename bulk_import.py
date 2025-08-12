#!/usr/bin/env python3
import csv
import subprocess
import sys
from datetime import datetime

def create_github_issue(title, body, labels="enhancement"):
    """Create a GitHub issue using gh CLI"""
    cmd = [
        "gh", "issue", "create",
        "--repo", "ollehca/penpot-desktop",
        "--title", title,
        "--body", body,
        "--label", labels
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error creating issue '{title}': {e.stderr}")
        return None

def format_issue_body(row):
    """Format the issue body from CSV row data"""
    body = f"""{row['Notes']}

**Due Date:** {row['Due Date']}
**Priority:** {row['Priority']}
**Category:** {row['Category']}
**Sprint:** {row['Sprint']}
**Effort:** {row['Effort']}

**Acceptance Criteria:**
- [ ] Task completion criteria to be defined
- [ ] Testing completed
- [ ] Documentation updated if needed
- [ ] Code review passed (if applicable)

---
*Imported from Notion Sprint Tasks database*
"""
    return body

def main():
    # Read the CSV file
    csv_path = "../Tasks 24c067a35ac880c0835cf1b04f550f6c.csv"
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            created_count = 0
            skipped_count = 0
            
            for row in reader:
                # Skip if already has GitHub Issue or is Done
                if row['GitHub Issue'].strip() or row['Status'] == 'Done':
                    print(f"Skipping '{row['Task']}' - already has issue or is done")
                    skipped_count += 1
                    continue
                
                # Skip empty tasks
                if not row['Task'].strip():
                    continue
                    
                title = row['Task'].strip()
                body = format_issue_body(row)
                
                # Determine label based on priority
                if row['Priority'] == 'P0-Critical':
                    labels = "critical,enhancement"
                elif row['Priority'] == 'P1-High':
                    labels = "high-priority,enhancement"  
                else:
                    labels = "enhancement"
                
                print(f"Creating issue: {title}")
                issue_url = create_github_issue(title, body, labels)
                
                if issue_url:
                    print(f"✅ Created: {issue_url}")
                    created_count += 1
                else:
                    print(f"❌ Failed to create: {title}")
                    
                # Rate limiting - pause between requests
                import time
                time.sleep(1)
            
            print(f"\n🎉 Import complete!")
            print(f"✅ Created: {created_count} issues")
            print(f"⏭️  Skipped: {skipped_count} issues")
            print(f"\nView your project: https://github.com/users/ollehca/projects/1")
            
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
import csv
import subprocess
import time

def create_issue_clean(title, body, labels="enhancement"):
    """Create a GitHub issue - one function, no bullshit"""
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
        print(f"❌ Failed: {title} - {e.stderr.strip()}")
        return None

def main():
    print("🔥 CLEAN IMPORT - No duplicates, no bullshit")
    
    # Read CSV and track what we've seen
    csv_path = "../Tasks 24c067a35ac880c0835cf1b04f550f6c.csv"
    seen_titles = set()
    created_count = 0
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                title = row['Task'].strip()
                
                # Skip if already done or empty or duplicate
                if (not title or 
                    row['Status'] == 'Done' or 
                    title in seen_titles or
                    row['GitHub Issue'].strip()):
                    continue
                
                seen_titles.add(title)  # Track to prevent duplicates
                
                # Create clean body
                body = f"""{row['Notes']}

**Due:** {row['Due Date']}
**Priority:** {row['Priority']}  
**Category:** {row['Category']}
**Sprint:** {row['Sprint']}
**Effort:** {row['Effort']}

**Acceptance Criteria:**
- [ ] Implementation complete
- [ ] Testing passed
- [ ] Documentation updated (if needed)"""

                print(f"Creating: {title}")
                
                # Create the issue
                issue_url = create_issue_clean(title, body)
                if issue_url:
                    print(f"✅ {issue_url}")
                    created_count += 1
                    time.sleep(0.8)  # Rate limiting
                
        print(f"\n🎉 Clean import complete!")
        print(f"✅ Created: {created_count} unique issues")
        print(f"📋 Project: https://github.com/users/ollehca/projects/1")
        
    except Exception as e:
        print(f"💥 Error: {e}")

if __name__ == "__main__":
    main()
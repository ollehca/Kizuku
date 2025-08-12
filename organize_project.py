#!/usr/bin/env python3
import subprocess
import json
import csv
from datetime import datetime

def run_gh_command(cmd):
    """Run GitHub CLI command and return output"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command {' '.join(cmd)}: {e.stderr}")
        return None

def get_project_items():
    """Get all items in the project"""
    cmd = ["gh", "project", "item-list", "1", "--owner", "@me", "--format", "json"]
    result = run_gh_command(cmd)
    if result:
        return json.loads(result)
    return []

def update_item_status(item_id, status):
    """Update an item's status in the project"""
    cmd = [
        "gh", "project", "item-edit", 
        "--id", item_id,
        "--field-value", f"status={status}"
    ]
    result = run_gh_command(cmd)
    return result is not None

def get_task_status_mapping():
    """Map tasks to their appropriate status based on CSV data"""
    csv_path = "../Tasks 24c067a35ac880c0835cf1b04f550f6c.csv"
    task_status_map = {}
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                task_title = row['Task'].strip()
                csv_status = row['Status'].strip()
                sprint = row['Sprint'].strip()
                priority = row['Priority'].strip()
                
                # Determine GitHub status based on CSV data
                if csv_status == 'Done':
                    github_status = 'Done'
                elif sprint == 'Month 1' and priority in ['P0-Critical', 'P1-High']:
                    github_status = 'Todo'
                elif sprint == 'Month 1':
                    github_status = 'Todo'
                else:
                    github_status = 'Backlog'
                
                task_status_map[task_title] = github_status
    
    except FileNotFoundError:
        print("CSV file not found, using default logic")
    
    return task_status_map

def main():
    print("🚀 Organizing GitHub Project...")
    
    # Get task status mapping from CSV
    status_map = get_task_status_mapping()
    
    # Get all project items
    items = get_project_items()
    
    if not items:
        print("❌ Could not fetch project items")
        return
    
    updated_count = 0
    
    for item in items:
        title = item.get('title', '').strip()
        item_id = item.get('id', '')
        current_status = item.get('status', '')
        
        # Determine target status
        if title in status_map:
            target_status = status_map[title]
        else:
            # Default logic for unmapped items
            if 'investor' in title.lower() or 'pitch' in title.lower():
                target_status = 'Backlog'  # Future items
            elif any(word in title.lower() for word in ['electron', 'desktop', 'menu', 'shortcut']):
                target_status = 'Todo'  # Current priority
            else:
                target_status = 'Backlog'  # Default
        
        # Update if different from current status
        if current_status != target_status:
            print(f"📋 {title[:50]}... → {target_status}")
            if update_item_status(item_id, target_status):
                updated_count += 1
            else:
                print(f"   ❌ Failed to update")
        else:
            print(f"✅ {title[:50]}... (already {target_status})")
    
    print(f"\n🎉 Project organization complete!")
    print(f"✅ Updated: {updated_count} items")
    print(f"📋 View project: https://github.com/users/ollehca/projects/1")

if __name__ == "__main__":
    main()
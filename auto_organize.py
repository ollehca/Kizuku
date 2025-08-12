#!/usr/bin/env python3
import subprocess
import json
import csv

# Project and field IDs from GitHub API
PROJECT_ID = "PVT_kwHOC_dOuc4BAPU5"
STATUS_FIELD_ID = "PVTSSF_lAHOC_dOuc4BAPU5zgzGmKQ"

# Status option IDs
STATUS_OPTIONS = {
    "Todo": "f75ad846",
    "In Progress": "47fc9ee4", 
    "Done": "98236657",
    "Review": "6e7428f0",
    "Backlog": "f68b4ade"
}

def run_gh_api(query, variables=None):
    """Run GitHub GraphQL API query"""
    cmd = ["gh", "api", "graphql", "-f", f"query={query}"]
    if variables:
        for key, value in variables.items():
            cmd.extend(["-f", f"{key}={value}"])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"API Error: {e.stderr}")
        return None

def get_project_items():
    """Get all items in the project with their IDs"""
    query = """
    {
      user(login: "ollehca") {
        projectV2(number: 1) {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  title
                }
              }
            }
          }
        }
      }
    }
    """
    
    result = run_gh_api(query)
    if result and result["data"]["user"]["projectV2"]:
        return result["data"]["user"]["projectV2"]["items"]["nodes"]
    return []

def update_item_status(item_id, status_name):
    """Update an item's status using GraphQL mutation"""
    status_option_id = STATUS_OPTIONS.get(status_name)
    if not status_option_id:
        print(f"Invalid status: {status_name}")
        return False
    
    mutation = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId  
        fieldId: $fieldId
        value: $value
      }) {
        projectV2Item {
          id
        }
      }
    }
    """
    
    variables = {
        "projectId": PROJECT_ID,
        "itemId": item_id,
        "fieldId": STATUS_FIELD_ID,
        "value": json.dumps({"singleSelectOptionId": status_option_id})
    }
    
    result = run_gh_api(mutation, variables)
    return result is not None and "errors" not in result

def get_task_mapping():
    """Map issue numbers to their target status"""
    csv_path = "../Tasks 24c067a35ac880c0835cf1b04f550f6c.csv"
    task_map = {}
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row in reader:
                title = row['Task'].strip()
                status = row['Status'].strip()
                sprint = row['Sprint'].strip()
                priority = row['Priority'].strip()
                
                # Determine target status
                if status == 'Done':
                    target = 'Done'
                elif sprint == 'Month 1':
                    target = 'Todo'  # Current sprint
                else:
                    target = 'Backlog'  # Future sprints
                
                task_map[title] = target
                
    except FileNotFoundError:
        print("CSV not found, using default mapping")
    
    return task_map

def main():
    print("🤖 Automatically organizing all project tasks...")
    
    # Get task status mapping
    task_map = get_task_mapping()
    
    # Get all project items
    items = get_project_items()
    
    if not items:
        print("❌ Could not fetch project items")
        return
        
    updated_count = 0
    
    for item in items:
        content = item.get("content", {})
        if not content:
            continue
            
        title = content.get("title", "").strip()
        issue_number = content.get("number")
        item_id = item.get("id")
        
        if not title or not item_id:
            continue
        
        # Determine target status
        target_status = task_map.get(title, "Backlog")
        
        print(f"📋 #{issue_number}: {title[:40]}... → {target_status}")
        
        if update_item_status(item_id, target_status):
            updated_count += 1
            print(f"   ✅ Updated")
        else:
            print(f"   ❌ Failed")
    
    print(f"\n🎉 Automatic organization complete!")
    print(f"✅ Updated: {updated_count} items")
    print(f"📋 View project: https://github.com/users/ollehca/projects/1")

if __name__ == "__main__":
    main()
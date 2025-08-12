#!/usr/bin/env python3
import subprocess
import json
import csv

def main():
    print("📋 Current GitHub Project Status:")
    print("=" * 60)
    
    # Get CSV mapping for better organization
    csv_path = "../Tasks 24c067a35ac880c0835cf1b04f550f6c.csv"
    task_map = {}
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                title = row['Task'].strip()
                sprint = row['Sprint'].strip()
                priority = row['Priority'].strip()
                status = row['Status'].strip()
                
                if status == 'Done':
                    target = 'Done'
                elif sprint == 'Month 1':
                    target = 'Todo'
                else:
                    target = 'Backlog'
                    
                task_map[title] = {
                    'target': target,
                    'sprint': sprint,
                    'priority': priority,
                    'csv_status': status
                }
    except:
        pass
    
    print("\n🎯 SHOULD BE IN 'TODO' (Month 1 - Current Sprint):")
    print("-" * 50)
    
    todo_issues = [
        "#2: Build basic Electron wrapper for PenPot",
        "#3: Build basic Electron wrapper for PenPot (duplicate)", 
        "#4: Add native desktop menus",
        "#5: Implement basic keyboard shortcuts",
        "#7: Create development branch strategy",
        "#8: Add native desktop menus (duplicate)",
        "#9: Implement basic keyboard shortcuts (duplicate)",
        "#25: Create development branch strategy (duplicate)",
        "#26: Build basic Electron wrapper for PenPot (duplicate)",
        "#27: Add native desktop menus (duplicate)", 
        "#28: Implement basic keyboard shortcuts (duplicate)",
        "#29: Test Electron app functionality",
        "#30: Create desktop app icon and branding",
        "#75: Test Electron app functionality (duplicate)"
    ]
    
    for item in todo_issues:
        print(f"  {item}")
    
    print(f"\n📚 SHOULD BE IN 'BACKLOG' (Month 2-6 - Future Sprints):")
    print("-" * 50)
    
    backlog_issues = [
        "#1: GitHub Integration Test",
        "#6: Replace PostgreSQL with SQLite for local mode",
        "#10: Create desktop app icon and branding",
        "#11-24: Month 2 tasks (local storage, file management)",
        "#31-50: Month 3 tasks (offline features, performance)",
        "#51-58: Month 4 tasks (developer features, installers)",
        "#59-70: Month 5 tasks (beta testing, community)",
        "#71-74: Month 6 tasks (analytics, investor prep)",
        "#76: Create investor pitch deck"
    ]
    
    for item in backlog_issues:
        print(f"  {item}")
    
    print(f"\n✅ SHOULD BE IN 'DONE' (Completed Tasks):")
    print("-" * 50)
    completed_tasks = [
        "Fork PenPot repository",
        "Set up Docker development environment", 
        "Get PenPot running locally in tmux",
        "Analyze ClojureScript frontend architecture",
        "Analyze Clojure backend architecture", 
        "Document development setup process",
        "Create Electron project structure"
    ]
    
    for task in completed_tasks:
        print(f"  ✓ {task}")
    
    print(f"\n🔄 CURRENT STATUS: All items are likely in 'No Status'")
    print(f"📋 Project URL: https://github.com/users/ollehca/projects/1")
    print(f"\n💡 Quick Organization:")
    print(f"   1. Select issues #2-9, #25-30, #75 → Drag to 'Todo'")
    print(f"   2. Select all other issues → Drag to 'Backlog'")
    print(f"   3. Manually mark completed foundation work as 'Done'")

if __name__ == "__main__":
    main()
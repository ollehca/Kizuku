#\!/usr/bin/env python3
import subprocess
import json
import csv

# Simple script to organize tasks by priority and sprint
def main():
    print("🚀 Organizing tasks into proper statuses...")
    
    # Month 1 High Priority Tasks (Todo)
    month1_high = [2, 3, 26, 29, 75]  # Critical Month 1 issues
    
    # Month 1 Medium/Low Priority (Todo) 
    month1_med = [4, 5, 7, 8, 9, 25, 27, 28, 30]  # Medium Month 1 issues
    
    # Month 2-6 tasks (Backlog)
    future_tasks = list(range(6, 25)) + list(range(31, 77))  # All other tasks
    
    # Organize into Todo (Month 1)
    todo_tasks = month1_high + month1_med
    
    print(f"📋 Moving {len(todo_tasks)} Month 1 tasks to 'Todo'")
    for issue_num in todo_tasks:
        cmd = f"gh issue edit {issue_num} --repo ollehca/penpot-desktop --add-label 'current-sprint'"
        subprocess.run(cmd.split(), capture_output=True)
        print(f"✅ Issue #{issue_num} → Todo")
    
    print(f"📚 Moving {len(future_tasks)} future tasks to 'Backlog'") 
    for issue_num in future_tasks:
        cmd = f"gh issue edit {issue_num} --repo ollehca/penpot-desktop --add-label 'backlog'"
        subprocess.run(cmd.split(), capture_output=True)
        print(f"📚 Issue #{issue_num} → Backlog")
    
    print("\n🎉 Task organization complete\!")
    print("📋 View project: https://github.com/users/ollehca/projects/1")
    print("\nNow manually drag tasks between columns:")
    print("• Month 1 tasks → Todo column")  
    print("• Month 2-6 tasks → Backlog column")

if __name__ == "__main__":
    main()
EOF < /dev/null
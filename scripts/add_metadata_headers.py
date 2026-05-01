#!/usr/bin/env python3
"""
File: scripts/add_metadata_headers.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import os
import subprocess
from datetime import datetime
from pathlib import Path

# Configuration
PROJECT_ROOT = Path("/Users/ruben/Code/competitie-planner.nl/competitie-planner.nl")
DATE = "2026-05-01"
API_VERSION = "0.1.0"
AUTHOR = "Ruben Barels <ruben@rabar.nl>"
CHANGELOG_ENTRY = "  - 2026-05-01: Initial metadata header added"

# File type templates
PYTHON_HEADER = '''"""
File: {relpath}
Last updated: {date}
API version: {api_version}
Author: {author}
Changelog:
{changelog}
"""

'''

JS_HEADER = """/*
 * File: {relpath}
 * Last updated: {date}
 * API version: {api_version}
 * Author: {author}
 * Changelog:
 * {changelog}
 */

"""

MD_HEADER = """<!--
File: {relpath}
Last updated: {date}
API version: {api_version}
Author: {author}
Changelog:
{changelog}
-->

"""

def get_header(filepath: Path, relpath: str) -> str:
    """Generate appropriate header for file type."""
    suffix = filepath.suffix.lower()
    if suffix == '.py':
        return PYTHON_HEADER.format(
            relpath=relpath,
            date=DATE,
            api_version=API_VERSION,
            author=AUTHOR,
            changelog=CHANGELOG_ENTRY
        )
    elif suffix in ['.js', '.jsx', '.ts', '.tsx']:
        return JS_HEADER.format(
            relpath=relpath,
            date=DATE,
            api_version=API_VERSION,
            author=AUTHOR,
            changelog=CHANGELOG_ENTRY
        )
    elif suffix == '.md':
        return MD_HEADER.format(
            relpath=relpath,
            date=DATE,
            api_version=API_VERSION,
            author=AUTHOR,
            changelog=CHANGELOG_ENTRY
        )
    else:
        raise ValueError(f"Unsupported file type: {suffix} for {relpath}")

def get_tracked_files() -> list[Path]:
    """Get list of source files tracked by git."""
    result = subprocess.run(
        ['git', 'ls-files', '*.py', '*.js', '*.jsx', '*.ts', '*.tsx', '*.md'],
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT
    )
    files = []
    for line in result.stdout.strip().split('\n'):
        if line:
            path = PROJECT_ROOT / line
            if path.exists():
                files.append(path)
    return sorted(files)

def should_process(filepath: Path, relpath_str: str) -> bool:
    """Check if file should be processed (not in excluded paths)."""
    excluded_patterns = [
        'frontend/dist/',
        'frontend/storybook-static/',
        'frontend/coverage/',
        'frontend/test-results/',
        'frontend/playwright-report/',
        'node_modules/',
        '__pycache__/',
        '.pytest_cache/',
        'frontend/vite.config.d.ts',
        'frontend/vitest.shims.d.ts',
        'frontend/src/vite-env.d.ts',
        '.venv/',
        'backend/.venv/',
        '.kilo/',
        'roadmap/',  # We'll handle IMPROVEMENT-PLAN.md separately
    ]
    return not any(pattern in relpath_str for pattern in excluded_patterns)

def file_has_header(filepath: Path) -> bool:
    """Check if file already has a metadata header (simple heuristic)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        first_lines = ''.join([f.readline() for _ in range(10)])
    # Check for typical header patterns
    return 'Last updated:' in first_lines or 'API version:' in first_lines or 'File:' in first_lines

def process_file(filepath: Path, dry_run: bool = False) -> bool:
    """Add metadata header to a single file."""
    try:
        relpath = filepath.relative_to(PROJECT_ROOT)
        relpath_str = str(relpath)
        
        if not should_process(filepath, relpath_str):
            return False
        
        # Check existing header
        if file_has_header(filepath):
            print(f"SKIP (already has header): {relpath}")
            return False
        
        # Read current content
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Generate header
        header = get_header(filepath, relpath_str)
        
        # Prepend header
        new_content = header + content
        
        if dry_run:
            print(f"Would update: {relpath}")
        else:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {relpath}")
        
        return True
    except Exception as e:
        print(f"ERROR processing {filepath}: {e}")
        return False

def main():
    """Main function to process all files."""
    # Get tracked files
    files = get_tracked_files()
    
    # Filter
    files = [f for f in files if should_process(f, str(f.relative_to(PROJECT_ROOT)))]
    
    print(f"Found {len(files)} files to process")
    print(f"Date: {DATE}, API Version: {API_VERSION}")
    print(f"Author: {AUTHOR}")
    print()
    
    # First do a dry run (show first 50)
    print("=== DRY RUN (showing first 50) ===")
    updated_count = 0
    for filepath in files[:50]:
        if process_file(filepath, dry_run=True):
            updated_count += 1
    
    if len(files) > 50:
        print(f"... and {len(files) - 50} more files")
    
    print(f"\nWould update {updated_count} files (showing first 50)")
    
    # Ask for confirmation
    response = input("\nProceed with actual update? (yes/no): ").strip().lower()
    if response != 'yes':
        print("Aborted.")
        return
    
    # Actual update
    print("\n=== UPDATING ===")
    updated = 0
    for i, filepath in enumerate(files, 1):
        if process_file(filepath, dry_run=False):
            updated += 1
        # Progress every 50
        if i % 50 == 0:
            print(f"Progress: {i}/{len(files)} files processed...")
    
    print(f"\nUpdated {updated} files successfully!")

if __name__ == '__main__':
    main()

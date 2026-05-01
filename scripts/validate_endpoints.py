#!/usr/bin/env python3
"""
Automated Endpoint Validation Script

Parses documented endpoints from markdown files and validates them against
the actual FastAPI route registration. This catches endpoint drift automatically.

Usage:
    python scripts/validate_endpoints.py
    python scripts/validate_endpoints.py --format json
    python scripts/validate_endpoints.py --output report.json
"""

import argparse
import ast
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional


# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent
BACKEND_ROUTERS_DIR = PROJECT_ROOT / "backend" / "app" / "routers"
DOCS_DIR = PROJECT_ROOT / "roadmap"


@dataclass
class DocumentedEndpoint:
    """Represents an endpoint documented in markdown files."""
    method: str
    path: str
    source_file: str
    source_line: int
    context: str = ""
    has_auth: Optional[bool] = None
    router_key: str = ""  # e.g., "superadmin/clubs" for grouping


@dataclass
class RegisteredEndpoint:
    """Represents an endpoint registered in FastAPI."""
    method: str
    path: str
    router_file: str
    function_name: str
    router_prefix: str
    full_path: str
    router_key: str = ""


@dataclass
class ValidationResult:
    """Result of endpoint validation."""
    documented: List[Dict]
    registered: List[Dict]
    documented_only: List[Dict]  # In docs but not in code
    registered_only: List[Dict]  # In code but not in docs
    matched: List[Dict]  # Found in both
    errors: List[str]
    warnings: List[str]
    summary: Dict[str, int]


def extract_endpoints_from_routers() -> List[RegisteredEndpoint]:
    """
    Parse all router Python files to extract registered endpoints.
    Uses AST parsing for accuracy and Python version support.
    """
    endpoints: List[RegisteredEndpoint] = []

    if not BACKEND_ROUTERS_DIR.exists():
        return endpoints

    for router_file in sorted(BACKEND_ROUTERS_DIR.glob("*.py")):
        if router_file.name == "__init__.py":
            continue

        try:
            with open(router_file, "r", encoding="utf-8") as f:
                content = f.read()

            tree = ast.parse(content)
            router_prefix = _extract_router_prefix(tree)

            # Use NodeVisitor to find functions with @router decorators
            visitor = _RouterVisitor(router_file, router_prefix)
            visitor.visit(tree)
            endpoints.extend(visitor.endpoints)
        except Exception as e:
            print(f"Warning: Failed to parse {router_file}: {e}", file=sys.stderr)

    return endpoints


class _RouterVisitor(ast.NodeVisitor):
    """AST visitor that collects endpoints from @router decorators."""

    def __init__(self, router_file: Path, router_prefix: str):
        self.router_file = router_file
        self.router_prefix = router_prefix
        self.endpoints: List[RegisteredEndpoint] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Visit a function definition and check its decorators."""
        for decorator in node.decorator_list:
            endpoint = self._parse_decorator(decorator, node.name)
            if endpoint:
                self.endpoints.append(endpoint)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """Visit an async function definition and check its decorators."""
        self.visit_FunctionDef(node)  # Treat same as regular function

    def _parse_decorator(
        self, decorator: ast.expr, func_name: str
    ) -> Optional[RegisteredEndpoint]:
        """Parse a @router.get/post/etc decorator."""
        # Handle @router.get("/path") or @router.get
        if not isinstance(decorator, ast.Call):
            return None

        if not isinstance(decorator.func, ast.Attribute):
            return None

        method = decorator.func.attr.upper()
        if method not in ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"):
            return None

        # Extract path from first arg
        path = ""
        if decorator.args:
            arg = decorator.args[0]
            if isinstance(arg, ast.Constant):
                path = arg.value
        if not path:
            return None

        full_path = self.router_prefix.rstrip("/") + ("/" + path.lstrip("/") if path != "/" else "")

        return RegisteredEndpoint(
            method=method,
            path=path,
            router_file=str(self.router_file.relative_to(PROJECT_ROOT)),
            function_name=func_name,
            router_prefix=self.router_prefix,
            full_path=full_path.rstrip("/") or "/",
            router_key=_make_router_key(self.router_prefix, path),
        )


def _extract_router_prefix(tree: ast.AST) -> str:
    """Extract the router prefix from APIRouter(prefix="...") declaration."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if (isinstance(node.func, ast.Name) and node.func.id == "APIRouter") or \
               (isinstance(node.func, ast.Attribute) and node.func.attr == "APIRouter"):
                for kw in node.keywords:
                    if kw.arg == "prefix" and isinstance(kw.value, ast.Constant):
                        prefix = kw.value.value
                        return prefix if prefix else ""
    return ""


def _parse_decorator_call(
    node: ast.Call, router_file: Path, router_prefix: str
) -> Optional[RegisteredEndpoint]:
    """Parse a @router.get/post/etc decorator call."""
    # Check if this is a router method call
    method = None
    if isinstance(node.func, ast.Attribute):
        if node.func.attr in ("get", "post", "put", "patch", "delete", "head", "options"):
            method = node.func.attr.upper()
    if not method:
        return None

    # Extract the path (first positional arg or keyword arg 'path' / first arg)
    path = ""
    if node.args:
        if isinstance(node.args[0], ast.Constant):
            path = node.args[0].value
    else:
        for kw in node.keywords:
            if kw.arg in ("path", "route") and isinstance(kw.value, ast.Constant):
                path = kw.value.value
                break

    if not path:
        return None

    # Extract function name
    parent = getattr(node, "parent", None)
    func_name = "<unknown>"
    if parent and isinstance(parent, ast.FunctionDef):
        func_name = parent.name

    full_path = router_prefix.rstrip("/") + ("/" + path.lstrip("/") if path != "/" else "")

    return RegisteredEndpoint(
        method=method,
        path=path,
        router_file=str(router_file.relative_to(PROJECT_ROOT)),
        function_name=func_name,
        router_prefix=router_prefix,
        full_path=full_path.rstrip("/") or "/",
        router_key=_make_router_key(router_prefix, path),
    )


def _make_router_key(router_prefix: str, path: str) -> str:
    """Create a human-readable router key for grouping."""
    prefix_clean = router_prefix.strip("/").replace("/", "_") or "root"
    path_clean = path.strip("/").replace("/", "_") or "index"
    if path_clean.startswith("{"):
        path_clean = path_clean.split("{")[0].rstrip("_") or "item"
    return f"{prefix_clean}/{path_clean}"


def extract_endpoints_from_markdown() -> List[DocumentedEndpoint]:
    """
    Parse markdown files to find documented endpoints.
    Looks for HTTP method + path patterns in code blocks and inline text.
    """
    docs_patterns = [
        DOCS_DIR / "QA-base.md",
        DOCS_DIR / "QA-agent-features.md",
        DOCS_DIR / "QA-agent-rbac.md",
        PROJECT_ROOT / "architecture" / "*.md",
    ]

    endpoints: List[DocumentedEndpoint] = []

    # Collect all markdown files
    md_files: List[Path] = []
    md_files.extend(DOCS_DIR.glob("*.md"))
    arch_dir = PROJECT_ROOT / "architecture"
    if arch_dir.exists():
        md_files.extend(arch_dir.glob("*.md"))

    for md_file in sorted(set(md_files)):
        try:
            with open(md_file, "r", encoding="utf-8") as f:
                content = f.read()

            file_endpoints = _parse_markdown_file(md_file, content)
            endpoints.extend(file_endpoints)
        except Exception as e:
            print(f"Warning: Failed to parse {md_file}: {e}", file=sys.stderr)

    return endpoints


def _parse_markdown_file(md_file: Path, content: str) -> List[DocumentedEndpoint]:
    """Parse a single markdown file for endpoint documentation."""
    endpoints: List[DocumentedEndpoint] = []
    lines = content.split("\n")

    # Pattern 1: HTTP method followed by path in backticks or code blocks
    # e.g., `GET /api/v1/endpoint` or ```http\nGET /api/v1/endpoint```
    http_code_block = False

    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()

        # Track HTTP code blocks
        if stripped.startswith("```http") or stripped.startswith("```HTTP"):
            http_code_block = True
            continue
        elif stripped == "```":
            http_code_block = False
            continue

        # In HTTP code blocks, every non-empty line is likely an endpoint request line
        if http_code_block and stripped:
            endpoint = _try_parse_endpoint_line(stripped, md_file, line_num, context="HTTP code block")
            if endpoint:
                endpoints.append(endpoint)
            continue

        # Pattern 2: Inline backticks with HTTP method
        # e.g., `GET /path` or `POST /path`
        inline_matches = re.findall(r'`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^`\s]+)`', line)
        for method, path in inline_matches:
            endpoints.append(DocumentedEndpoint(
                method=method,
                path=path,
                source_file=str(md_file.relative_to(PROJECT_ROOT)),
                source_line=line_num,
                context=f"Inline: {stripped[:80]}",
            ))

        # Pattern 3: Text descriptions like "GET /path" or "POST /path" in regular text
        # Look for clear HTTP method at line start or after common prefixes
        text_matches = re.findall(
            r'(?:^|\s|>)(GET|POST|PUT|PATCH|DELETE)\s+(/\S+)(?=\s|$|,|\.|\))',
            line
        )
        for method, path in text_matches:
            # Filter out likely false positives (like "5. GET /path" numbering)
            clean_path = path.rstrip(".,;)")
            if clean_path.count("/") >= 2 or "api" in clean_path.lower() or "auth" in clean_path.lower():
                endpoints.append(DocumentedEndpoint(
                    method=method,
                    path=clean_path,
                    source_file=str(md_file.relative_to(PROJECT_ROOT)),
                    source_line=line_num,
                    context=stripped[:100],
                ))

        # Pattern 4: curl-like examples
        curl_match = re.search(
            r'curl\s+.*?\s-(?:X|request)\s+(GET|POST|PUT|PATCH|DELETE)\s+(\S+)',
            line
        )
        if curl_match:
            method, url = curl_match.groups()
            # Extract path from URL
            path_match = re.search(r'(?:https?://[^/]+)?(/[^\s?]*)', url)
            if path_match:
                endpoints.append(DocumentedEndpoint(
                    method=method,
                    path=path_match.group(1),
                    source_file=str(md_file.relative_to(PROJECT_ROOT)),
                    source_line=line_num,
                    context=f"curl example: {stripped[:80]}",
                ))

        # Determine auth requirement from context
        if endpoints and "Authorization" in line or "Bearer" in line or "JWT" in line:
            if endpoints:
                endpoints[-1].has_auth = True

    return _deduplicate_endpoints(endpoints)


def _try_parse_endpoint_line(
    line: str, md_file: Path, line_num: int, context: str
) -> Optional[DocumentedEndpoint]:
    """Try to parse a line as an HTTP endpoint request line."""
    line = line.strip()
    if not line:
        return None

    # Match: METHOD /path HTTP/1.1 or just METHOD /path
    match = re.match(
        r"^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(/\S+)(?:\s+HTTP/\d\.\d)?$",
        line
    )
    if match:
        method, path = match.groups()
        clean_path = path.split("?")[0].rstrip("/") or "/"
        return DocumentedEndpoint(
            method=method,
            path=clean_path,
            source_file=str(md_file.relative_to(PROJECT_ROOT)),
            source_line=line_num,
            context=context,
        )
    return None


def _deduplicate_endpoints(endpoints: List[DocumentedEndpoint]) -> List[DocumentedEndpoint]:
    """Remove duplicate endpoint entries while preserving order."""
    seen: Set[Tuple[str, str]] = set()
    unique: List[DocumentedEndpoint] = []
    for ep in endpoints:
        key = (ep.method, ep.path)
        if key not in seen:
            seen.add(key)
            unique.append(ep)
    return unique


def _normalize_path(path: str) -> str:
    """Normalize path for comparison: strip trailing slash, handle root."""
    path = path.rstrip("/") or "/"
    return path


def match_endpoints(
    documented: List[DocumentedEndpoint],
    registered: List[RegisteredEndpoint],
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Match documented endpoints against registered ones.
    Returns (matched, documented_only, registered_only).
    """
    # Build lookup sets
    registered_set: Set[Tuple[str, str]] = set()
    for reg in registered:
        # Normalize: remove trailing slash, handle path parameters loosely
        norm_path = _normalize_path(reg.full_path)
        # For path params like {id}, create a pattern
        pattern = re.sub(r'\{[^}]+\}', '{id}', norm_path)
        registered_set.add((reg.method, pattern))

    matched: List[Dict] = []
    documented_only: List[Dict] = []
    registered_only: List[Dict] = []

    # Find documented endpoints that match registered ones
    used_registered: Set[Tuple[str, str, str]] = set()

    for doc in documented:
        doc_norm = _normalize_path(doc.path)
        # Create pattern from documented path too (in case it includes path params)
        doc_pattern = re.sub(r'\{[^}]+\}', '{id}', doc_norm)
        key = (doc.method, doc_pattern)

        if key in registered_set:
            # Find the matching registered endpoint
            matching_reg = None
            for reg in registered:
                reg_norm = _normalize_path(reg.full_path)
                reg_pattern = re.sub(r'\{[^}]+\}', '{id}', reg_norm)
                if (reg.method, reg_pattern) == key and (reg.method, reg.full_path, reg.router_file) not in used_registered:
                    matching_reg = reg
                    used_registered.add((reg.method, reg.full_path, reg.router_file))
                    break

            matched.append({
                "method": doc.method,
                "path": doc.path,
                "documented_in": f"{doc.source_file}:{doc.source_line}",
                "registered_in": matching_reg.router_file if matching_reg else "unknown",
                "function": matching_reg.function_name if matching_reg else "unknown",
                "full_path": matching_reg.full_path if matching_reg else doc.path,
            })
        else:
            # Check if there's a registered endpoint with same method and path but different param format
            alt_match = None
            for reg in registered:
                if reg.method == doc.method and _paths_similar(doc.path, reg.full_path):
                    alt_match = reg
                    break

            if alt_match:
                matched.append({
                    "method": doc.method,
                    "path": doc.path,
                    "documented_in": f"{doc.source_file}:{doc.source_line}",
                    "registered_in": alt_match.router_file,
                    "function": alt_match.function_name,
                    "full_path": alt_match.full_path,
                    "note": "Path format differs slightly",
                })
                used_registered.add((alt_match.method, alt_match.full_path, alt_match.router_file))
            else:
                documented_only.append({
                    "method": doc.method,
                    "path": doc.path,
                    "source": f"{doc.source_file}:{doc.source_line}",
                    "context": doc.context[:100] if doc.context else "",
                })

    # Find registered endpoints not in documented
    for reg in registered:
        if (reg.method, reg.full_path, reg.router_file) not in used_registered:
            # Skip common internal/health check endpoints
            if any(skip in reg.full_path for skip in ["/health", "/docs", "/redoc", "/openapi.json", "/metrics", "/staticfiles"]):
                continue
            registered_only.append({
                "method": reg.method,
                "path": reg.full_path,
                "router_file": reg.router_file,
                "function": reg.function_name,
                "router_prefix": reg.router_prefix,
            })

    return matched, documented_only, registered_only


def _paths_similar(path1: str, path2: str) -> bool:
    """Check if two paths are similar (accounting for path param differences)."""
    p1 = re.sub(r'\{[^}]+\}', '{id}', _normalize_path(path1))
    p2 = re.sub(r'\{[^}]+\}', '{id}', _normalize_path(path2))
    return p1 == p2


def analyze_api_structure(registered: List[RegisteredEndpoint]) -> Dict[str, List[str]]:
    """Analyze the API structure by router."""
    routers: Dict[str, List[str]] = {}
    for reg in registered:
        key = reg.router_prefix or "/"
        if key not in routers:
            routers[key] = []
        routers[key].append(f"{reg.method} {reg.full_path}")
    return {k: sorted(v) for k, v in sorted(routers.items())}


def validate_endpoints(
    output_format: str = "text",
    output_file: Optional[str] = None,
) -> ValidationResult:
    """Main validation function."""
    print("=" * 70)
    print("AUTOMATED ENDPOINT VALIDATION")
    print("=" * 70)
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Backend routers: {BACKEND_ROUTERS_DIR}")
    print(f"Docs directory: {DOCS_DIR}")
    print()

    errors: List[str] = []
    warnings: List[str] = []

    # Step 1: Extract registered endpoints
    print("[1/3] Extracting registered endpoints from FastAPI routers...")
    registered = extract_endpoints_from_routers()
    print(f"      Found {len(registered)} registered endpoints")

    if not registered:
        warnings.append("No registered endpoints found. Check router directory path.")

    # Step 2: Extract documented endpoints
    print("[2/3] Extracting documented endpoints from markdown files...")
    documented = extract_endpoints_from_markdown()
    print(f"      Found {len(documented)} documented endpoints")

    if not documented:
        warnings.append("No documented endpoints found. Check docs directory path.")

    # Step 3: Match and compare
    print("[3/3] Matching documented vs registered endpoints...")
    matched, documented_only, registered_only = match_endpoints(documented, registered)

    print()
    print("-" * 70)
    print("RESULTS")
    print("-" * 70)
    print(f"  Total registered endpoints:  {len(registered)}")
    print(f"  Total documented endpoints:  {len(documented)}")
    print(f"  Matched endpoints:           {len(matched)}")
    print(f"  Undocumented endpoints:      {len(registered_only)}")
    print(f"  Unregistered endpoints:      {len(documented_only)}")
    print()

    # Print matched endpoints
    if matched:
        print("✓ MATCHED ENDPOINTS")
        print("-" * 70)
        for m in sorted(matched, key=lambda x: (x["method"], x["full_path"])):
            print(f"  {m['method']:6s} {m['full_path']}")
            print(f"    Docs:  {m['documented_in']}")
            print(f"    Code:  {m['registered_in']} :: {m['function']}()")
            if "note" in m:
                print(f"    Note:  {m['note']}")
            print()

    # Print undocumented endpoints (in code but not in docs)
    if registered_only:
        print("⚠ UNDOCUMENTED ENDPOINTS (in code but not in docs)")
        print("-" * 70)
        for r in sorted(registered_only, key=lambda x: (x["method"], x["path"])):
            print(f"  {r['method']:6s} {r['path']}")
            print(f"    File: {r['router_file']} :: {r['function']}()")
            print()
        warnings.append(f"{len(registered_only)} endpoint(s) are not documented")

    # Print unregistered endpoints (in docs but not in code)
    if documented_only:
        print("❌ UNREGISTERED ENDPOINTS (in docs but not in code) - DRIFT DETECTED!")
        print("-" * 70)
        for d in sorted(documented_only, key=lambda x: (x["method"], x["path"])):
            print(f"  {d['method']:6s} {d['path']}")
            print(f"    Source: {d['source']}")
            if d["context"]:
                print(f"    Context: {d['context']}")
            print()
        errors.append(f"{len(documented_only)} documented endpoint(s) not found in code - endpoint drift!")

    # API structure analysis
    print("API STRUCTURE (by router prefix)")
    print("-" * 70)
    structure = analyze_api_structure(registered)
    for prefix, endpoints in structure.items():
        print(f"  {prefix or '(root)'}")
        for ep in endpoints:
            print(f"    {ep}")
        print()

    # Build summary
    summary = {
        "total_registered": len(registered),
        "total_documented": len(documented),
        "matched": len(matched),
        "undocumented_count": len(registered_only),
        "unregistered_count": len(documented_only),
        "has_drift": len(documented_only) > 0,
        "has_undocumented": len(registered_only) > 0,
    }

    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    for key, value in summary.items():
        print(f"  {key}: {value}")

    if errors:
        print()
        print("ERRORS:")
        for err in errors:
            print(f"  ✗ {err}")

    if warnings:
        print()
        print("WARNINGS:")
        for warn in warnings:
            print(f"  ⚠ {warn}")

    print()
    print("=" * 70)

    result = ValidationResult(
        documented=[asdict(d) for d in documented],
        registered=[asdict(r) for r in registered],
        documented_only=documented_only,
        registered_only=registered_only,
        matched=matched,
        errors=errors,
        warnings=warnings,
        summary=summary,
    )

    # Output formatted result
    if output_format == "json":
        output_data = {
            "validation": asdict(result),
            "timestamp": __import__("datetime").datetime.now().isoformat(),
        }
        output_text = json.dumps(output_data, indent=2)
    else:
        output_text = None

    if output_file:
        with open(output_file, "w") as f:
            f.write(output_text or json.dumps(asdict(result), indent=2))
        print(f"Report written to: {output_file}")

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Validate documented endpoints against actual FastAPI registrations."
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)",
    )
    parser.add_argument(
        "--output",
        help="Write output to file (JSON format)",
    )
    parser.add_argument(
        "--fail-on-drift",
        action="store_true",
        help="Exit with code 1 if endpoint drift is detected",
    )
    args = parser.parse_args()

    result = validate_endpoints(output_format=args.format, output_file=args.output)

    if args.fail_on_drift and result.summary["has_drift"]:
        sys.exit(1)

    sys.exit(0 if not result.errors else 1)


if __name__ == "__main__":
    main()

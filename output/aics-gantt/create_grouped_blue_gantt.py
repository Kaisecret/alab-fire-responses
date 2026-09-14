"""Reuse the supplied reference layout with AICS tasks and a blue/cyan palette."""
from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[2]
source = (ROOT / 'output/bfp-gantt/create_grouped_gantt.py').read_text(encoding='utf-8')
groups = [
    ('Planning', '#00539B', [
        ('Project objectives and goals', 0, 1),
        ('Project scope and limitations', 0, 2),
        ('Resource and tool planning', 1, 3),
        ('Initial project and task allocation', 2, 4),
    ]),
    ('Analysis', '#0068B5', [
        ('Gather user requirements', 0, 2),
        ('Functional and non-functional\nrequirements', 1, 3),
        ('Review AICS application workflows', 1, 3),
        ('Validate system requirements', 2, 4),
    ]),
    ('Design', '#007CBF', [
        ('Database schema and data\nflow design', 4, 7),
        ('System architecture design', 4, 7),
        ('Web interface and wireframe design', 5, 8),
        ('Review and finalize design documents', 6, 8),
    ]),
    ('Documentation', '#00539B', [
        ('Chapter 1', 0, 6),
        ('Chapter 2', 2, 8),
        ('Chapter 3', 4, 12),
    ]),
    ('Implementation', '#08A8D8', [
        ('Backend and database integration', 8, 10),
        ('Applicant and PSWDO web development', 8, 14),
        ('Pre-screening, AI verification\nand service integrations', 9, 16),
        ('Debugging and sprint refinements', 10, 16),
    ]),
    ('Testing', '#18BFE3', [
        ('Alpha and integration testing', 16, 18),
        ('IT expert quality evaluation', 17, 19),
        ('Applicant and PSWDO user testing', 18, 20),
        ('Bug fixing and adjustments', 17, 20),
    ]),
    ('Deployment', '#0068B5', [
        ('Final preparation for deployment', 20, 22),
        ('System deployment at PSWDO\nin Antique', 21, 23),
        ('Final reporting and turnover', 26, 28),
        ('Maintenance and operational evaluation', 22, 28),
    ]),
]

tree = ast.parse(source)
assignment = next(n for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'GROUPS' for t in n.targets))
lines = source.splitlines(keepends=True)
source = ''.join(lines[:assignment.lineno-1]) + 'GROUPS = ' + repr(groups) + '\n' + ''.join(lines[assignment.end_lineno:])
source = source.replace("STEM = 'bfp-gantt-grouped-june-december-2026'", "STEM = 'aics-gantt-grouped-blue-june-december-2026'")
source = source.replace('#FBF7F8', '#F7FBFD').replace('#681622', '#004B91').replace('#B91C1C', '#0068B5').replace('#9F1239', '#00539B').replace('#E9DFE2', '#DCE8EE')
source = source.replace('GIS-Based Provincial Fire Response and Decision Support System with Smart Dispatch', 'AICS Application Pre-Screening with Automated Document Verification and Distribution')
source = source.replace('and Inter-Municipality Coordination for BFP in Antique', 'Notification System for the Provincial Social Welfare and Development Office (PSWDO)')
source = source.replace('Activities overlap across sprints. Chapter entries show initial drafting; revisions continue through final reporting.', 'Phase months follow Chapter III; weekly allocations and chapter drafting dates are proposed.')
source = source.replace('Figure 4. Proposed Project Development Gantt Chart', 'Figure 5. AICS Gantt Chart')
source = source.replace("for ext in ['png', 'svg']:", "for ext in ['png', 'svg', 'pdf']:")
exec(compile(source, str(Path(__file__)), 'exec'))

import fitz
pdf = fitz.open(ROOT / 'tests/aics-gantt-grouped-blue-june-december-2026.pdf')
assert len(pdf) == 1
assert 'Figure 5. AICS Gantt Chart' in pdf[0].get_text()
pdf[0].get_pixmap(matrix=fitz.Matrix(1.25, 1.25)).save(ROOT / 'tmp/gantt-chapters/aics-grouped-blue-preview.png')

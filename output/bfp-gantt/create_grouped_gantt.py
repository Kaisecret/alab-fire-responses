from pathlib import Path
import calendar
import csv
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tests'
STEM = 'bfp-gantt-grouped-june-december-2026'
MONTHS = ['JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
# Proposed schedule: four date divisions per calendar month, 28 divisions total.
GROUPS = [
    ('Planning', '#B91C1C', [
        ('Project objectives and goals', 0, 1),
        ('Project scope and limitations', 0, 2),
        ('Resource and tool planning', 1, 3),
        ('Initial project and task allocation', 2, 4),
    ]),
    ('Analysis', '#9F1239', [
        ('Gather user requirements', 2, 4),
        ('Functional and non-functional\nrequirements', 3, 5),
        ('Review BFP response workflows', 4, 6),
        ('Validate system requirements', 5, 6),
    ]),
    ('Design', '#BE123C', [
        ('Database schema and data\nflow design', 4, 7),
        ('System architecture design', 4, 7),
        ('Web and mobile interface design', 5, 9),
        ('Review and finalize design documents', 6, 8),
    ]),
    ('Documentation', '#7F1D1D', [
        ('Chapter 1', 0, 6),
        ('Chapter 2', 2, 8),
        ('Chapter 3', 4, 12),
    ]),
    ('Implementation', '#DC2626', [
        ('Backend and database integration', 6, 10),
        ('Web and mobile development', 8, 20),
        ('GIS, dispatch and coordination', 10, 21),
        ('Debugging and refinements', 14, 24),
    ]),
    ('Testing', '#E34848', [
        ('Unit testing', 8, 24),
        ('Integration testing', 18, 24),
        ('User testing', 22, 26),
        ('Bug fixing and adjustments', 23, 27),
    ]),
    ('Deployment', '#A80F25', [
        ('Final preparation for deployment', 24, 25),
        ('Pilot deployment at participating\nBFP offices', 25, 26),
        ('Final reporting and turnover', 26, 28),
        ('Maintenance', 26, 28),
    ]),
]

plt.rcParams.update({'font.family': 'DejaVu Sans', 'svg.fonttype': 'none'})
left, chart_x, week_w = .16, 4.78, .346
chart_end = chart_x + 28 * week_w
panel_end = chart_end + .18
row_h, section_head, bottom_pad, section_gap = .52, .58, .18, .20
first_top = 2.45
body_height = sum(section_head + row_h*len(tasks) + bottom_pad for _, _, tasks in GROUPS)
body_height += section_gap * (len(GROUPS)-1)
height = first_top + body_height + 1.45
fig, ax = plt.subplots(figsize=(15, height * .70), dpi=240)
fig.patch.set_facecolor('#FBF7F8')
fig.subplots_adjust(left=.018, right=.982, top=.985, bottom=.015)
ax.set_xlim(0, panel_end + .16)
ax.set_ylim(height, 0)
ax.axis('off')

ax.text(.35, .45, 'Project Development Timeline', fontsize=23,
        weight='bold', color='#681622', va='center')
ax.text(.35, 1.00,
        'GIS-Based Provincial Fire Response and Decision Support System with Smart Dispatch',
        fontsize=10.3, color='#545454', va='center')
ax.text(.35, 1.34, 'and Inter-Municipality Coordination for BFP in Antique',
        fontsize=10.3, color='#545454', va='center')
ax.text(panel_end-.12, .45, '2026', fontsize=22, weight='bold',
        color='#B91C1C', va='center', ha='right')
ax.text(.4, 1.98, 'Timeline', fontsize=12.2, weight='bold', color='#303030', va='center')
for i, name in enumerate(MONTHS):
    ax.text(chart_x + (i*4+2)*week_w, 1.91, name,
            fontsize=9.5, color='#3F3F3F', ha='center', va='center')
    for j in range(4):
        ax.text(chart_x + (i*4+j+.5)*week_w, 2.22, f'W{j+1}',
                fontsize=7.7, color='#777777', ha='center', va='center')

y = first_top
task_labels = []
for phase, color, tasks in GROUPS:
    panel_h = section_head + row_h*len(tasks) + bottom_pad
    panel = FancyBboxPatch((left, y), panel_end-left, panel_h,
                          boxstyle='round,pad=0.012,rounding_size=0.16',
                          facecolor='white', edgecolor='#E9DFE2', linewidth=.85)
    ax.add_patch(panel)
    for division in range(29):
        x = chart_x + division*week_w
        ax.plot([x, x], [y, y+panel_h], color=color if division % 4 == 0 else '#DCDCDC',
                alpha=.48 if division % 4 == 0 else .62,
                lw=.68 if division % 4 == 0 else .44)
    ax.text(.48, y+.30, phase, fontsize=12.2, weight='bold', color=color, va='center')
    first = min(t[1] for t in tasks)
    last = max(t[2] for t in tasks)
    ax.plot([chart_x+first*week_w+.015, chart_x+last*week_w-.015], [y+.30]*2,
            color=color, linewidth=2.7, solid_capstyle='butt', zorder=4)
    for i, (label, start, end) in enumerate(tasks):
        assert 0 <= start < end <= 28
        center = y+section_head + row_h*(i+.5)
        text = ax.text(.70, center, label, fontsize=10.25, color='#444444',
                       va='center', linespacing=1.16)
        task_labels.append(text)
        bar_start = chart_x+start*week_w+.014
        width = (end-start)*week_w-.028
        ax.add_patch(Rectangle((bar_start, center-.166), width, .332,
                               facecolor=color, alpha=.23, edgecolor='none', zorder=3))
        ax.plot(chart_x+end*week_w-.085, center, marker='o', markersize=3.6,
                color=color, alpha=.9, zorder=5)
    y += panel_h + section_gap

footer = y-section_gap
ax.text(.35, footer+.40, 'PROPOSED SCHEDULE', fontsize=9.3, color='#9F1239', weight='bold')
ax.text(panel_end-.05, footer+.40,
        'W1: 1–7  ·  W2: 8–14  ·  W3: 15–21  ·  W4: 22–month end',
        fontsize=8.3, color='#666666', ha='right')
ax.text(.35, footer+.76,
        'Activities overlap across sprints. Chapter entries show initial drafting; revisions continue through final reporting.',
        fontsize=8.8, color='#666666')
ax.text((panel_end+left)/2, footer+1.18,
        'Figure 4. Proposed Project Development Gantt Chart',
        fontsize=11, color='#454545', style='italic', ha='center')

fig.canvas.draw()
renderer = fig.canvas.get_renderer()
for text in ax.texts:
    box = text.get_window_extent(renderer)
    assert fig.bbox.contains(box.x0, box.y0) and fig.bbox.contains(box.x1, box.y1), text.get_text()
label_boundary = ax.transData.transform((chart_x-.10, 0))[0]
for text in task_labels:
    assert text.get_window_extent(renderer).x1 < label_boundary, f'Label overlaps grid: {text.get_text()}'
for ext in ['png', 'svg']:
    fig.savefig(OUT / f'{STEM}.{ext}', facecolor=fig.get_facecolor())
plt.close(fig)

def date_for(division, end=False):
    if end:
        month_index, week = divmod(division-1, 4)
        month = 6+month_index
        day = [7, 14, 21, calendar.monthrange(2026, month)[1]][week]
    else:
        month_index, week = divmod(division, 4)
        month = 6+month_index
        day = [1, 8, 15, 22][week]
    return f'2026-{month:02d}-{day:02d}'

with (OUT / f'{STEM}.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Phase', 'Task', 'Proposed start', 'Proposed end'])
    for phase, _, tasks in GROUPS:
        for label, start, end in tasks:
            writer.writerow([phase, label.replace('\n', ' '), date_for(start), date_for(end, end=True)])
print(f'Created {OUT / (STEM + ".png")}')
print('Validated: 7 phases, 27 tasks, June–December 2026; all labels fit and task intervals are in range.')

from pathlib import Path
import csv
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

OUT = Path(__file__).resolve().parent
MONTHS = ['June', 'July', 'August', 'September', 'October', 'November', 'December']
# Half-month units: 0 = first half of June; 14 = end of December.
# Proposed allocations, not records of completed work.
TASKS = [
    ('Requirements and product backlog', 0, 2),
    ('Architecture, interface and database design', 1, 3),
    ('Resident accounts and fire reporting', 2, 5),
    ('GIS mapping and severity assessment', 3, 6),
    ('Dispatch, routes and resource monitoring', 4, 8),
    ('Inter-municipality coordination', 6, 9),
    ('Firefighter application and offline functions', 7, 11),
    ('Dashboards, notifications and reports', 8, 11),
    ('Testing, sprint reviews and retrospectives', 2, 12),
    ('Pilot deployment and user orientation', 11, 13),
    ('System evaluation and revisions', 12, 14),
    ('Research documentation and final submission', 0, 14),
]

plt.rcParams.update({'font.family': 'DejaVu Sans', 'svg.fonttype': 'none'})
fig, ax = plt.subplots(figsize=(16, 10.5), dpi=240)
fig.patch.set_facecolor('white')
ax.set_xlim(0, 16)
ax.set_ylim(14.2, 0)
ax.axis('off')
fig.subplots_adjust(left=.025, right=.975, top=.98, bottom=.025)

red, dark, muted = '#C62828', '#6F151C', '#666666'
ax.text(.2, .45, 'PROJECT DEVELOPMENT GANTT CHART', fontsize=23,
        color=dark, weight='bold', va='center')
ax.text(.2, 1.00, 'GIS-Based Provincial Fire Response and Decision Support System with Smart Dispatch',
        fontsize=11.5, color='#303030', va='center')
ax.text(.2, 1.38, 'and Inter-Municipality Coordination for BFP in Antique',
        fontsize=11.5, color='#303030', va='center')
ax.text(.2, 1.99, 'PROPOSED SCHEDULE  |  JUNE–DECEMBER 2026',
        fontsize=10.5, color=red, weight='bold', va='center')

x0, activity_width, month_width = .2, 6.0, 1.35
grid_x = x0 + activity_width
table_width = activity_width + month_width * 7
table_top, header_height, row_height = 2.5, .76, .73
body_top = table_top + header_height
table_bottom = body_top + len(TASKS) * row_height

ax.add_patch(Rectangle((x0, table_top), table_width, header_height, facecolor=dark))
ax.text(x0 + .2, table_top + header_height / 2, 'DEVELOPMENT ACTIVITIES',
        color='white', fontsize=11, weight='bold', va='center')
for month_index, name in enumerate(MONTHS):
    x = grid_x + month_index * month_width
    ax.text(x + month_width / 2, table_top + header_height / 2, name,
            color='white', fontsize=10, weight='bold', ha='center', va='center')

for i, (name, start, end) in enumerate(TASKS):
    assert 0 <= start < end <= 14
    y = body_top + i * row_height
    ax.add_patch(Rectangle((x0, y), table_width, row_height,
                           facecolor='#FAF6F6' if i % 2 == 0 else 'white'))
    ax.text(x0 + .18, y + row_height / 2, f'{i + 1:02d}',
            fontsize=9.5, color='#A37679', va='center')
    ax.text(x0 + .62, y + row_height / 2, name, fontsize=10.1,
            color='#242424', va='center')
    bar_x = grid_x + start * month_width / 2 + .065
    bar_width = (end - start) * month_width / 2 - .13
    ax.add_patch(Rectangle((bar_x, y + .195), bar_width, .34,
                           facecolor=red if i < 9 else dark, zorder=4))

for i in range(len(TASKS) + 1):
    y = body_top + i * row_height
    ax.plot([x0, x0 + table_width], [y, y], color='#DED4D5', lw=.6, zorder=2)
for i in range(8):
    x = grid_x + i * month_width
    ax.plot([x, x], [body_top, table_bottom], color='#D5C5C7', lw=.8, zorder=2)
    if i < 7:
        ax.plot([x + month_width/2] * 2, [body_top, table_bottom],
                color='#ECE4E5', lw=.5, linestyle='--', zorder=2)
ax.add_patch(Rectangle((x0, table_top), table_width, table_bottom-table_top,
                       facecolor='none', edgecolor='#CBB8BB', linewidth=.8))

ax.add_patch(Rectangle((.2, 12.48), .28, .18, facecolor=red))
ax.text(.6, 12.57, 'Planned activity', fontsize=10, color='#333333', va='center')
ax.text(15.65, 12.57, 'Dashed lines divide each month into two halves.',
        fontsize=9.5, color=muted, va='center', ha='right')
ax.text(.2, 13.12, 'Activity dates are proposed allocations within the confirmed June–December 2026 project period.',
        fontsize=9.5, color=muted, va='center')
ax.text(8, 13.72, 'Figure 4. Proposed Project Development Gantt Chart',
        fontsize=12, style='italic', ha='center', color='#292929')

fig.canvas.draw()
renderer = fig.canvas.get_renderer()
canvas = fig.bbox
for label in ax.texts:
    bb = label.get_window_extent(renderer)
    assert canvas.contains(bb.x0, bb.y0) and canvas.contains(bb.x1, bb.y1), label.get_text()

for extension in ['png', 'svg']:
    fig.savefig(OUT / f'bfp-gantt-june-december-2026.{extension}', facecolor='white')
plt.close(fig)

def period(value, end=False):
    month_index = (value - 1) // 2 if end else value // 2
    half = ('second half' if value % 2 == 0 else 'first half') if end else ('first half' if value % 2 == 0 else 'second half')
    return f'{MONTHS[month_index]} 2026, {half}'

with (OUT / 'bfp-gantt-schedule.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Activity', 'Proposed start', 'Proposed finish'])
    for name, start, end in TASKS:
        writer.writerow([name, period(start), period(end, end=True)])

print(f'Created PNG, editable SVG and CSV in {OUT}')
print(f'Validated {len(TASKS)} activity intervals and all text within image bounds.')

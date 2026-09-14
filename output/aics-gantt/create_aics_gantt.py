from pathlib import Path
import calendar
import csv
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch
import fitz

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tests'
STEM = 'aics-gantt-june-december-2026'
MONTHS = ['JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
# Month windows follow Chapter III. Within-month allocations are proposed.
GROUPS = [
    ('01', 'Planning', 'JUNE', '#98243A', [
        ('Define objectives, scope and limitations', 0, 1),
        ('Gather applicant and PSWDO requirements', 0, 3),
        ('Analyze AICS workflows and requirements', 1, 3),
        ('Plan resources, roles and product backlog', 2, 4),
    ]),
    ('02', 'Design', 'JULY', '#AA3045', [
        ('Design system architecture and process flows', 4, 6),
        ('Design database and centralized records', 4, 7),
        ('Create web interface layouts and wireframes', 5, 8),
        ('Review designs and prepare sprint backlog', 6, 8),
    ]),
    ('03', 'Development', 'AUGUST - SEPTEMBER', '#BB3A4B', [
        ('Build accounts, roles and database integration', 8, 10),
        ('Build application submission and file uploads', 8, 11),
        ('Develop pre-screening and AI verification', 9, 13),
        ('Develop duplicate checks and prioritization', 10, 13),
        ('Build personnel review and application tracking', 11, 14),
        ('Integrate SMS, email and applicant chatbot', 12, 15),
        ('Build distribution management and geo-mapping', 12, 15),
        ('Build dashboards, reports and audit trails', 13, 16),
        ('Review sprint outputs and refine integrations', 9, 16),
    ]),
    ('04', 'Testing and validation', 'OCTOBER', '#C34D5B', [
        ('Conduct alpha and system integration testing', 16, 18),
        ('Test verification, records and notifications', 16, 19),
        ('Conduct IT expert software-quality review', 17, 19),
        ('Run applicant and PSWDO acceptance testing', 18, 20),
        ('Resolve defects and retest affected functions', 17, 20),
    ]),
    ('05', 'Deployment and maintenance', 'NOVEMBER - DECEMBER', '#8B283F', [
        ('Prepare production setup and user orientation', 20, 22),
        ('Deploy system at PSWDO in Antique', 21, 23),
        ('Evaluate use and gather operational feedback', 22, 26),
        ('Monitor, maintain and apply improvements', 22, 28),
        ('Finalize documentation and project turnover', 26, 28),
    ]),
]

plt.rcParams.update({'font.family': 'DejaVu Sans', 'svg.fonttype': 'none', 'pdf.fonttype': 42})
chart_x, week_w = 6.2, .36
chart_end = chart_x + 28 * week_w
row_h, section_head, gap = .51, .63, .22
first_top = 3.05
height = first_top + sum(section_head + len(ts)*row_h + .12 for _,_,_,_,ts in GROUPS) + gap*4 + 1.50
fig, ax = plt.subplots(figsize=(17, height*.64), dpi=240)
fig.patch.set_facecolor('#FFFFFF')
fig.subplots_adjust(left=.018, right=.982, top=.985, bottom=.015)
ax.set_xlim(0, chart_end+.26)
ax.set_ylim(height, 0)
ax.axis('off')
ink, muted = '#342A2E', '#74666C'
ax.add_patch(Rectangle((.15,.13), .10, 1.47, color='#98243A', lw=0))
ax.text(.43,.29,'PSWDO  /  ANTIQUE',fontsize=10,weight='bold',color='#98243A',va='top')
ax.text(.40,.66,'Project Development Timeline',fontsize=25,weight='bold',color=ink,va='top')
ax.text(.43,1.29,'AICS Application Pre-Screening with Automated Document Verification and Distribution',fontsize=11.5,color=muted,va='top')
ax.text(.43,1.62,'Notification System for the Provincial Social Welfare and Development Office (PSWDO)',fontsize=11.5,color=muted,va='top')
ax.text(chart_end,.32,'JUN - DEC 2026',fontsize=12,weight='bold',color='#98243A',ha='right',va='top')

ax.add_patch(FancyBboxPatch((.15,2.19),chart_end-.15,.72,boxstyle='round,pad=0,rounding_size=.07',facecolor='#702238',edgecolor='none'))
ax.text(.46,2.55,'PHASE / ACTIVITY',fontsize=10.8,weight='bold',color='white',va='center')
for i, month in enumerate(MONTHS):
    ax.text(chart_x+(i*4+2)*week_w,2.40,month,fontsize=8.4,weight='bold',color='white',ha='center',va='center')
    for j in range(4):
        ax.text(chart_x+(i*4+j+.5)*week_w,2.72,f'W{j+1}',fontsize=7.2,color='#F4DBE2',ha='center',va='center')

y=first_top
labels=[]
for number, phase, period, color, tasks in GROUPS:
    panel_h=section_head+len(tasks)*row_h+.12
    ax.add_patch(Rectangle((.15,y),chart_end-.15,panel_h,facecolor='white',edgecolor='#E7DFE2',lw=.7))
    ax.add_patch(Rectangle((.15,y),chart_end-.15,section_head,facecolor='#F8F0F2',edgecolor='none'))
    ax.text(.43,y+.31,number,fontsize=10,weight='bold',color=color,va='center')
    ax.text(.91,y+.31,phase,fontsize=12.2,weight='bold',color=color,va='center')
    for division in range(29):
        x=chart_x+division*week_w
        ax.plot([x,x],[y,y+panel_h],color='#C9AAB4' if division%4==0 else '#ECE5E8',lw=.70 if division%4==0 else .40,zorder=1)
    first=min(t[1] for t in tasks)
    last=max(t[2] for t in tasks)
    ax.plot([chart_x+first*week_w+.06,chart_x+last*week_w-.06],[y+.31]*2,color=color,lw=3,solid_capstyle='butt')
    for k,(label,start,end) in enumerate(tasks):
        assert 0<=start<end<=28
        yy=y+section_head+k*row_h
        if k%2==1:
            ax.add_patch(Rectangle((.16,yy),chart_end-.16,row_h,facecolor='#FCFAFB',edgecolor='none',zorder=0))
        labels.append(ax.text(.46,yy+row_h/2,label,fontsize=10.1,color=ink,va='center'))
        ax.add_patch(FancyBboxPatch((chart_x+start*week_w+.03,yy+.12),(end-start)*week_w-.06,row_h-.24,boxstyle='round,pad=0,rounding_size=.055',facecolor=color,alpha=.82,edgecolor='none',zorder=3))
    y+=panel_h+gap

foot=y-gap
ax.text(.25,foot+.35,'PROPOSED ACTIVITY SCHEDULE',fontsize=9.2,color='#98243A',weight='bold',va='center')
ax.text(chart_end,foot+.35,'W1: 1-7   |   W2: 8-14   |   W3: 15-21   |   W4: 22-month end',fontsize=8.3,color=muted,ha='right',va='center')
ax.text(.25,foot+.72,'Phase months follow Chapter III. Weekly allocations are proposed; bars indicate scheduled work, not completion.',fontsize=9,color=muted,va='center')
ax.text(.25,foot+1.02,'Sprint reviews and refinements overlap during development. Documentation is updated throughout the project.',fontsize=9,color=muted,va='center')
ax.text(chart_end/2,foot+1.44,'Figure 5. AICS Gantt Chart',fontsize=11,color=ink,style='italic',ha='center',va='center')

fig.canvas.draw()
renderer=fig.canvas.get_renderer()
for t in ax.texts:
    b=t.get_window_extent(renderer)
    assert fig.bbox.contains(b.x0,b.y0) and fig.bbox.contains(b.x1,b.y1),t.get_text()
boundary=ax.transData.transform((chart_x-.12,0))[0]
for t in labels:
    assert t.get_window_extent(renderer).x1<boundary, f'Label overlaps grid: {t.get_text()}'
for ext in ['png','svg','pdf']:
    fig.savefig(OUT/f'{STEM}.{ext}',facecolor='white')
plt.close(fig)

def date_for(d,end=False):
    mi,w=divmod(d-1 if end else d,4)
    m=6+mi
    day=([7,14,21,calendar.monthrange(2026,m)[1]] if end else [1,8,15,22])[w]
    return f'2026-{m:02d}-{day:02d}'

with (OUT/f'{STEM}.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.writer(f)
    writer.writerow(['Phase','Activity','Proposed start','Proposed end'])
    for _,phase,_,_,tasks in GROUPS:
        for label,start,end in tasks:
            writer.writerow([phase,label,date_for(start),date_for(end,True)])

pdf=fitz.open(OUT/f'{STEM}.pdf')
assert len(pdf)==1
assert 'Figure 5. AICS Gantt Chart' in pdf[0].get_text()
qa=ROOT/'tmp/gantt-chapters/aics-pdf-preview.png'
pdf[0].get_pixmap(matrix=fitz.Matrix(1.2,1.2)).save(qa)
print(f'Created PNG, SVG, PDF and CSV in {OUT}')
print(f'Validated {sum(len(g[-1]) for g in GROUPS)} activities, all date intervals and label boundaries; PDF has one page.')

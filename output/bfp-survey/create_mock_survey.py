from pathlib import Path
import sys
import subprocess
from zipfile import ZipFile
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / 'tmp/bfp-survey'
OUT = ROOT / 'tests/bfp-mock-survey-table-and-pie.docx'
RUNTIME = Path('C:/Users/janna/.cache/codex-runtimes/codex-primary-runtime/dependencies')
DOCSKILL = Path('C:/Users/janna/.codex/plugins/cache/openai-primary-runtime/documents/26.727.11326/skills/documents')
sys.path.insert(0, str(DOCSKILL / 'scripts'))
from table_geometry import apply_table_geometry

QUESTIONS = [
    'Is a digital fire-reporting system needed?',
    'Would submitting a fire location through a map be helpful?',
    'Would uploading photographs help clarify fire reports?',
    'Is timely communication between residents and BFP needed?',
    'Would incident-status notifications be helpful?',
    'Would a map showing nearby fire stations be useful?',
    'Is a centralized record of reported fire incidents needed?',
    'Would coordination between municipal BFP offices be helpful?',
    'Is secure access to personal and incident information necessary?',
    'Would you be willing to use the proposed system?',
]
RES = [27,25,26,24,28,27,29,26,28,25]
BFP = [9,8,9,10,9,8,9,10,9,9]
assert sum(RES) == 265 and sum(BFP) == 90
yes = sum(RES) + sum(BFP)
total = 10 * (30 + 10)
no = total - yes
assert (yes, no, yes/total*100, no/total*100) == (355,45,88.75,11.25)

# Exact two-category pie using response counts, without 3D effects or area distortion.
pie_pdf = TMP / 'bfp-overall-mock-survey.pdf'
c = canvas.Canvas(str(pie_pdf), pagesize=(440,330))
c.setFillColor(HexColor('#004B91'))
c.setFont('Helvetica-Bold',16)
c.drawCentredString(220,305,'Grand Overall Survey Results')
c.setFont('Helvetica',10)
c.setFillColor(HexColor('#596874'))
c.drawCentredString(220,286,'MOCK DATA  |  Residents and BFP personnel')
x0,y0,x1,y1 = 115,49,345,279
split = 90 - (no/total*360)
c.setFillColor(HexColor('#19BFE5'))
c.wedge(x0,y0,x1,y1,startAng=90,extent=yes/total*360,stroke=0,fill=1)
c.setFillColor(HexColor('#0068B5'))
c.wedge(x0,y0,x1,y1,startAng=split,extent=no/total*360,stroke=0,fill=1)
c.setStrokeColor(HexColor('#8195A4'))
c.setLineWidth(.7)
c.lines([(176,69,143,44),(143,44,97,44),(272,260,299,270),(299,270,352,270)])
c.setFont('Helvetica-Bold',12)
c.setFillColor(HexColor('#004B91'))
c.drawRightString(95,44,'YES  88.75%')
c.drawString(354,270,'NO')
c.drawString(354,254,'11.25%')
c.setFont('Helvetica',9)
c.drawRightString(95,30,'355 responses')
c.drawString(354,239,'45 responses')
c.setFillColor(HexColor('#596874'))
c.setFont('Helvetica',9.5)
c.drawCentredString(220,10,'400 item responses across 40 assumed participants and 10 questions')
c.save()
poppler = RUNTIME / 'native/poppler/Library/bin/pdftoppm.exe'
subprocess.run([str(poppler), '-png', '-singlefile', '-scale-to', '2200', str(pie_pdf), str(TMP/'bfp-overall-mock-survey')],check=True,creationflags=0x08000000)

# Design: standard_business_brief with named academic-reference overrides:
# Times New Roman 11 pt, 1.3 in top margin for institutional masthead,
# compact 10 pt table text, blue/cyan accents from the supplied chart sample.
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
sec.top_margin,sec.bottom_margin = Inches(1.3),Inches(.85)
sec.left_margin = sec.right_margin = Inches(1)
sec.header_distance,sec.footer_distance = Inches(.35),Inches(.40)

def style(name,size,bold=False,color='202830',before=0,after=6,line=1.10):
    st = doc.styles[name] if name in doc.styles else doc.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
    st.font.name='Times New Roman'
    st.font.size=Pt(size)
    st.font.bold=bold
    st.font.color.rgb=RGBColor.from_string(color)
    st.paragraph_format.space_before=Pt(before)
    st.paragraph_format.space_after=Pt(after)
    st.paragraph_format.line_spacing=line
    return st

style('Normal',11)
style('Title',17,True,'004B91',after=6)
style('Subtitle',10.5,color='485966',after=8)
style('Heading 1',16,True,'004B91',before=16,after=8)
style('Heading 2',13,True,'004B91',before=12,after=6)
style('Heading 3',12,True,'004B91',before=8,after=4)
style('Caption',10.5,False,'202830',before=5,after=6)
style('Table text',10,after=0,line=1.0)
style('Table note',9.5,color='485966',before=4,after=4)
style('Institution',8.5,True,'202830',after=0,line=1.0)
style('Survey label',9,True,'0068B5',after=5)
style('Footer',8.5,color='596874',after=0,line=1.0)

header=sec.header.paragraphs[0]
header.alignment=WD_ALIGN_PARAGRAPH.CENTER
header.paragraph_format.space_after=Pt(2)
header.paragraph_format.line_spacing=1.0
header.add_run().add_picture(str(TMP/'image1.png'),width=Inches(.38))
for text in ['St. Anthony\u2019s College','INFORMATION TECHNOLOGY DEPARTMENT','San Jose, Antique']:
    p=sec.header.add_paragraph(text,'Institution')
    p.alignment=WD_ALIGN_PARAGRAPH.CENTER

fp=sec.footer.paragraphs[0]
fp.style=doc.styles['Footer']
fp.paragraph_format.tab_stops.add_tab_stop(Inches(6.5),WD_ALIGN_PARAGRAPH.RIGHT)
fp.add_run('BFP SURVEY | MOCK DATA')
fp.add_run('\t')
fp.add_run('Page ')
fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE');fp._p.append(fld)

def para(text,sty='Normal',align=None):
    p=doc.add_paragraph(text,sty)
    if align is not None:p.alignment=align
    return p

para('Resident and BFP Survey Results','Title')
para('GIS-Based Provincial Fire Response and Decision Support System with Smart Dispatch and Inter-Municipality Coordination for BFP in Antique','Subtitle')
para('ILLUSTRATIVE TABULATION | 30 RESIDENTS + 10 BFP PERSONNEL','Survey label')
para('This mock dataset demonstrates the presentation of a ten-item Yes/No survey for residents and BFP personnel. The questions and figures below are proposed examples; they do not represent collected survey findings.')
cap=para('Table 1. Mock Survey Responses of Residents and BFP Personnel','Caption')
cap.paragraph_format.keep_with_next=True

table=doc.add_table(rows=14,cols=5)
apply_table_geometry(table,[4680,1170,1170,1170,1170],cell_margins_dxa={'top':65,'bottom':65,'start':120,'end':120})
table.cell(0,0).merge(table.cell(1,0)).text='Proposed survey item'
table.cell(0,1).merge(table.cell(0,2)).text='Residents (n = 30)'
table.cell(0,3).merge(table.cell(0,4)).text='BFP personnel (n = 10)'
for j,v in enumerate(['Yes','No','Yes','No'],1): table.cell(1,j).text=v
for i,(q,r,b) in enumerate(zip(QUESTIONS,RES,BFP),2):
    for j,v in enumerate([f'Q{i-1}. {q}',str(r),str(30-r),str(b),str(10-b)]):table.cell(i,j).text=v
for idx,row in [(12,['Total responses','265','35','90','10']),(13,['Percentage of responses','88.33%','11.67%','90.00%','10.00%'])]:
    for j,v in enumerate(row):table.cell(idx,j).text=v

border=OxmlElement('w:tblBorders')
for edge in ['top','left','bottom','right','insideH','insideV']:
    b=OxmlElement(f'w:{edge}');b.set(qn('w:val'),'single');b.set(qn('w:sz'),'5');b.set(qn('w:color'),'C9D6DF');border.append(b)
table._tbl.tblPr.append(border)
for i,row in enumerate(table.rows):
    trpr=row._tr.get_or_add_trPr()
    no_split=OxmlElement('w:cantSplit');trpr.append(no_split)
    if i<2:trpr.append(OxmlElement('w:tblHeader'))
    seen=set()
    for j,cell in enumerate(row.cells):
        if cell._tc in seen:continue
        seen.add(cell._tc)
        cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        fill='005A9E' if i<2 else ('E3F3FB' if i>=12 else ('F5F9FC' if i%2 else 'FFFFFF'))
        shd=OxmlElement('w:shd');shd.set(qn('w:fill'),fill);cell._tc.get_or_add_tcPr().append(shd)
        for p in cell.paragraphs:
            p.style=doc.styles['Table text']
            p.alignment=WD_ALIGN_PARAGRAPH.LEFT if j==0 and i>=2 else WD_ALIGN_PARAGRAPH.CENTER
            for run in p.runs:
                run.bold=i<2 or i>=12
                run.font.color.rgb=RGBColor.from_string('FFFFFF' if i<2 else '202830')

para('Note. All values are simulated. Each item has 30 resident responses and 10 BFP responses. Group percentages use 300 resident answers and 100 BFP answers across ten questions.','Table note')
para('In this illustrative dataset, residents recorded 265 Yes responses (88.33%) and 35 No responses (11.67%). BFP personnel recorded 90 Yes responses (90.00%) and 10 No responses (10.00%). These figures demonstrate the calculation and presentation of response frequencies only.')

doc.add_page_break()
para('Overall Response Distribution','Title')
para('Combined resident and BFP responses','Subtitle')
para('The pie chart combines the response counts in Table 1. The 400 item responses comprise 355 Yes answers and 45 No answers. Each participant contributes one answer to each of the ten proposed questions.')
p=doc.add_paragraph()
p.alignment=WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before=Pt(12)
p.paragraph_format.space_after=Pt(4)
p.paragraph_format.keep_with_next=True
run=p.add_run()
run.add_picture(str(TMP/'bfp-overall-mock-survey.png'),width=Inches(6.4))
run._r.xpath('.//wp:docPr')[0].set('descr','Pie chart of simulated survey answers: 355 Yes responses (88.75%) and 45 No responses (11.25%), based on 400 item responses.')
p=para('Figure 1. Overall Distribution of Mock Survey Responses','Caption',WD_ALIGN_PARAGRAPH.CENTER)
p.runs[0].italic=True
para('Figure 1 shows that Yes answers account for 88.75% of the simulated responses, while No answers account for 11.25%. These percentages describe the distribution of answers across the ten survey items, rather than the percentage of individual participants who support the system.')
para('Calculation: Yes = 355 / 400 \u00d7 100 = 88.75%; No = 45 / 400 \u00d7 100 = 11.25%. The combined percentages are calculated from the response totals, not by averaging the two group percentages.','Table note')
para('MOCK DATA - FOR DOCUMENT LAYOUT AND DEMONSTRATION ONLY','Survey label')
para('Replace the proposed questions and simulated counts with the validated questionnaire and actual survey results before using this material as research evidence.','Table note')

doc.core_properties.title='Resident and BFP Mock Survey Results'
doc.core_properties.subject='Illustrative combined survey table and overall response pie chart'
doc.core_properties.keywords='BFP, residents, mock data, survey, pie chart'
doc.save(OUT)

check=Document(OUT)
assert len(check.tables)==1 and len(check.tables[0].rows)==14
assert len(check.inline_shapes)==1
assert check.tables[0].cell(12,1).text=='265'
assert check.tables[0].cell(13,4).text=='10.00%'
print(f'Created {OUT}')
print('Verified all 20 item totals, group totals, percentages and pooled pie values.')

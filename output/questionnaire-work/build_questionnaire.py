from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
from copy import deepcopy
from lxml import etree as ET
import json

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(__file__).resolve().parent
REFERENCE = WORK / 'reference.docx'
FINAL = ROOT / 'tests' / 'BFP Thesis Questionnaire - 45 Yes-No Questions.docx'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}

TITLE = ('GIS-Based Provincial Fire Response and Decision Support System with '
         'Smart Dispatch and Inter-Municipality Coordination for BFP in Antique')
GROUPS = [
    {
        'role': 'PROVINCIAL BFP PERSONNEL',
        'profile': 'Office: ______________________________    Position: ______________________',
        'sections': [
            ('A. Current Records and Monitoring Practices', [
                'Does your office receive fire-incident reports from municipal BFP offices?',
                'Does your office use paper records to monitor fire incidents?',
                'Does your office use spreadsheets to compile municipal fire reports?',
                'Can your office retrieve past fire-incident records when needed?',
                'Does your office keep records of assistance provided between municipalities?',
            ]),
            ('B. Challenges in Provincial Monitoring', [
                'Does your office receive delayed incident updates from municipal BFP offices?',
                'Is confirming the latest status of active fire incidents difficult?',
                'Is checking firetruck availability across municipalities difficult?',
                'Is tracking the status of inter-municipality assistance requests difficult?',
                'Is combining municipal fire reports into provincial summaries time-consuming?',
            ]),
            ('C. Proposed System Requirements', [
                'Would a shared incident database be useful for provincial monitoring?',
                'Would a digital map of active fires be useful for provincial monitoring?',
                'Would a dashboard of municipal response activities be useful to your office?',
                'Would searchable assistance-request histories be useful for reviewing coordination?',
                "Should access to provincial records depend on a user's assigned role?",
            ]),
        ],
    },
    {
        'role': 'MUNICIPAL BFP PERSONNEL',
        'profile': 'Municipality: _________________________    Position: ______________________',
        'sections': [
            ('A. Current Reporting and Response Practices', [
                'Does your station receive fire reports by telephone?',
                'Does your station record fire incidents in paper logbooks?',
                'Do personnel verify incident details before dispatching responders?',
                'Does your station record responder assignments for each fire incident?',
                'Does your station contact another municipality when additional assistance is needed?',
            ]),
            ('B. Challenges in Local Response and Coordination', [
                'Are incomplete location details a problem when locating reported fires?',
                'Is checking the availability of firetrucks before dispatch difficult?',
                'Is identifying accessible routes to reported fires difficult?',
                'Is obtaining updated responder locations during operations difficult?',
                'Does your station experience delays in receiving replies to assistance requests?',
            ]),
            ('C. Proposed System Requirements', [
                'Would online fire reports with location details be useful to your station?',
                'Would preliminary fire-severity recommendations help personnel assess reported fires?',
                'Would digital route guidance be useful for responding firefighters?',
                'Would a shared request-tracking system be useful when seeking municipal assistance?',
                'Should dispatch decisions remain with authorized Municipal BFP personnel?',
            ]),
        ],
    },
    {
        'role': 'RESIDENTS OF ANTIQUE',
        'profile': 'Municipality: _________________________    Barangay: ______________________',
        'sections': [
            ('A. Access and Fire-Reporting Experience', [
                'Do you know the contact number of your local BFP station?',
                'Do you have access to a smartphone that can connect to the internet?',
                'Is mobile internet available in your barangay?',
                'Do you know where your nearest fire station is located?',
                'Have you ever reported a fire to the BFP?',
            ]),
            ('B. Reporting Readiness and Connectivity', [
                'Can you describe your location using nearby landmarks?',
                'Can you share a location pin using your phone?',
                'Can you upload a photo using your phone?',
                'Do you experience mobile internet interruptions in your barangay?',
                'Do you know what information the BFP needs when someone reports a fire?',
            ]),
            ('C. Preferences for the Proposed System', [
                'Would you use an online form to report a fire if internet access is available?',
                'Are you willing to register a verified account for online fire reporting?',
                'Would notifications about the status of a reported fire be useful to you?',
                'Would you use fire-safety guidance provided through the application?',
                'Would a stored BFP contact number be useful when internet access is unavailable?',
            ]),
        ],
    },
]

def tag(name):
    return f'{{{W}}}{name}'

def el(name, **attrs):
    return ET.Element(tag(name), {tag(k): str(v) for k, v in attrs.items()})

def add(parent, name, **attrs):
    child = el(name, **attrs)
    parent.append(child)
    return child

def para(text='', style='BodyText', bold=False, size=None, before=0, after=0,
         align='left', keep=False, page=False, num=None):
    p = el('p')
    pp = add(p, 'pPr')
    add(pp, 'pStyle', val=style)
    if keep:
        add(pp, 'keepNext')
    add(pp, 'keepLines')
    if page:
        add(pp, 'pageBreakBefore')
    if num is not None:
        np = add(pp, 'numPr')
        add(np, 'ilvl', val=0)
        add(np, 'numId', val=num)
    add(pp, 'spacing', before=before, after=after, line=240, lineRule='auto')
    add(pp, 'jc', val=align)
    if num is not None:
        tabs = add(pp, 'tabs')
        add(tabs, 'tab', val='num', pos=440)
        add(pp, 'ind', left=440, hanging=440, right=0)
    if text:
        run = add(p, 'r')
        rp = add(run, 'rPr')
        if bold:
            add(rp, 'b')
        if size:
            add(rp, 'sz', val=size)
        t = add(run, 't')
        t.text = text
    return p

def labeled(label, text, **kwargs):
    p = para(**kwargs)
    for value, bold in [(label, True), (text, False)]:
        r = add(p, 'r')
        rp = add(r, 'rPr')
        if bold:
            add(rp, 'b')
        t = add(r, 't')
        t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        t.text = value
    return p

with ZipFile(REFERENCE) as zin:
    parts = {i.filename: zin.read(i.filename) for i in zin.infolist()}
    infos = zin.infolist()

doc = ET.fromstring(parts['word/document.xml'])
body = doc.find('w:body', NS)
sect = deepcopy(body.find('w:sectPr', NS))
original_table = body.find('w:tbl', NS)
source_tblpr = deepcopy(original_table.find('w:tblPr', NS))
source_grid = deepcopy(original_table.find('w:tblGrid', NS))
for child in list(body):
    body.remove(child)

# Preserve the reference letterhead, page setup, styles and all opaque parts.
# Only document body, numbering and metadata are editable in this package patch.
numbering = ET.fromstring(parts['word/numbering.xml'])
next_abstract = max(int(n.get(tag('abstractNumId'))) for n in numbering.findall('w:abstractNum', NS)) + 1
next_num = max(int(n.get(tag('numId'))) for n in numbering.findall('w:num', NS)) + 1
abstract = el('abstractNum', abstractNumId=next_abstract)
add(abstract, 'multiLevelType', val='singleLevel')
lvl = add(abstract, 'lvl', ilvl=0)
add(lvl, 'start', val=1)
add(lvl, 'numFmt', val='decimal')
add(lvl, 'lvlText', val='%1.')
add(lvl, 'lvlJc', val='left')
lp = add(lvl, 'pPr')
tabs = add(lp, 'tabs')
add(tabs, 'tab', val='num', pos=440)
add(lp, 'ind', left=440, hanging=440)
numbering.insert(len(numbering.findall('w:abstractNum', NS)), abstract)

# Preserve the table's full width; broaden the question column for readability.
widths = [7767, 792, 792]

def cell(text, width, bold=False, size=None, align='left', num=None, fill=None, keep=False):
    tc = el('tc')
    tcp = add(tc, 'tcPr')
    add(tcp, 'tcW', w=width, type='dxa')
    if fill:
        add(tcp, 'shd', val='clear', color='auto', fill=fill)
    add(tcp, 'vAlign', val='center')
    tc.append(para(text, style='TableParagraph', bold=bold, size=size,
                   align=align, num=num, keep=keep))
    return tc

for group_index, group in enumerate(GROUPS):
    numid = next_num + group_index
    num = add(numbering, 'num', numId=numid)
    add(num, 'abstractNumId', val=next_abstract)
    override = add(num, 'lvlOverride', ilvl=0)
    add(override, 'startOverride', val=1)

    body.append(labeled('Project Proposal: ', TITLE, before=0, after=90,
                        keep=True, page=group_index > 0))
    body.append(para('RESEARCH QUESTIONNAIRE | ' + group['role'], bold=True,
                     size=21, after=70, keep=True))
    body.append(labeled('Instructions: ',
                        'Check one box under Yes or No for each question. Answer based on '
                        'your experience or opinion. Participation is voluntary; responses '
                        'are for research purposes only.', size=None, after=90, keep=True))
    body.append(para('Name (optional): ______________________________    Date: ______________',
                     size=20, after=50, keep=True))
    body.append(para(group['profile'], size=20, after=100, keep=True))

    table = el('tbl')
    tp = deepcopy(source_tblpr)
    tp.find('w:tblW', NS).set(tag('w'), str(sum(widths)))
    tp.find('w:tblInd', NS).set(tag('w'), '70')
    margins = tp.find('w:tblCellMar', NS)
    for child in list(margins):
        margins.remove(child)
    for name, value in [('top', 38), ('left', 70), ('bottom', 38), ('right', 70)]:
        add(margins, name, w=value, type='dxa')
    table.append(tp)
    grid = el('tblGrid')
    for width in widths:
        add(grid, 'gridCol', w=width)
    table.append(grid)
    header = add(table, 'tr')
    hp = add(header, 'trPr')
    add(hp, 'cantSplit')
    add(hp, 'tblHeader')
    for text, width in zip(['QUESTIONS', 'YES', 'NO'], widths):
        header.append(cell(text, width, bold=True, align='center', fill='EFEFEF', keep=True))

    for heading, questions in group['sections']:
        row = add(table, 'tr')
        add(add(row, 'trPr'), 'cantSplit')
        tc = cell(heading, sum(widths), bold=True, size=20, fill='F5F5F5', keep=True)
        tcp = tc.find('w:tcPr', NS)
        tcp.insert(1, el('gridSpan', val=3))
        row.append(tc)
        for question in questions:
            row = add(table, 'tr')
            add(add(row, 'trPr'), 'cantSplit')
            row.append(cell(question, widths[0], num=numid))
            for width in widths[1:]:
                box = cell('\u2610', width, size=24, align='center')
                rp = box.find('w:p/w:r/w:rPr', NS)
                rp.insert(0, el('rFonts', ascii='Segoe UI Symbol', hAnsi='Segoe UI Symbol'))
                row.append(box)
    body.append(table)
    body.append(para('', size=2, after=0))
body.append(sect)

def serialize(root):
    return ET.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)

changed = {
    'word/document.xml': serialize(doc),
    'word/numbering.xml': serialize(numbering),
}
core = ET.fromstring(parts['docProps/core.xml'])
DC = 'http://purl.org/dc/elements/1.1/'
CP = 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'
for name, value in [(f'{{{DC}}}title', 'BFP Thesis Needs-Assessment Questionnaire'),
                    (f'{{{DC}}}subject', TITLE),
                    (f'{{{DC}}}creator', ''),
                    (f'{{{CP}}}lastModifiedBy', '')]:
    node = core.find(name)
    if node is None:
        node = ET.SubElement(core, name)
    node.text = value
changed['docProps/core.xml'] = serialize(core)

with ZipFile(FINAL, 'w', ZIP_DEFLATED) as zout:
    for info in infos:
        zout.writestr(info, changed.get(info.filename, parts[info.filename]))

inventory = []
with ZipFile(FINAL) as zout:
    for name, value in parts.items():
        final_value = zout.read(name)
        preserve = name not in changed
        if preserve:
            assert final_value == value, name
        inventory.append({'part': name, 'size': len(value), 'sha256': sha256(value).hexdigest(),
                          'policy': 'preserve' if preserve else 'editable'})

assert len(GROUPS) == 3
assert all(sum(len(qs) for _, qs in g['sections']) == 15 for g in GROUPS)
all_questions = [q for g in GROUPS for _, qs in g['sections'] for q in qs]
assert len(set(all_questions)) == 45
assert all(q.endswith('?') for q in all_questions)
assert all(q.startswith(('Does ', 'Do ', 'Can ', 'Is ', 'Are ', 'Have ', 'Would ', 'Should ')) for q in all_questions)
assert len(doc.xpath('//w:numPr', namespaces=NS)) == 45
assert len(doc.xpath('//w:t[text()="\u2610"]', namespaces=NS)) == 90
assert not any(s in ' '.join(doc.xpath('//w:t/text()', namespaces=NS)) for s in ['AICS', 'PSWDO', 'ALAB'])
assert sha256(REFERENCE.read_bytes()).hexdigest() == json.loads((WORK/'reference-evidence.json').read_text())['sha256']
(WORK / 'package-inventory.json').write_text(json.dumps(inventory, indent=2), encoding='utf-8')
(WORK / 'questionnaire-content.json').write_text(json.dumps({'title': TITLE, 'groups': GROUPS}, indent=2), encoding='utf-8')
print(json.dumps({'file': str(FINAL), 'questions': len(all_questions), 'answer_boxes': 90,
                  'preserved_parts': len(inventory) - len(changed), 'changed_parts': list(changed)}, indent=2))

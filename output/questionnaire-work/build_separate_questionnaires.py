from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
from hashlib import sha256
from lxml import etree as E
import json

WORK = Path(__file__).resolve().parent
ROOT = WORK.parents[1]
SOURCE = WORK / 'reference.docx'
DATA = json.loads((WORK / 'questionnaire-content.json').read_text(encoding='utf-8'))
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}
XMLSPACE = '{http://www.w3.org/XML/1998/namespace}space'

OPTIONAL = [
    [
        'How does your office receive and verify fire-incident updates from municipal BFP offices?',
        'What information does your office collect for provincial fire-incident records?',
        'How does your office monitor assistance provided between municipalities during fire incidents?',
        'What problems does your office encounter when preparing provincial fire-incident reports?',
        'What features would be most useful in the proposed system for provincial monitoring?',
    ],
    [
        'What is the current process for handling a fire report from receipt until the incident is resolved?',
        'What criteria do personnel use to assess the severity of a reported fire before dispatch?',
        'How does your station determine which responders and firetrucks are available for dispatch?',
        'How does your station request additional assistance from nearby municipalities?',
        'What features would be most useful in the proposed system for local fire response?',
    ],
    [],
]
FILENAMES = ['PROVINCIAL BFP QUESTIONNAIRE.docx', 'MUNICIPAL BFP QUESTIONNAIRE.docx',
             'RESIDENTS QUESTIONNAIRE.docx']
ROLES = ['Provincial BFP Personnel', 'Municipal BFP Personnel', 'Residents of Antique']

def q(name):
    return f'{{{W}}}{name}'

def node(name, **attrs):
    return E.Element(q(name), {q(k): str(v) for k, v in attrs.items()})

def add(parent, name, **attrs):
    child = node(name, **attrs)
    parent.append(child)
    return child

def run(p, text, bold=False, font=None):
    r = add(p, 'r')
    if bold or font:
        rp = add(r, 'rPr')
        if font:
            add(rp, 'rFonts', ascii=font, hAnsi=font)
        if bold:
            add(rp, 'b')
    t = add(r, 't')
    t.set(XMLSPACE, 'preserve')
    t.text = text
    return r

def paragraph(text='', before=0, after=0, line=240, align='left', bold=False,
              style='BodyText', num=None, keep=False, page=False):
    p = node('p')
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
    add(pp, 'spacing', before=before, after=after, line=line, lineRule='auto')
    add(pp, 'jc', val=align)
    if num is not None:
        tabs = add(pp, 'tabs')
        add(tabs, 'tab', val='num', pos=720)
        add(pp, 'ind', left=720, hanging=360, right=90)
    if text:
        run(p, text, bold=bold)
    return p

def labeled(label, text, **kwargs):
    p = paragraph(**kwargs)
    run(p, label, bold=True)
    run(p, text)
    return p

def name_line(is_resident=False):
    p = paragraph(before=100, after=120, keep=True)
    pp = p.find('w:pPr', NS)
    tabs = add(pp, 'tabs')
    add(tabs, 'tab', val='left', pos=5450)
    run(p, 'Name: ', bold=True)
    run(p, '____________________________')
    add(add(p, 'r'), 'tab')
    run(p, 'Municipality: ' if is_resident else 'Position: ', bold=True)
    run(p, '__________________')
    return p

def title_block(body, group_index, optional=False):
    body.append(labeled('Project Proposal: ', DATA['title'], line=276, after=65,
                        keep=True, page=optional))
    role = ROLES[group_index] + (' - Optional Questions' if optional else '')
    body.append(paragraph(role, bold=True, after=100, keep=True))
    if optional:
        body.append(labeled('Instructions: ',
            'You may answer any or all of the five optional questions based on your '
            'experience and opinion. There are no right or wrong answers. Your '
            'responses will be used for research purposes only.', line=276, keep=True))
    else:
        p = paragraph(line=276, keep=True)
        run(p, 'Instructions: ', bold=True)
        run(p, 'Please indicate your response to each question by checking [')
        run(p, '\u2714', font='Segoe UI Symbol')
        run(p, '] Yes or No in the provided space on the right.')
        body.append(p)
    body.append(name_line(is_resident=group_index == 2))

def xml(root):
    return E.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=True)

with ZipFile(SOURCE) as z:
    infos = z.infolist()
    parts = {i.filename: z.read(i.filename) for i in infos}

assert sha256(SOURCE.read_bytes()).hexdigest() == json.loads((WORK/'reference-evidence.json').read_text())['sha256']

# The user now requests exact reference typography and plain table styling.
# This replaces the earlier shaded categories, checkboxes and combined document.
with (WORK/'artifact.md').open('a', encoding='utf-8') as contract:
    contract.write('''

## Revised contract: three separate questionnaires
User steering supersedes the previous combined layout. Deliver three independent DOCX files, one per respondent group. Each contains exactly 15 Yes/No questions. Provincial and Municipal BFP each additionally contain exactly five optional written-response questions; residents have no optional questions. Keep Tahoma 11 pt throughout, reference Letter geometry, the original 7107/1169/1075 table widths, black 0.5 pt borders, white cells, blank Yes/No cells and original letterhead. Remove category rows and all shading. Keep the source numbering appearance: left 720, hanging 360 twips, right indent 90. Compact only question paragraph spacing to 3 pt before and zero after, retaining the font and original column geometry. Use the sample's title/instruction/name fields, with one respondent label. Optional questions start a new page, use Tahoma 11 pt, and each has three ruled writing lines at 18 pt spacing. Retain source package parts byte-for-byte except body, added numbering definitions and core metadata. Up to two pages is acceptable to the user; assess pagination in the final render without shrinking the font.
''')

manifest = []
for gi, group in enumerate(DATA['groups']):
    doc = E.fromstring(parts['word/document.xml'])
    body = doc.find('w:body', NS)
    sect = deepcopy(body.find('w:sectPr', NS))
    source_table = deepcopy(body.find('w:tbl', NS))
    for child in list(body):
        body.remove(child)
    numbering = E.fromstring(parts['word/numbering.xml'])
    next_abs = max(int(n.get(q('abstractNumId'))) for n in numbering.findall('w:abstractNum', NS)) + 1
    next_num = max(int(n.get(q('numId'))) for n in numbering.findall('w:num', NS)) + 1
    abstract = node('abstractNum', abstractNumId=next_abs)
    add(abstract, 'multiLevelType', val='singleLevel')
    lvl = add(abstract, 'lvl', ilvl=0)
    add(lvl, 'start', val=1)
    add(lvl, 'numFmt', val='decimal')
    add(lvl, 'lvlText', val='%1.')
    add(lvl, 'lvlJc', val='left')
    ppr = add(lvl, 'pPr')
    tabs = add(ppr, 'tabs')
    add(tabs, 'tab', val='num', pos=720)
    add(ppr, 'ind', left=720, hanging=360)
    numbering.insert(len(numbering.findall('w:abstractNum', NS)), abstract)
    for numid in [next_num, next_num + 1]:
        n = add(numbering, 'num', numId=numid)
        add(n, 'abstractNumId', val=next_abs)
        override = add(n, 'lvlOverride', ilvl=0)
        add(override, 'startOverride', val=1)

    title_block(body, gi)
    table = node('tbl')
    table.append(deepcopy(source_table.find('w:tblPr', NS)))
    table.append(deepcopy(source_table.find('w:tblGrid', NS)))
    widths = [7107, 1169, 1075]
    head = add(table, 'tr')
    hp = add(head, 'trPr')
    add(hp, 'cantSplit')
    add(hp, 'tblHeader')
    for text, width in zip(['QUESTIONS', 'YES', 'NO'], widths):
        cell = add(head, 'tc')
        cp = add(cell, 'tcPr')
        add(cp, 'tcW', w=width, type='dxa')
        add(cp, 'vAlign', val='center')
        cell.append(paragraph(text, style='TableParagraph', bold=True, align='center',
                              before=40, after=40, keep=True))
    questions = [question for _, qs in group['sections'] for question in qs]
    for question in questions:
        row = add(table, 'tr')
        add(add(row, 'trPr'), 'cantSplit')
        for col, width in enumerate(widths):
            cell = add(row, 'tc')
            cp = add(cell, 'tcPr')
            add(cp, 'tcW', w=width, type='dxa')
            add(cp, 'vAlign', val='center')
            cell.append(paragraph(question if col == 0 else '', style='TableParagraph',
                                  before=60, after=0, num=next_num if col == 0 else None,
                                  align='both' if col == 0 else 'center'))
    body.append(table)
    if OPTIONAL[gi]:
        title_block(body, gi, optional=True)
        for oi, question in enumerate(OPTIONAL[gi]):
            p = paragraph(question, num=next_num + 1, before=60 if oi == 0 else 150,
                          after=20, keep=True)
            # Written questions align with the sample's body text, not table inset.
            ind = p.find('w:pPr/w:ind', NS)
            ind.set(q('left'), '360')
            ind.set(q('hanging'), '360')
            ind.set(q('right'), '0')
            p.find('w:pPr/w:tabs/w:tab', NS).set(q('pos'), '360')
            body.append(p)
            lines = paragraph()
            pp = lines.find('w:pPr', NS)
            spacing = pp.find('w:spacing', NS)
            spacing.set(q('line'), '360')
            spacing.set(q('lineRule'), 'exact')
            ts = add(pp, 'tabs')
            add(ts, 'tab', val='right', leader='underscore', pos=9351)
            for li in range(3):
                r = add(lines, 'r')
                add(r, 'tab')
                if li < 2:
                    add(r, 'br')
            body.append(lines)
    else:
        body.append(paragraph())
    body.append(sect)

    changed = {'word/document.xml': xml(doc), 'word/numbering.xml': xml(numbering)}
    core = E.fromstring(parts['docProps/core.xml'])
    for uri, name, value in [
        ('http://purl.org/dc/elements/1.1/', 'title', ROLES[gi] + ' Questionnaire'),
        ('http://purl.org/dc/elements/1.1/', 'subject', DATA['title']),
        ('http://purl.org/dc/elements/1.1/', 'creator', ''),
        ('http://schemas.openxmlformats.org/package/2006/metadata/core-properties', 'lastModifiedBy', ''),
    ]:
        elem = core.find('{'+uri+'}'+name)
        if elem is None:
            elem = E.SubElement(core, '{'+uri+'}'+name)
        elem.text = value
    changed['docProps/core.xml'] = xml(core)
    dest = ROOT/'tests'/FILENAMES[gi]
    with ZipFile(dest, 'w', ZIP_DEFLATED) as z:
        for info in infos:
            z.writestr(info, changed.get(info.filename, parts[info.filename]))
    with ZipFile(dest) as z:
        for name, content in parts.items():
            if name not in changed:
                assert z.read(name) == content, name
    assert len(questions) == 15
    assert len(OPTIONAL[gi]) == (5 if gi < 2 else 0)
    assert len(doc.xpath('//w:tbl/w:tr', namespaces=NS)) == 16
    assert len(doc.xpath('//w:numPr', namespaces=NS)) == 15 + len(OPTIONAL[gi])
    assert len(doc.xpath('//w:tab[@w:leader="underscore"]', namespaces=NS)) == len(OPTIONAL[gi])
    assert not doc.xpath('//w:shd', namespaces=NS)
    assert not any(t in ''.join(doc.xpath('//w:t/text()', namespaces=NS)) for t in ['PSWDO', 'AICS', 'ALAB'])
    manifest.append({'file': str(dest), 'role': ROLES[gi], 'yes_no': 15,
                     'optional': len(OPTIONAL[gi]), 'sha256': sha256(dest.read_bytes()).hexdigest(),
                     'source_parts_preserved': len(parts)-len(changed)})

(WORK/'separate-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps(manifest, indent=2))

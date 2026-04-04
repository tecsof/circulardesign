"""Convert exported .xlsx spreadsheets to Keystatic-compatible JSON + markdoc files."""
import pandas as pd
import json
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_DIR = os.path.join(os.path.dirname(BASE))

def slugify(text):
    if not isinstance(text, str):
        return str(text)
    s = text.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s[:80]

def to_markdoc(text):
    if not isinstance(text, str) or not text.strip():
        return None
    return text.strip()

def parse_multi(val):
    if not isinstance(val, str) or not val.strip():
        return []
    return [v.strip() for v in val.split(',') if v.strip()]

def convert_strategies():
    xls = pd.ExcelFile(os.path.join(XLSX_DIR, 'CircularDesignTool_Strategies.xlsx'))
    sheets = ['Maintenance', 'Reuse', 'Refurbishment', 'Remanufacturing', 'Recycle']
    count = 0
    for sheet in sheets:
        df = pd.read_excel(xls, sheet_name=sheet)
        for _, row in df.iterrows():
            x3 = str(row.get('X3', '')).strip()
            if not x3:
                continue
            x2_val = str(row.get('X2', '')).strip()
            type_val = str(row.get('TYPE', 'use')).strip().lower()
            slug = slugify(f"{sheet}-{x2_val}-{x3}-{type_val}")
            out_dir = os.path.join(BASE, 'src', 'content', 'strategies', slug)
            os.makedirs(out_dir, exist_ok=True)

            data = {
                'x1': sheet,
                'x2': str(row.get('X2', '')).strip(),
                'x3': x3,
                'type': str(row.get('TYPE', 'use')).strip().lower(),
                'references': str(row.get('REFERENCES', '')) if pd.notna(row.get('REFERENCES')) else '',
                'caseStudyId': str(int(row['CASE_STUDY_ID'])) if pd.notna(row.get('CASE_STUDY_ID')) else '',
                'loop': parse_multi(row.get('LOOP', '')),
                'appliesTo': parse_multi(row.get('APPLIES_TO', '')),
                'productTags': str(row.get('PRODUCT-TAGS', '')) if pd.notna(row.get('PRODUCT-TAGS')) else '',
                'circularityIndex': int(row['CIRCULARITY_INDEX']) if pd.notna(row.get('CIRCULARITY_INDEX')) else None,
                'dfxRelationship': str(row.get('DFX_RELATIONSHIP', '')) if pd.notna(row.get('DFX_RELATIONSHIP')) else '',
                'authorId': str(int(row['AUTHOR_ID'])) if pd.notna(row.get('AUTHOR_ID')) else '',
            }

            with open(os.path.join(out_dir, 'index.json'), 'w') as f:
                json.dump(data, f, indent=2)

            for field, col in [('why', 'WHY'), ('how', 'HOW'), ('use', 'USE'),
                              ('characteristics', 'CHARACTERISTICS'),
                              ('questionsToAnswer', 'QUESTIONS TO ANSWER')]:
                content = to_markdoc(row.get(col, ''))
                with open(os.path.join(out_dir, f'{field}.mdoc'), 'w') as f:
                    f.write(content or '')
            count += 1
    print(f"Strategies: {count} converted")

def convert_case_studies():
    df = pd.read_excel(
        os.path.join(XLSX_DIR, 'CircularDesignTool_CaseStudies.xlsx'),
        sheet_name='Case studies'
    )
    count = 0
    for _, row in df.iterrows():
        title = str(row.get('TITLE', '')).strip()
        if not title:
            continue
        slug = slugify(title)
        out_dir = os.path.join(BASE, 'src', 'content', 'case-studies', slug)
        os.makedirs(out_dir, exist_ok=True)

        data = {
            'id': int(row['ID']) if pd.notna(row.get('ID')) else 0,
            'title': title,
            'heroImage': str(row.get('HERO IMAGE', '')) if pd.notna(row.get('HERO IMAGE')) else '',
            'videoLink': str(row.get('VIDEO LINK', '')) if pd.notna(row.get('VIDEO LINK')) else '',
            'links': str(row.get('LINKS', '')) if pd.notna(row.get('LINKS')) else '',
            'x3': str(row.get('X3', '')) if pd.notna(row.get('X3')) else '',
            'filterFocus': parse_multi(row.get('FILTER-FOCUS', '')),
            'filterCycle': parse_multi(row.get('FILTER-CYCLE', '')),
            'filterX1': parse_multi(row.get('FILTER-DESIGN-FOR-X1', '')),
            'filterBusinessModel': parse_multi(row.get('FILTER-BUSINESS-MODEL', '')),
            'filterMaterialFlow': parse_multi(row.get('FILTER-MATERIAL-FLOW', '')),
        }

        with open(os.path.join(out_dir, 'index.json'), 'w') as f:
            json.dump(data, f, indent=2)

        body = to_markdoc(row.get('CASE STUDY', ''))
        with open(os.path.join(out_dir, 'body.mdoc'), 'w') as f:
            f.write(body or '')
        count += 1
    print(f"Case studies: {count} converted")

def convert_contributors():
    df = pd.read_excel(
        os.path.join(XLSX_DIR, 'CircularDesignTool_Contributors.xlsx'),
        sheet_name='Contributors'
    )
    count = 0
    for _, row in df.iterrows():
        name = str(row.get('NAME', '')).strip()
        if not name:
            continue
        slug = slugify(name)
        out_dir = os.path.join(BASE, 'src', 'content', 'contributors', slug)
        os.makedirs(out_dir, exist_ok=True)

        data = {
            'id': int(row['ID']) if pd.notna(row.get('ID')) else 0,
            'name': name,
            'headshot': str(row.get('HEADSHOT', '')) if pd.notna(row.get('HEADSHOT')) else '',
            'link1': str(row.get('LINK1', '')) if pd.notna(row.get('LINK1')) else '',
            'link2': str(row.get('LINK2', '')) if pd.notna(row.get('LINK2')) else '',
        }

        with open(os.path.join(out_dir, 'index.json'), 'w') as f:
            json.dump(data, f, indent=2)

        bio = to_markdoc(row.get('BIO', ''))
        with open(os.path.join(out_dir, 'bio.mdoc'), 'w') as f:
            f.write(bio or '')
        count += 1
    print(f"Contributors: {count} converted")

if __name__ == '__main__':
    convert_strategies()
    convert_case_studies()
    convert_contributors()
    print("All data converted!")

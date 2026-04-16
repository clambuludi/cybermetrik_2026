import yaml
from deep_translator import GoogleTranslator
import time
import os

translator = GoogleTranslator(source='en', target='es')

def translate_text(text):
    if not text:
        return text
    try:
        # Check if already in Spanish roughly (some points already are)
        # But to be safe, we'll try to translate.
        # deep_translator has a 5000 char limit which is fine here.
        
        # We need to split if it's too long, but most details are < 2000 chars.
        if len(text) > 4000:
            return text
            
        result = translator.translate(text)
        time.sleep(0.1) # simple rate limit avoidance
        return result
    except Exception as e:
        print(f"Error translating: {text[:30]}... - {e}")
        return text

def process_section(section):
    print(f"Translating section: {section.get('title', '')}")
    if 'intro' in section and section['intro']:
        print(f"  Translating intro...")
        section['intro'] = translate_text(section['intro'])
    
    if 'checklist' in section:
        for idx, item in enumerate(section['checklist']):
            print(f"  Translating item {idx+1}/{len(section['checklist'])}: {item.get('point', '')}")
            if 'point' in item and item['point']:
                 item['point'] = translate_text(item['point'])
            if 'details' in item and item['details']:
                 item['details'] = translate_text(item['details'])
    return section

def main():
    file_path = 'personal-security-checklist.yml'
    backup_path = 'personal-security-checklist.yml.bak'
    
    import shutil
    shutil.copyfile(file_path, backup_path)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
        
    for section in data:
        process_section(section)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False, default_flow_style=False)
        
    print("Translation complete.")

if __name__ == '__main__':
    main()

import requests
import json
from datetime import datetime
import time
import os
from bs4 import BeautifulSoup
import sys # 시스템 모듈 추가

# =======================================================
# 🚨 설정 섹션: (API 키와 URL은 이미 입력되었다고 가정)
# =======================================================
SERVICE_KEY = "1aef5be7-d3b5-4060-9d3b-a908d47df9ed" 
API_URL = "https://api.kcisa.kr/openapi/API_CCA_145/request" 
OUTPUT_FILE = "./ai/data/exhibitions.json"
# =======================================================

# 함수 정의는 그대로 둡니다. (들여쓰기가 올바르다는 가정 하에)

def fetch_api_data(page_no=1, num_of_rows=100):
    """공공 데이터 포털 API를 호출하여 XML 응답을 가져옵니다."""
    params = {
        'serviceKey': SERVICE_KEY,
        'numOfRows': num_of_rows,
        'pageNo': page_no,
    }
    
    print(f"-> API 호출 중: 페이지 {page_no}, 요청 URL: {API_URL}")
    
    try:
        response = requests.get(API_URL, params=params, timeout=10)
        
        if response.status_code == 200:
            print("\n🚨🚨🚨 API 응답 상태: 200 OK.")
            print(response.text[:500] + "...") # 응답 내용 첫 500자 출력
            return response.text
        else:
            print(f"❌ API 호출 실패: HTTP 상태 코드 {response.status_code}")
            print(f"응답 내용: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ API 접근 실패: {e}")
        return None

def parse_api_data(xml_data):
    """XML 응답을 BeautifulSoup으로 파싱하여 RAG 형식에 맞게 데이터를 추출하고 필터링합니다."""
    # (이 함수 내용은 그대로 유지합니다.)
    soup = BeautifulSoup(xml_data, 'xml')
    data_list = []
    today = datetime.now().date() 

    items = soup.find_all('item') 
    if not items:
        items = soup.find_all('content')
        if not items:
            print("⚠️ 경고: XML에서 <item> 또는 <content> 태그를 찾지 못했습니다. 파싱 태그를 확인해주세요.")
            return []

    collected_at = datetime.now().strftime("%Y-%m-%d %H:%M")

    for item in items:
        temporal_tag = item.find('temporal') 
        is_current_or_future = True
        
        if temporal_tag and temporal_tag.text:
            temporal_value = temporal_tag.text.strip()
            date_parts = temporal_value.split('~') if '~' in temporal_value else temporal_value.split('/')
            end_date_str = date_parts[-1].strip() if len(date_parts) > 1 else temporal_value.strip()
            
            if len(end_date_str) >= 8: 
                try:
                    date_format = '%Y%m%d' if end_date_str.replace('-', '').isdigit() and len(end_date_str.replace('-', '')) == 8 else '%Y-%m-%d'
                    event_end_date = datetime.strptime(end_date_str.replace('-', ''), date_format.replace('-', '')).date()
                    
                    if event_end_date < today:
                        is_current_or_future = False
                        
                except Exception as e:
                    pass 

        if not is_current_or_future:
            continue
            
        title = item.find('title').text if item.find('title') else '제목 없음'
        spatial_coverage_tag = item.find('spatialCoverage')
        location = spatial_coverage_tag.text if spatial_coverage_tag else '장소 정보 없음'
        url = item.find('url').text if item.find('url') else '링크 없음'
        category_tag = item.find('subjectKeyword')
        category = category_tag.text.split(',')[0].strip() if category_tag and category_tag.text else '문화콘텐츠'
        period_str = temporal_tag.text if temporal_tag else '기간 정보 없음'
            
        content_data = {
            "title": title,
            "period": period_str,
            "location": location,
            "url": url,
            "source": "공공 데이터 API",
            "category": category,
            "collected_at": collected_at
        }
        data_list.append(content_data)
        
    return data_list

def crawl_and_save(max_pages=3):
    """API 호출을 실행하고 JSON 파일로 저장합니다."""
    all_contents = []
    
    if SERVICE_KEY == "YOUR_API_SERVICE_KEY":
        print("\n❌ 오류: SERVICE_KEY를 공공 데이터 포털에서 발급받아 입력해주세요!")
        return

    for page in range(1, max_pages + 1):
        xml_data = fetch_api_data(page_no=page)
        
        if xml_data:
            page_data = parse_api_data(xml_data)
            all_contents.extend(page_data)
            print(f"   -> {len(page_data)}개 항목 추가됨. 현재 총 {len(all_contents)}개.")
            
            time.sleep(0.5) 
        else:
            print("-> 데이터 없음 또는 오류로 API 호출 종료.")
            break

    try:
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(all_contents, f, ensure_ascii=False, indent=2)
        print(f"\n✅ API 수집 완료. 총 {len(all_contents)}개의 최신 콘텐츠 정보가 '{OUTPUT_FILE}'에 저장되었습니다.")
    except Exception as e:
        print(f"\n❌ 파일 저장 중 오류 발생: {e}")


if __name__ == "__main__":
    # 🚨🚨🚨 프로그램 시작 시 발생하는 예외를 잡기 위한 최상위 try-except 블록
    try:
        print("--- 스크립트 실행 시작 ---")
        crawl_and_save(max_pages=3)
    except Exception as e:
        print("❌❌❌ 스크립트 시작 단계에서 치명적 오류 발생 ❌❌❌")
        print(f"오류 유형: {type(e).__name__}")
        print(f"오류 내용: {e}")
        # 오류가 발생한 위치(Traceback)도 함께 출력하도록 합니다.
        import traceback
        traceback.print_exc(file=sys.stdout)
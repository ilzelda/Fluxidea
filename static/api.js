// api.js - API 및 데이터 관련 기능
import { showToast, showLoading } from './ui.js';

// API 기본 URL
const API_BASE_URL = '';
const SAVE_BASE_URL = '/api/pages';
const GET_BASE_URL = '/api/pages';
const DELETE_BASE_URL = '/api/pages';

// API 요청 함수
export async function apiRequest(endpoint, method = 'GET', data = null, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  // 요청 바디 추가 (있는 경우)
  if (data) {
    fetchOptions.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    
    // 응답 처리
    if (!response.ok) {
        throw new Error("네트워크 응답이 올바르지 않습니다")
    }
    
    // JSON 응답 파싱
    const result = await response.json();
    return result;

  } catch (error) {
    if (!options.suppressErrors) {
      console.error('API 요청 오류:', error);
      showNotification('API 요청 중 오류가 발생했습니다', 'error');
    }
    throw error;
  }
}

// 데이터 저장
export async function saveData(nodes, connections, page_id, options = {}) {  
  const data = {
    nodes: nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      text: node.text,
    })),
    connections: connections.map((conn) => ({
      start: conn.start.id,
      end: conn.end.id,
      description: conn.description,
    })),
  }

  if (page_id === "temp") {
    const tempPage = localStorage.getItem("mindlink_temp_page")
    const tempData = JSON.parse(tempPage)
    tempData[0].data = data
    localStorage.setItem("mindlink_temp_page", JSON.stringify(tempData))
    showLoading(false)
    showToast("그래프가 로컬에 저장되었습니다")
  } else{
    const result = apiRequest(`${SAVE_BASE_URL}/${page_id}`, "PUT", data, options);
  }
}

// 데이터 갖고오기
export async function getData(logged_in, page_id, options = {}) {
    if (!logged_in) {
        const tempPage = localStorage.getItem("mindlink_temp_page")
        data = JSON.parse(tempPage)[0].data
    } else {
        data = apiRequest(`${GET_BASE_URL}/${page_id}`, 'GET', null, options);
    }

    return data
}

// 데이터 삭제
export async function deleteData(page_id, options = {}) {
    if (confirm("정말로 이 페이지를 삭제하시겠습니까?")) {
        showLoading(true)
        result = apiRequest(`${DELETE_BASE_URL}/${page_id}`, 'DELETE', null, options);

        if (result.success_ok) {
            showToast("페이지가 삭제되었습니다", "success")
        } else {
            showToast("페이지 삭제에 실패했습니다", "error")
        }
    }
}

export async function createPage(loggend_in){
    if (!logged_in) {
        const tempPage = localStorage.getItem("mindlink_temp_page")
        if (tempPage !== null) {
          showToast("로그인이 필요합니다.", "warning")
          return
        }
      }


}
// const login_url = "/api/auth/google/login"

// document.getElementById("google-login-btn").addEventListener("click", (event) => {
//   if (document.getElementById("login-text").innerText === "로그아웃") {
//     return // 로그아웃 기능은 script.js에서 처리
//   }
//   window.location.href = "/api/auth/google/login" // 백엔드에서 OAuth 처리
// })

const login_url = "/api/auth/google/login"
currentUser = null

// auth.js - 인증 관련 기능
import { showNotification } from './ui.js';
import { apiRequest } from './api.js';

function getCookie() {
  const cookies = document.cookie.split("; ") // 쿠키 문자열을 `; ` 기준으로 분할
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=") // `=` 기준으로 키와 값 분리
    if (key === "access-token") return decodeURIComponent(value) // 원하는 쿠키 찾으면 반환
  }
  return null // 없으면 null 반환
}

export function deleteCookie() {
  document.cookie = "access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  window.location.reload()
}

// 인증 모듈 초기화
export function initAuth() {
  if (getCookie() === null) {
    showToast("로그인이 필요합니다.", "info")
    return false
  } else {
    return true
  }
}

// 로그인 함수
export async function login(username, password) {
  try {
    const response = await apiRequest(login_url, 'POST', { username, password });
    if (response.success) {
      currentUser = response.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
      showNotification('로그인 성공', 'success');
      return true;
    } else {
      showNotification(response.message || '로그인 실패', 'error');
      return false;
    }
  } catch (error) {
    showNotification('로그인 중 오류가 발생했습니다', 'error');
    console.error('Login error:', error);
    return false;
  }
}

// 로그아웃 함수
export function logout() {
  currentUser = null;
  localStorage.removeItem('user');
  showNotification('로그아웃 되었습니다', 'info');
  return true;
}
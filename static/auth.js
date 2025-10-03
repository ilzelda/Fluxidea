export const login_url = "/api/auth/google/login"

// auth.js - 인증 관련 기능
import { showToast } from './ui.js';

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
  const loginBtn = document.getElementById('google-login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginText = document.getElementById('login-text');

  if (getCookie() === null) {
    loginText.textContent = 'Google 로그인';
    loginBtn.style.display = 'flex';
    logoutBtn.style.display = 'none';
    showToast("로그인이 필요합니다.", "info")
    return false
  } else {
    loginText.textContent = '로그아웃';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'flex';
    return true
  }
}

// 로그인 함수
export function login() {
  window.location.href = login_url;
}

// 로그아웃 함수
export function logout() {
  deleteCookie();
  showToast('로그아웃 되었습니다', 'info');
}
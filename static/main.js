// main.js - 애플리케이션 진입점
import { initAuth, checkAuthStatus } from './auth.js';
import { setupUI, renderInitialUI } from './ui.js';
import { setupEventListeners } from './events.js';

let logged_in = false


// 애플리케이션 초기화 함수
function initApp() {
  logged_in = initAuth();
  setupUI(logged_in);
  setupEventListeners(logged_in);
  renderInitialUI(logged_in);
}

// DOM이 로드되면 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', initApp);
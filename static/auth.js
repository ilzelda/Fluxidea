const login_url = "/api/auth/google/login"

document.getElementById("google-login-btn").addEventListener("click", (event) => {
  if (document.getElementById("login-text").innerText === "로그아웃") {
    return // 로그아웃 기능은 script.js에서 처리
  }
  window.location.href = "/api/auth/google/login" // 백엔드에서 OAuth 처리
})


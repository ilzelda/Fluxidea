const login_url = "/api/auth/google/login";

document.getElementById("login-btn").addEventListener("click", function () {
    window.location.href = login_url; // OAuth 로그인 페이지로 이동
});
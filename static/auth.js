const login_url = "/api/auth/google/login";

document.getElementById("google-login-btn").addEventListener("click", function (event) {
    window.location.href = "/api/auth/google/login"; // 백엔드에서 OAuth 처리
});

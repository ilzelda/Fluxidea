export function handleCredentialResponse(response) {
    console.log("Google JWT Token:", response);

    // ✅ JWT를 로컬스토리지에 저장 (자동 로그인 가능)
    // localStorage.setItem("google_jwt", response.credential);

    // ✅ 서버로 JWT 전송 (사용자 검증)
    fetch("/api/users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        console.log("서버 응답:", data);
        localStorage.setItem("mindlink_token", data);
    })
    .catch(error => console.error("에러 발생:", error));
}

window.handleCredentialResponse = handleCredentialResponse;

// const login_url = "/api/users";
const login_url = "https://0590a1e7-61ab-402e-9e7d-60cfee9e3001.mock.pstmn.io/login";


export function handleCredentialResponse(response) {
    console.log("Google JWT Token:", response);

    // ✅ 서버로 JWT 전송 (사용자 검증)
    fetch(`${login_url}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials : "include",
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        console.log("서버 응답:", data);
        localStorage.setItem("mindlink_token", JSON.stringify(data));
    })
    .catch(error => console.error("에러 발생:", error));
}

window.handleCredentialResponse = handleCredentialResponse;

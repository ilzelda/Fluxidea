const login_url = "/api/auth/google/login";
// // const login_url = "https://0590a1e7-61ab-402e-9e7d-60cfee9e3001.mock.pstmn.io/login";


// export function handleCredentialResponse(response) {
//     console.log("Google JWT Token:", response);

//     // ✅ 서버로 JWT 전송 (사용자 검증)
//     fetch(`${login_url}`)
//     .then(res => res.json())
//     .then(data => {
//         console.log("서버 응답:", data);
//         localStorage.setItem("mindlink_token", JSON.stringify(data));
//     })
//     .catch(error => console.error("에러 발생:", error));
// }

// window.handleCredentialResponse = handleCredentialResponse;

document.getElementById("login-btn").addEventListener("click", function () {
    fetch(login_url)
    .then(response => {
        if (!response.ok) throw new Error("로그인 실패");
        return response.json();
    })
    .then(data => {
        console.log("로그인 성공:", data);
        alert("로그인 성공! 🎉");
    })
    .catch(error => {
        console.error("에러:", error);
        alert("로그인 실패! 😢");
    });
});
package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/go-logr/logr"
	"github.com/golang-jwt/jwt/v5"
	"mindlink.io/mindlink/pkg/models"
)

type handler struct {
	log logr.Logger
}

func NewHandler(log logr.Logger) *handler {
	return &handler{
		log: log,
	}
}

func (h *handler) RegsistRoute(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/auth/google/login", h.googleLoginHandler)
	mux.HandleFunc("GET /api/auth/google/callback", h.googleLoginCallbackHandler)
}

// TODO: state의미 알아보고, 적절한 값으로 수정
var (
	oauthConfig      *oauth2.Config
	oauthStateString = "random-state-string"
)

// TODO: 응답시 임시로 StatusFound 사용
func (h *handler) googleLoginHandler(w http.ResponseWriter, r *http.Request) {
	h.log.Info("google login")

	if err := checkEnv(); err != nil {
		h.log.Error(err, "env is not set")
		http.Error(w, "env REDIRECT_HOST is not set", http.StatusInternalServerError)
		return
	}

	oauthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  "http://" + path.Join(os.Getenv("REDIRECT_HOST"), "/api/auth/google/callback"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"},
		Endpoint:     google.Endpoint,
	}
	url := oauthConfig.AuthCodeURL(oauthStateString)
	http.Redirect(w, r, url, http.StatusFound)
}

// TODO: 리디렉션 응답시 임시로 StatusFound 사용,
// url 기본 값은 root, frontend에서 header로 리다이렉트 uri를 포함한다면, 해당 경로로 이동
func (uh *handler) googleLoginCallbackHandler(w http.ResponseWriter, r *http.Request) {
	uh.log.Info("google login callback")
	state := r.URL.Query().Get("state")
	if state != oauthStateString {
		http.Error(w, "Invalid state parameter", http.StatusBadRequest)
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "missing authorization code", http.StatusBadRequest)
		return
	}

	oauthTok, err := oauthConfig.Exchange(context.Background(), code)
	if err != nil {
		uh.log.Error(err, "failed to exchange token")
		http.Error(w, "failed to exchange token", http.StatusInternalServerError)
		return
	}
	uh.log.Info("test token", "OAUTH2 token", oauthTok)

	userInfo, err := getUserInfo(oauthTok)
	if err != nil {
		uh.log.Error(err, "failed to get user info")
		http.Error(w, "failed to get user info", http.StatusInternalServerError)
		return
	}

	accessToken, err := generateJWT(userInfo.Email)
	if err != nil {
		uh.log.Error(err, "failed to generate jwt")
		http.Error(w, "failed to generate jwt", http.StatusInternalServerError)
		return
	}

	cookie := new(http.Cookie)
	cookie.Name = "access-token"
	cookie.Value = accessToken
	cookie.HttpOnly = true
	cookie.Expires = oauthTok.Expiry
	cookie.Path = "/"
	http.SetCookie(w, cookie)

	http.Redirect(w, r, "/", http.StatusFound)
}

func checkEnv() error {
	if os.Getenv("GOOGLE_CLIENT_ID") == "" || os.Getenv("GOOGLE_CLIENT_SECRET") == "" ||
		os.Getenv("REDIRECT_HOST") == "" {
		return fmt.Errorf("required env is not set")
	}
	return nil
}

// TODO: 구글 사용자 프로필 관련 정보를 Claim으로 변환하는 로직으로 수정
// 또는, 사용자 프로필 관련 구조체 추가하여 mindlink 사용자 구조체와 구분
func getUserInfo(token *oauth2.Token) (*models.User, error) {
	client := oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var user models.User
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

// TODO: Claim 구조체에 필요한 사용자 정보 추가
func generateJWT(email string) (string, error) {
	claim := &models.Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claim)

	return token.SignedString(privKey)
}

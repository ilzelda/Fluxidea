package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"mindlink.io/mindlink/pkg/apis/internal/user/model"

	"github.com/go-logr/logr"
	"github.com/golang-jwt/jwt/v5"
)

var (
	privKey         *rsa.PrivateKey
	testKeyFilePath string = "config/test.pem"
)

type handler struct {
	log               logr.Logger
	uu                UserUsecase
	redirectURLScheme string
}

func NewHandler(log logr.Logger, uu UserUsecase) (*handler, error) {
	h := &handler{
		log: log,
		uu:  uu,
	}

	var err error
	switch os.Getenv("APP_ENV") {
	case "DEV", "dev", "development":
		privKey, err = loadTestPrivateKey()
		h.redirectURLScheme = "http://"
	case "PROD", "prod", "production":
		privKey, err = rsa.GenerateKey(rand.Reader, 2048)
		h.redirectURLScheme = "https://"
	default:
		return nil, errors.New("unknown environment")
	}
	if err != nil {
		return nil, err
	}

	return h, nil
}

func (ah *handler) RegistRoute(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/auth/google/login", ah.googleLoginHandler)
	mux.HandleFunc("GET /api/auth/google/callback", ah.googleLoginCallbackHandler)
}

// TODO: state의미 알아보고, 적절한 값으로 수정
var (
	oauthConfig      *oauth2.Config
	oauthStateString = "random-state-string"
)

// TODO: 응답시 임시로 StatusFound 사용
func (ah *handler) googleLoginHandler(w http.ResponseWriter, r *http.Request) {
	ah.log.Info("google login")

	if err := checkEnv(); err != nil {
		ah.log.Error(err, "no required env")
		http.Error(w, "no required env", http.StatusInternalServerError)
		return
	}

	oauthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  ah.redirectURLScheme + path.Join(r.Host, "/api/auth/google/callback"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
		},
		Endpoint: google.Endpoint,
	}
	url := oauthConfig.AuthCodeURL(oauthStateString)
	http.Redirect(w, r, url, http.StatusFound)
}

// TODO: 리디렉션 응답시 임시로 StatusFound 사용,
// url 기본 값은 root, frontend에서 header로 리다이렉트 uri를 포함한다면, 해당 경로로 이동
func (ah *handler) googleLoginCallbackHandler(w http.ResponseWriter, r *http.Request) {
	ah.log.Info("google login callback")
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
		ah.log.Error(err, "failed to exchange token")
		http.Error(w, "failed to exchange token", http.StatusInternalServerError)
		return
	}
	ah.log.Info("test token", "OAUTH2 token", oauthTok)

	userInfo, err := getUserInfo(oauthTok)
	if err != nil {
		ah.log.Error(err, "failed to get user info")
		http.Error(w, "failed to get user info", http.StatusInternalServerError)
		return
	}
	ah.log.Info("user info", "userinfo", userInfo)

	accessToken, err := generateJWT(userInfo)
	if err != nil {
		ah.log.Error(err, "failed to generate jwt")
		http.Error(w, "failed to generate jwt", http.StatusInternalServerError)
		return
	}

	ah.uu.SignUp(userInfo)

	cookie := new(http.Cookie)
	cookie.Name = "access-token"
	cookie.Value = accessToken
	cookie.HttpOnly = false
	cookie.Expires = oauthTok.Expiry
	cookie.Path = "/"
	http.SetCookie(w, cookie)

	http.Redirect(w, r, "/", http.StatusFound)
}

func HeaderHandler(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("access-token")
		if err != nil {
			switch {
			case errors.Is(err, http.ErrNoCookie):
				http.Error(w, "cookie not found", http.StatusBadRequest)
			default:
				http.Error(w, "server error", http.StatusInternalServerError)
			}
			return
		}

		claim := &Claims{}
		token, err := jwt.ParseWithClaims(cookie.Value, claim, func(t *jwt.Token) (any, error) {
			return privKey.Public(), nil
		})
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to parse token: %s", err.Error()), http.StatusBadRequest)
			return
		}

		if token.Valid {
			ctx := context.WithValue(r.Context(), ClaimsKey{}, claim)
			r = r.WithContext(ctx)
		} else {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

func checkEnv() error {
	if os.Getenv("GOOGLE_CLIENT_ID") == "" || os.Getenv("GOOGLE_CLIENT_SECRET") == "" {
		return fmt.Errorf("required env is not set")
	}
	return nil
}

// TODO: 구글 사용자 프로필 관련 정보를 Claim으로 변환하는 로직으로 수정
// 또는, 사용자 프로필 관련 구조체 추가하여 mindlink 사용자 구조체와 구분
func getUserInfo(token *oauth2.Token) (*model.User, error) {
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

	var user model.User
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

// TODO: Claim 구조체에 필요한 사용자 정보 추가
func generateJWT(user *model.User) (string, error) {
	claim := &Claims{
		ID:    user.ID,
		Email: user.Email,
		Name:  user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claim)

	return token.SignedString(privKey)
}

func loadTestPrivateKey() (*rsa.PrivateKey, error) {
	f, err := os.Open(testKeyFilePath)
	if err != nil {
		return nil, err
	}

	bs, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}

	block, _ := pem.Decode(bs)
	if block == nil {
		return nil, errors.New("failed to parse PEM block")
	}

	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}

	return key.(*rsa.PrivateKey), nil
}

package apis

import (
	"database/sql"
	"net/http"

	"mindlink.io/mindlink/pkg/apis/internal/auth"
	"mindlink.io/mindlink/pkg/apis/internal/page"
	prepo "mindlink.io/mindlink/pkg/apis/internal/page/repository"
	"mindlink.io/mindlink/pkg/apis/internal/user"
	urepo "mindlink.io/mindlink/pkg/apis/internal/user/repository"
	"mindlink.io/mindlink/pkg/log"
)

const (
	pageFSRoot = "data/page"
	userFSRoot = "data/user"
)

type Handler interface {
	RegistRoute(*http.ServeMux)
}

var (
	authAPI Handler
	pageAPI Handler
	userAPI Handler

	authLogger = log.Logger.WithName("AuthAPI")
	pageLogger = log.Logger.WithName("PageAPI")
	userLogger = log.Logger.WithName("UserAPI")
)

func setComponent(db *sql.DB) error {
	pageRepo := prepo.NewPostgreSQLRepository(db, pageLogger)
	userRepo := urepo.NewPostgreSQLRepository(db, userLogger)
	userUsecase := user.NewUsecase(userLogger, userRepo)

	var err error
	authAPI, err = auth.NewHandler(authLogger, userUsecase)
	if err != nil {
		return err
	}
	pageAPI = page.NewHandler(pageLogger, pageRepo, auth.HeaderHandler)
	userAPI = user.NewHandler(userLogger, userUsecase, auth.HeaderHandler)
	return nil
}

func SetupAPIs(db *sql.DB) (*http.ServeMux, error) {
	if err := setComponent(db); err != nil {
		return nil, err
	}
	mux := http.NewServeMux()

	authAPI.RegistRoute(mux)
	pageAPI.RegistRoute(mux)
	userAPI.RegistRoute(mux)

	return mux, nil
}

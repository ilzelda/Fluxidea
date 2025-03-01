package apis

import (
	"net/http"

	"mindlink.io/mindlink/pkg/apis/internal/auth"
	"mindlink.io/mindlink/pkg/apis/internal/page"
	"mindlink.io/mindlink/pkg/apis/internal/page/repository"
	"mindlink.io/mindlink/pkg/apis/internal/user"
	"mindlink.io/mindlink/pkg/log"
)

const (
	pageFSRoot = "data/page"
	userFSRoot = "data/user"
)

func SetupAPIs(envType string) (*http.ServeMux, error) {
	mux := http.NewServeMux()

	pageLogger := log.Logger.WithName("PageAPI")
	pageAPI := page.NewHandler(
		pageLogger,
		repository.NewFileRepo(pageFSRoot, pageLogger),
		auth.HeaderHandler,
	)
	pageAPI.RegistRoute(mux)

	userAPI := user.NewHandler(log.Logger.WithName("UserAPI"))
	userAPI.RegistRoute(mux)

	authAPI, err := auth.NewHandler(
		log.Logger.WithName("AuthAPI"),
		envType,
	)
	if err != nil {
		return nil, err
	}
	authAPI.RegistRoute(mux)

	return mux, nil
}

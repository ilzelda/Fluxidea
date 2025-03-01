package apis

import (
	"net/http"

	"mindlink.io/mindlink/pkg/apis/auth"
	"mindlink.io/mindlink/pkg/apis/page"
	"mindlink.io/mindlink/pkg/apis/user"
	"mindlink.io/mindlink/pkg/log"
	"mindlink.io/mindlink/pkg/repository"
)

const (
	pageFSRoot = "data/page"
	userFSRoot = "data/user"
)

type Handler interface {
	RegistRoute(*http.ServeMux)
}

func SetupAPI(envType string) (*http.ServeMux, error) {
	mux := http.NewServeMux()

	pageLogger := log.Logger.WithName("PageAPI")
	pageAPI := page.NewHandler(
		pageLogger,
		repository.NewPageFSRepo(pageFSRoot, pageLogger),
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

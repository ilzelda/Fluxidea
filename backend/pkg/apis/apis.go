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
	RegsistRoute(*http.ServeMux)
}

var PageAPI Handler = func() Handler {
	pageLogger := log.Logger.WithName("PageAPI")

	return page.NewHandler(
		pageLogger,
		repository.NewPageFSRepo(pageFSRoot, pageLogger),
	)
}()

var UserAPI Handler = func() Handler {
	userLogger := log.Logger.WithName("UserAPI")

	return user.NewHandler(userLogger)
}()

var AuthAPI Handler = func() Handler {
	authLogger := log.Logger.WithName("AuthAPI")

	return auth.NewHandler(
		authLogger,
	)
}()

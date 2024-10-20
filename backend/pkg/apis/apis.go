package apis

import (
	"net/http"

	"mindlink.io/mindlink/pkg/apis/page"
	"mindlink.io/mindlink/pkg/log"
)

type Handler interface {
	RegsistRoute(*http.ServeMux)
}

var PageAPI Handler = page.NewHandler(log.Logger.WithName("PageAPI"))

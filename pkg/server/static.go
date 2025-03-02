package server

import (
	"net/http"
	"os"
	"path"

	"github.com/go-logr/logr"
)

type staticHandler struct {
	logger   logr.Logger
	rootPath string
}

func (h *staticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	filePath := path.Join(h.rootPath, r.URL.Path)
	h.logger.Info("Requested file", "path", filePath)

	fileInfo, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	if fileInfo.IsDir() {
		indexPath := path.Join(filePath, "index.html")
		_, err := os.Stat(indexPath)
		if os.IsNotExist(err) {
			http.Error(w, "Directory listing not allowed", http.StatusForbidden)
			return
		}
		filePath = indexPath
	}

	http.ServeFile(w, r, filePath)
}

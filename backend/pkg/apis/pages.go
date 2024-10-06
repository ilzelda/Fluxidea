package apis

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-logr/logr"
	"github.com/google/uuid"

	"demo/pkg/log"
	"demo/pkg/models"
)

const dataDir string = "data"

var PageAPI = &pageHandler{
	log: log.Logger.WithName("PageAPI"),
}

type pageHandler struct {
	log logr.Logger
}

func (ph *pageHandler) RegsistRoute(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/users/{user_id}/pages", ph.createUserPage)
	mux.HandleFunc("GET /api/users/{user_id}/pages/{page_id}", ph.loadUserPage)
	mux.HandleFunc("PUT /api/users/{user_id}/pages/{page_id}", ph.saveUserPage)
}

func (ph *pageHandler) createUserPage(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")

	page := &models.Page{
		ID: uuid.New(),
	}
	if err := json.NewDecoder(r.Body).Decode(page); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	// 데이터를 저장할 디렉토리 있으면 사용 없으면 생성하여 사용
	dirPath := filepath.Join(dataDir, userID)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		http.Error(w, "failed to create data directory", http.StatusInternalServerError)
		return
	}

	// 파일 생성 및 데이터 저장
	fileName := filepath.Join(dirPath, page.ID.String()+".json")
	file, err := os.Create(fileName)
	if err != nil {
		http.Error(w, "failed to create file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	if err := json.NewEncoder(file).Encode(page); err != nil {
		http.Error(w, "failed to save data", http.StatusInternalServerError)
		return
	}

	response := struct {
		ID   uuid.UUID `json:"id"`
		Name string    `json:"name"`
	}{
		ID:   page.ID,
		Name: page.Name,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (ph *pageHandler) loadUserPage(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")
	pageID := r.PathValue("page_id")

	// 파일 경로 생성
	filePath := filepath.Join(dataDir, userID, pageID+".json")

	// 파일 열기
	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "file is not exist", http.StatusNotFound)
		} else {
			http.Error(w, "failed to read file", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(fileContent)
}

func (ph *pageHandler) saveUserPage(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")
	pageID := r.PathValue("page_id")

	pageFilePath := filepath.Join(dataDir, userID, pageID+".json")
	f, err := os.Open(pageFilePath)
	if err != nil {
		http.Error(w, "failed to open file", http.StatusBadRequest)
		return
	}
	defer f.Close()

	var page models.Page
	if err := json.NewDecoder(f).Decode(&page); err != nil {
		http.Error(w, "failed to decode old file data", http.StatusInternalServerError)
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&page); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	f, err = os.OpenFile(pageFilePath, os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		http.Error(w, "failed to open file", http.StatusBadRequest)
		return
	}
	defer f.Close()
	if err := json.NewEncoder(f).Encode(&page); err != nil {
		http.Error(w, "failed to encode new file data", http.StatusInternalServerError)
		return
	}

	response := struct {
		SaveSuccess bool `json:"save_success"`
	}{
		SaveSuccess: true,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

package apis

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"demo/pkg/models"
)

const dataDir string = "data"

func SaveUserPage(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")
	pageID := r.PathValue("page_id")

	var page models.Page
	if err := json.NewDecoder(r.Body).Decode(&page); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	// 데이터를 저장할 디렉토리 있으면 사용 없으면 생성하여 사용
	dirPath := filepath.Join(dataDir, userID)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		http.Error(w, "Failed to create data directory", http.StatusInternalServerError)
		return
	}

	// 파일 생성 및 데이터 저장
	fileName := filepath.Join(dirPath, pageID+".json")
	file, err := os.Create(fileName)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	if err := json.NewEncoder(file).Encode(page); err != nil {
		http.Error(w, "Failed to save data", http.StatusInternalServerError)
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

func LoadUserPage(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")
	pageID := r.PathValue("page_id")

	// 파일 경로 생성
	filePath := filepath.Join(dataDir, userID, pageID+".json")

	// 파일 열기
	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "페이지를 찾을 수 없습니다", http.StatusNotFound)
		} else {
			http.Error(w, "파일을 읽을 수 없습니다", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(fileContent)
}

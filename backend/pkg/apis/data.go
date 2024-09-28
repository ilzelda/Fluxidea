package apis

import (
	"demo/pkg/models"
	"encoding/json"
	"net/http"
	"os"
)

// ServeHTTP implements http.Handler.
func SaveUserData(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("user_id")

	var data models.Data
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	// 데이터를 저장할 디렉토리 있으면 사용 없으면 생성하여 사용
	dataDir := "data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		http.Error(w, "Failed to create data directory", http.StatusInternalServerError)
		return
	}

	// 파일 생성 및 데이터 저장
	fileName := dataDir + "/" + userID + ".json"
	file, err := os.Create(fileName)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	if err := json.NewEncoder(file).Encode(data); err != nil {
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

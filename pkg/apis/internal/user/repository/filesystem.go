package repository

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"

	"github.com/go-logr/logr"

	"mindlink.io/mindlink/pkg/apis/internal/user/model"
)

type FileRepository struct {
	rootDir string
	logger  logr.Logger
}

func NewFileRepo(root string, logger logr.Logger) *FileRepository {
	return &FileRepository{
		rootDir: root,
		logger:  logger,
	}
}

func (repo *FileRepository) Create(new *model.User) error {
	// 데이터를 저장할 디렉토리 있으면 사용 없으면 생성하여 사용
	dirPath := filepath.Join(repo.rootDir)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return errors.New("failed to create data directory")
	}

	fileName := filepath.Join(repo.rootDir, new.ID+".json")
	file, err := os.Create(fileName)
	if err != nil {
		return errors.New("failed to create file")
	}
	defer file.Close()

	if err := json.NewEncoder(file).Encode(new); err != nil {
		return errors.New("failed to save data")
	}

	return nil
}

var (
	ErrUserNotFound       error = errors.New("user not found")
	ErrFailedToFindUser   error = errors.New("failed to find user")
	ErrFailedToDecodeUser error = errors.New("failed to decode user")
)

func (repo *FileRepository) GetUser(userID model.UserID) (*model.User, error) {
	filePath := filepath.Join(repo.rootDir, userID+".json")
	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrUserNotFound
		}
		return nil, ErrFailedToFindUser
	}

	var user model.User
	if err := json.Unmarshal(fileContent, &user); err != nil {
		return nil, ErrFailedToDecodeUser
	}

	return &user, nil
}

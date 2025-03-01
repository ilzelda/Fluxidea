package page

import (
	"github.com/google/uuid"

	"mindlink.io/mindlink/pkg/apis/internal/page/model"
)

type PageRepository interface {
	CreatePage(string, model.CreatePageParams) (*model.Page, error)
	ListUserPages(string) ([]*model.Page, error)
	GetPage(string, uuid.UUID) (*model.Page, error)
	UpdatePage(string, uuid.UUID, model.UpdatePageParams) (*model.Page, error)
	DeletePage(string, uuid.UUID) (*model.Page, error)
}

package page

import (
	"github.com/google/uuid"

	"mindlink.io/mindlink/pkg/apis/internal/page/model"
	umodel "mindlink.io/mindlink/pkg/apis/internal/user/model"
)

type PageRepository interface {
	CreatePage(umodel.UserID, model.CreatePageParams) (*model.Page, error)
	ListPages(umodel.UserID) ([]*model.Page, error)
	GetPage(umodel.UserID, uuid.UUID) (*model.Page, error)
	UpdatePage(umodel.UserID, uuid.UUID, model.UpdatePageParams) (*model.Page, error)
	DeletePage(umodel.UserID, uuid.UUID) (*model.Page, error)
}

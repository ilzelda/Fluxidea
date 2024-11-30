package page

import (
	"github.com/google/uuid"

	"mindlink.io/mindlink/pkg/models"
)

type PageRepository interface {
	CreatePage(models.UserID, models.CreatePageParams) (*models.Page, error)
	ListUserPages(models.UserID) ([]*models.Page, error)
	GetPage(models.UserID, uuid.UUID) (*models.Page, error)
	UpdatePage(models.UserID, uuid.UUID, models.UpdatePageParams) (*models.Page, error)
	DeletePage(models.UserID, uuid.UUID) (*models.Page, error)
}

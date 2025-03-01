package user

import "mindlink.io/mindlink/pkg/apis/internal/user/model"

type UserRepository interface {
	Create(*model.User) error
	GetUser(model.UserID) (*model.User, error)
}

package auth

import "mindlink.io/mindlink/pkg/apis/internal/user/model"

type UserUsecase interface {
	SearchByID(model.UserID) (*model.User, error)
	SignUp(*model.User) error
}

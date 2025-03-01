package user

import (
	"errors"

	"github.com/go-logr/logr"
	"mindlink.io/mindlink/pkg/apis/internal/user/model"
	"mindlink.io/mindlink/pkg/apis/internal/user/repository"
)

var (
	ErrNoUser       = errors.New("no user")
	ErrAlreadyExist = errors.New("user already exist")
)

type Usecase struct {
	logger logr.Logger
	repo   UserRepository
}

func NewUsecase(logger logr.Logger, repo UserRepository) *Usecase {
	return &Usecase{
		logger: logger,
		repo:   repo,
	}
}

func (u *Usecase) SearchByID(id model.UserID) (*model.User, error) {
	user, err := u.repo.GetUser(id)
	if errors.Is(err, repository.ErrUserNotFound) {
		return nil, ErrNoUser
	}

	return user, err
}

func (u *Usecase) SignUp(new *model.User) error {
	if user, _ := u.SearchByID(new.ID); user == nil {
		return u.repo.Create(new)
	}

	return ErrAlreadyExist
}

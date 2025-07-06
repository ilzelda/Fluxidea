package repository

import (
	"database/sql"

	"github.com/go-logr/logr"
	"mindlink.io/mindlink/pkg/apis/internal/user/model"
)

type postgreSQLRepository struct {
	db     *sql.DB
	logger logr.Logger
}

func NewPostgreSQLRepository(db *sql.DB, logger logr.Logger) *postgreSQLRepository {
	return &postgreSQLRepository{
		db:     db,
		logger: logger,
	}
}

func (repo *postgreSQLRepository) Create(user *model.User) error {
	query := `INSERT INTO "user" (id, email, name, given_name, family_name, picture_url) VALUES ($1, $2, $3, $4, $5, $6)`
	if _, err := repo.db.Exec(query, user.ID, user.Email, user.Name, user.GivenName, user.FamilyName, user.PictureURL); err != nil {
		repo.logger.Error(err, "failed to create user", "userID", user.ID)
		return err
	}

	return nil
}

func (repo *postgreSQLRepository) GetUser(id model.UserID) (*model.User, error) {
	query := `SELECT * FROM "user" WHERE id = $1`

	user := &model.User{}
	if err := repo.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.GivenName,
		&user.FamilyName,
		&user.PictureURL,
	); err != nil {
		repo.logger.Error(err, "failed to get user", "userID", id)
		return nil, err
	}

	return user, nil
}

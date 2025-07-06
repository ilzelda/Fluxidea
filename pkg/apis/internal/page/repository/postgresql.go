package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	"github.com/lib/pq/hstore"
	"mindlink.io/mindlink/pkg/apis/internal/page/model"
	umodel "mindlink.io/mindlink/pkg/apis/internal/user/model"
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

func (repo *postgreSQLRepository) CreatePage(userID umodel.UserID, params model.CreatePageParams) (*model.Page, error) {
	page := &model.Page{
		ID:            uuid.New(),
		Name:          params.Name,
		NodeNum:       0,
		ConnectionNum: 0,
	}

	data := hstore.Hstore{
		Map: map[string]sql.NullString{
			"id":            {String: page.ID.String(), Valid: true},
			"userID":        {String: userID, Valid: true},
			"name":          {String: page.Name, Valid: true},
			"nodes":         {String: "[]", Valid: true},
			"connections":   {String: "[]", Valid: true},
			"nodesNum":      {String: "0", Valid: true},
			"connectionNum": {String: "0", Valid: true},
		},
	}

	query := `INSERT INTO page (id, data) VALUES ($1, $2)`
	if _, err := repo.db.Exec(query, page.ID, data); err != nil {
		repo.logger.Error(err, "failed to create page", "userID", userID, "pageID", page.ID)
		return nil, err
	}

	return page, nil
}

// TODO: Must*함수 사용하여 panic 처리 필요
func (repo *postgreSQLRepository) ListPages(userID umodel.UserID) ([]*model.Page, error) {
	query := `SELECT * FROM page WHERE data->'userID' = $1`

	rows, err := repo.db.Query(query, userID)
	if err != nil {
		repo.logger.Error(err, "failed to list pages", "userID", userID)
		return nil, err
	}
	defer rows.Close()

	pages := make([]*model.Page, 0, 64)
	for rows.Next() {
		var id string
		var data hstore.Hstore

		if err := rows.Scan(&id, &data); err != nil {
			repo.logger.V(9).Error(err, "invalid row data")
			return nil, err
		}

		var nodes []model.Node
		if err := json.Unmarshal([]byte(data.Map["nodes"].String), &nodes); err != nil {
			repo.logger.V(9).Error(err, "invalid nodes", "nodes", data.Map["nodes"].String)
			return nil, err
		}

		var connections []model.Connection
		if err := json.Unmarshal([]byte(data.Map["connections"].String), &connections); err != nil {
			repo.logger.V(9).Error(err, "invalid connections", "connections", data.Map["connections"].String)
			return nil, err
		}

		page := &model.Page{
			ID:            uuid.MustParse(id),
			Name:          data.Map["name"].String,
			Nodes:         nodes,
			Connections:   connections,
			NodeNum:       len(nodes),
			ConnectionNum: len(connections),
		}

		pages = append(pages, page)
	}

	return pages, rows.Err()
}

// TODO: Must*함수 사용하여 panic 처리 필요
func (repo *postgreSQLRepository) GetPage(userID umodel.UserID, pageID uuid.UUID) (*model.Page, error) {
	query := `SELECT * FROM page WHERE data->'userID' = $1 AND id = $2`

	var (
		id   string
		data hstore.Hstore
	)

	if err := repo.db.QueryRow(query, userID, pageID).Scan(&id, &data); err != nil {
		repo.logger.V(9).Error(err, "invalid row data")
		return nil, err
	}

	var nodes []model.Node
	if err := json.Unmarshal([]byte(data.Map["nodes"].String), &nodes); err != nil {
		repo.logger.V(9).Error(err, "invalid nodes", "nodes", data.Map["nodes"].String)
		return nil, err
	}

	var connections []model.Connection
	if err := json.Unmarshal([]byte(data.Map["connections"].String), &connections); err != nil {
		repo.logger.V(9).Error(err, "invalid connections", "connections", data.Map["connections"].String)
		return nil, err
	}

	page := &model.Page{
		ID:            uuid.MustParse(id),
		Name:          data.Map["name"].String,
		Nodes:         nodes,
		Connections:   connections,
		NodeNum:       len(nodes),
		ConnectionNum: len(connections),
	}

	return page, nil
}

// TODO: string convert시 panic 처리 필요
func (repo *postgreSQLRepository) UpdatePage(userID umodel.UserID, pageID uuid.UUID, params model.UpdatePageParams) (*model.Page, error) {
	page, err := repo.GetPage(userID, pageID)
	if err != nil {
		repo.logger.Error(err, "page not found", "userID", userID, "pageID", pageID)
		return nil, errors.New("page not found")
	}

	if params.Name != "" {
		page.Name = params.Name
	}

	if len(params.Nodes) != 0 {
		page.Nodes = params.Nodes
		page.NodeNum = len(params.Nodes)
	}

	if len(params.Connections) != 0 {
		page.Connections = params.Connections
		page.ConnectionNum = len(params.Connections)
	}

	nodes, err := json.Marshal(page.Nodes)
	if err != nil {
		repo.logger.V(9).Error(err, "invalid nodes data", "nodes", page.Nodes)
		return nil, err
	}

	connections, err := json.Marshal(page.Connections)
	if err != nil {
		repo.logger.V(9).Error(err, "invalid connections data", "connections", page.Connections)
		return nil, err
	}

	data := hstore.Hstore{
		Map: map[string]sql.NullString{
			"id":            {String: page.ID.String(), Valid: true},
			"userID":        {String: userID, Valid: true},
			"name":          {String: page.Name, Valid: true},
			"nodes":         {String: string(nodes), Valid: true},
			"connections":   {String: string(connections), Valid: true},
			"nodesNum":      {String: strconv.Itoa(len(page.Nodes)), Valid: true},
			"connectionNum": {String: strconv.Itoa(len(page.Connections)), Valid: true},
		},
	}

	query := `UPDATE page SET data = data || $1 WHERE id = $2`
	if _, err := repo.db.Exec(query, data, pageID); err != nil {
		repo.logger.Error(err, "failed to update page", "userID", userID, "pageID", pageID)
		return nil, err
	}

	return page, nil
}

func (repo *postgreSQLRepository) DeletePage(userID umodel.UserID, pageID uuid.UUID) (*model.Page, error) {
	page, err := repo.GetPage(userID, pageID)
	if err != nil {
		repo.logger.Error(err, "page not found", "userID", userID, "pageID", pageID)
		return nil, errors.New("page not found")
	}

	query := `DELETE FROM page WHERE data->'userID' = $1 AND id = $2`
	if _, err := repo.db.Exec(query, userID, pageID); err != nil {
		repo.logger.Error(err, "failed to delete page", "userID", userID, "pageID", pageID)
		return nil, err
	}

	return page, nil
}

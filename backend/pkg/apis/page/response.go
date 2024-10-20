package page

import "github.com/google/uuid"

type respUserPage struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type respListUserPages []respUserPage

type respSaveUserPage struct {
	SuccessOK bool `json:"success_ok"`
}

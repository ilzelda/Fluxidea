package model

type User struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	GivenName  string `json:"given_name"`
	FamilyName string `json:"family_name"`
	PictureURL string `json:"picture"`
}

type UserID string

func (uid UserID) String() string {
	return string(uid)
}

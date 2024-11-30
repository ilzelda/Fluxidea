package models

type UserID string

func (uid UserID) String() string {
	return string(uid)
}

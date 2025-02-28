package models

import "github.com/golang-jwt/jwt/v5"

type Claims struct {
	jwt.RegisteredClaims
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

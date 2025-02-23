package auth

import (
	"crypto/rand"
	"crypto/rsa"
)

var (
	privKey *rsa.PrivateKey
)

func init() {
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic(err)
	}
	privKey = priv
}

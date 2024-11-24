package models

import "github.com/google/uuid"

type Page struct {
	ID            uuid.UUID    `json:"id"`
	Name          string       `json:"name"`
	Nodes         []Node       `json:"nodes,omitempty"`
	Connections   []Connection `json:"connections,omitempty"`
	NodeNum       int          `json:"nodeNum"`
	ConnectionNum int          `json:"connectionNum"`
}

type Node struct {
	ID   int     `json:"id"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Text string  `json:"text,omitempty"`
}

type Connection struct {
	Start       int    `json:"start"`
	End         int    `json:"end"`
	Description string `json:"description"`
}

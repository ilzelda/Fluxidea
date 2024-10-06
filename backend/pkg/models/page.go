package models

type Page struct {
	Nodes       []Node       `json:"nodes"`
	Connections []Connection `json:"connections,omitempty"`
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
